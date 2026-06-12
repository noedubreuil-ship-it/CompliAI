-- ─── Packs de crédits achetables à la volée ───────────────────────────────────
-- Migration 007

-- Catalogue des packs disponibles (géré par l'admin)
CREATE TABLE IF NOT EXISTS credit_pack_catalog (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,                  -- "Pack 1 000", "Pack 5 000"
  credits      integer NOT NULL CHECK (credits > 0),
  price_cents  integer NOT NULL CHECK (price_cents > 0),
  currency     text NOT NULL DEFAULT 'eur',
  stripe_price_id text UNIQUE,                 -- Stripe one-time Price ID
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   integer DEFAULT 0,
  badge        text,                           -- "Populaire", "Meilleure valeur"
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE credit_pack_catalog ENABLE ROW LEVEL SECURITY;
-- Tout le monde peut lire le catalogue, personne ne peut écrire depuis le client
CREATE POLICY "Anyone can read active packs"
  ON credit_pack_catalog FOR SELECT USING (is_active = true);

-- Historique des achats de packs
CREATE TABLE IF NOT EXISTS credit_pack_purchases (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id               uuid REFERENCES credit_pack_catalog(id),
  credits_granted       integer NOT NULL,
  amount_paid_cents     integer NOT NULL,
  currency              text NOT NULL DEFAULT 'eur',
  stripe_session_id     text UNIQUE,
  stripe_payment_intent text UNIQUE,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'completed', 'refunded')),
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE credit_pack_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own purchases"
  ON credit_pack_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_pack_purchases_user  ON credit_pack_purchases(user_id);
CREATE INDEX idx_pack_purchases_session ON credit_pack_purchases(stripe_session_id);

-- Colonne role sur profiles pour l'admin (si elle n'existe pas)
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── Packs par défaut (à adapter à vos vrais Stripe price IDs) ────────────────
INSERT INTO credit_pack_catalog (name, credits, price_cents, stripe_price_id, sort_order, badge)
VALUES
  ('Pack 1 000',   1000,   900,  null, 1, null),
  ('Pack 5 000',   5000,  3900,  null, 2, 'Populaire'),
  ('Pack 15 000', 15000,  9900,  null, 3, 'Meilleure valeur'),
  ('Pack 50 000', 50000, 29900,  null, 4, null)
ON CONFLICT DO NOTHING;
