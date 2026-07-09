-- Migration 031: auto-recharge Stripe réelle (H17b).
-- Stockage du payment_method Stripe sauvegardé et du consentement RGPD explicite.

ALTER TABLE user_credits
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS auto_recharge_consent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS auto_recharge_consent_ip  text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auto_recharge_enabled      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_recharge_threshold    integer NOT NULL DEFAULT 500 CHECK (auto_recharge_threshold >= 0),
  ADD COLUMN IF NOT EXISTS auto_recharge_pack_credits integer;
