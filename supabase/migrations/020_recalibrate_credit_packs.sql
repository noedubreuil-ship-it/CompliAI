-- Recalibrage packs crédits (business plan 2026)
-- Prix : 12€ / 45€ / 110€ / 320€

UPDATE credit_pack_catalog SET
  price_cents = 1200,
  is_active = true,
  sort_order = 1,
  badge = null
WHERE credits = 1000 AND name ILIKE 'Pack 1%';

UPDATE credit_pack_catalog SET
  price_cents = 4500,
  is_active = true,
  sort_order = 2,
  badge = 'Populaire'
WHERE credits = 5000 AND name ILIKE 'Pack 5%';

UPDATE credit_pack_catalog SET
  price_cents = 11000,
  is_active = true,
  sort_order = 3,
  badge = 'Meilleure valeur'
WHERE credits = 15000 AND name ILIKE 'Pack 15%';

UPDATE credit_pack_catalog SET
  price_cents = 32000,
  is_active = true,
  sort_order = 4,
  badge = null
WHERE credits = 50000 AND name ILIKE 'Pack 50%';

-- Recharge automatique (préférence utilisateur)
ALTER TABLE user_credits
  ADD COLUMN IF NOT EXISTS auto_recharge_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_recharge_threshold integer NOT NULL DEFAULT 500
    CHECK (auto_recharge_threshold >= 0),
  ADD COLUMN IF NOT EXISTS auto_recharge_pack_id uuid
    REFERENCES credit_pack_catalog(id) ON DELETE SET NULL;
