-- Attribution automatique des 400 crédits gratuits à l'inscription
-- (aligné sur PLAN_CONFIG.free.monthlyCredits dans lib/pricing.ts)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_credits integer := 400;
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_credits (user_id, balance, plan, subscription_status, last_reset_at)
  VALUES (NEW.id, v_free_credits, 'free', 'inactive', now())
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO credit_transactions (user_id, amount, type, description, metadata)
  SELECT NEW.id, v_free_credits, 'subscription_grant', 'Crédits gratuits initiaux', '{"plan":"free"}'::jsonb
  WHERE EXISTS (SELECT 1 FROM user_credits WHERE user_id = NEW.id AND balance = v_free_credits)
    AND NOT EXISTS (
      SELECT 1 FROM credit_transactions
      WHERE user_id = NEW.id AND type = 'subscription_grant' AND description = 'Crédits gratuits initiaux'
    );

  RETURN NEW;
END;
$$;

-- Comptes existants sans ligne user_credits
INSERT INTO user_credits (user_id, balance, plan, subscription_status, last_reset_at)
SELECT u.id, 400, 'free', 'inactive', now()
FROM auth.users u
LEFT JOIN user_credits uc ON uc.user_id = u.id
WHERE uc.user_id IS NULL;
