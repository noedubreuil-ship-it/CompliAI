-- Partage lecture seule des rapports d'audit (I5)
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_audits_share_token
  ON audits(share_token) WHERE share_token IS NOT NULL;
