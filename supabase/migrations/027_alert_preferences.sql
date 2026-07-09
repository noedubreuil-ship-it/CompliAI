-- ─── Migration 027 — Table alert_preferences ────────────────────────────────
--
-- Objectif (H07) : persister les préférences d'alertes email réglementaires
-- par utilisateur. Remplace le système fictif (état purement client-side,
-- aucune persistance) identifié lors de l'audit.
--
-- Les préférences sont lues par le cron job /api/cron/send-alerts pour
-- envoyer les digests quotidiens ou hebdomadaires.

CREATE TABLE IF NOT EXISTS alert_preferences (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL,
  regulations    text[] NOT NULL DEFAULT '{}',
  frequency      text NOT NULL DEFAULT 'weekly'
                   CHECK (frequency IN ('daily', 'weekly', 'never')),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  last_sent_at   timestamptz
);

COMMENT ON TABLE alert_preferences IS
  'Préférences d''alertes email réglementaires par utilisateur (H07 audit v2).';

CREATE INDEX IF NOT EXISTS alert_preferences_frequency_idx
  ON alert_preferences (frequency)
  WHERE frequency <> 'never';

-- RLS : chaque utilisateur lit et modifie uniquement ses propres préférences
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_preferences_select_own" ON alert_preferences;
CREATE POLICY "alert_preferences_select_own"
  ON alert_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alert_preferences_upsert_own" ON alert_preferences;
CREATE POLICY "alert_preferences_upsert_own"
  ON alert_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
