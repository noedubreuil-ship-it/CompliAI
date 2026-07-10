-- Migration 052 : journal d'envoi d'emails (idempotence des crons)
-- Sert de garde anti-doublon pour les emails récurrents (renouvellement,
-- réengagement…), sans polluer la table financière credit_transactions.

CREATE TABLE IF NOT EXISTS email_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  metadata   jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS email_log_user_type_sent_idx
  ON email_log (user_id, email_type, sent_at DESC);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
-- Accès réservé au service role (crons). Aucune policy publique.

-- ==== ROLLBACK ====
-- DROP TABLE IF EXISTS email_log;
