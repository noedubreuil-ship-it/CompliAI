-- ─── Système de crédits IA ────────────────────────────────────────────────────
-- Migration 006 — à appliquer après 001_initial.sql

-- ─── user_credits ─────────────────────────────────────────────────────────────
-- Une ligne par utilisateur, mise à jour atomiquement
CREATE TABLE IF NOT EXISTS user_credits (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance              integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  plan                 text CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  stripe_customer_id   text UNIQUE,
  stripe_subscription_id text UNIQUE,
  subscription_status  text CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'inactive')),
  last_reset_at        timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut lire son propre solde, mais jamais l'écrire directement
CREATE POLICY "Users can read own credits"
  ON user_credits FOR SELECT
  USING (auth.uid() = user_id);

-- Aucune écriture client — tout passe par service_role (webhooks, RPC)

-- ─── usage_logs ───────────────────────────────────────────────────────────────
-- Journal de chaque appel IA (debug + facturation)
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model             text NOT NULL,
  endpoint          text,
  input_tokens      integer NOT NULL DEFAULT 0,
  output_tokens     integer NOT NULL DEFAULT 0,
  credits_consumed  integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage logs"
  ON ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_ai_usage_logs_user_id    ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);

-- ─── credit_transactions ──────────────────────────────────────────────────────
-- Audit complet : chaque mouvement de crédits (positif ou négatif)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      integer NOT NULL, -- positif = ajout, négatif = consommation
  type        text NOT NULL CHECK (type IN (
                'subscription_grant', 'usage', 'top_up', 'refund', 'adjustment'
              )),
  description text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_credit_tx_user_id    ON credit_transactions(user_id);
CREATE INDEX idx_credit_tx_created_at ON credit_transactions(created_at DESC);

-- ─── rate_limits ──────────────────────────────────────────────────────────────
-- Fenêtre glissante 1 minute par utilisateur
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);

ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
-- Aucune lecture client nécessaire — géré côté serveur

-- ─── processed_stripe_events ──────────────────────────────────────────────────
-- Idempotence webhooks Stripe
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id    text PRIMARY KEY,
  event_type  text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
-- Pas de RLS : table interne uniquement accessible via service_role

-- ─── Trigger updated_at on user_credits ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_user_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_user_credits_updated_at();

-- ─── RPC : consume_credits (ATOMIQUE) ─────────────────────────────────────────
-- Appelée côté serveur avec service_role.
-- Vérifie le solde, décrémente, log le tout dans une seule transaction.
-- Lève une exception SQL si solde insuffisant (pas de débit partiel possible).
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id         uuid,
  p_amount          integer,
  p_model           text,
  p_endpoint        text,
  p_input_tokens    integer,
  p_output_tokens   integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER   -- s'exécute avec les droits du propriétaire (service_role)
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  -- Verrouille la ligne pour éviter les race conditions
  SELECT balance INTO v_new_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CREDITS_NOT_FOUND' USING HINT = 'User credits row does not exist';
  END IF;

  IF v_new_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS'
      USING HINT = format('Balance: %s, Required: %s', v_new_balance, p_amount);
  END IF;

  -- Décrémente
  UPDATE user_credits
  SET balance = balance - p_amount
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- Log usage
  INSERT INTO ai_usage_logs (user_id, model, endpoint, input_tokens, output_tokens, credits_consumed)
  VALUES (p_user_id, p_model, p_endpoint, p_input_tokens, p_output_tokens, p_amount);

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, metadata)
  VALUES (
    p_user_id,
    -p_amount,
    'usage',
    format('Appel %s via %s', p_model, p_endpoint),
    jsonb_build_object(
      'model', p_model,
      'input_tokens', p_input_tokens,
      'output_tokens', p_output_tokens
    )
  );

  RETURN jsonb_build_object('new_balance', v_new_balance, 'consumed', p_amount);
END;
$$;

-- ─── RPC : grant_credits (pour les webhooks Stripe) ───────────────────────────
CREATE OR REPLACE FUNCTION grant_credits(
  p_user_id    uuid,
  p_amount     integer,
  p_plan       text,
  p_type       text,       -- 'subscription_grant' | 'top_up' | 'adjustment'
  p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  -- Upsert : crée la ligne si absente (premier paiement)
  INSERT INTO user_credits (user_id, balance, plan, last_reset_at)
  VALUES (p_user_id, p_amount, p_plan, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance       = p_amount,   -- reset (pas d'accumulation)
        plan          = p_plan,
        last_reset_at = now(),
        updated_at    = now()
  RETURNING balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, metadata)
  VALUES (
    p_user_id,
    p_amount,
    p_type,
    p_description,
    jsonb_build_object('plan', p_plan)
  );

  RETURN jsonb_build_object('new_balance', v_new_balance);
END;
$$;
