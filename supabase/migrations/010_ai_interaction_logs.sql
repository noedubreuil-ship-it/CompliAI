-- ─── Migration 010 — Journal des interactions IA ─────────────────────────────
--
-- Objectif : tracer chaque appel Claude effectué côté serveur pour pouvoir
-- :
--   - mesurer la latence et le coût par outil (consultant, scanner, …),
--   - détecter des warnings (numéros d'article suspects, prompt
--     injection détectée, hors-champ),
--   - collecter du feedback utilisateur (👍 / 👎) lié à une interaction.
--
-- Conformité : on ne stocke JAMAIS le texte brut de la question
-- utilisateur. Seul un hash SHA-256 est conservé (Règlement (UE) 2016/679,
-- article 5, paragraphe 1, sous-paragraphe c — minimisation).

CREATE TABLE IF NOT EXISTS ai_interaction_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tool            text NOT NULL,
  input_hash      text NOT NULL,
  output_length   integer NOT NULL DEFAULT 0,
  latency_ms      integer NOT NULL DEFAULT 0,
  temperature     numeric(4,3) NOT NULL DEFAULT 0.1,
  model           text NOT NULL,
  warnings        text[],
  feedback        text CHECK (feedback IS NULL OR feedback IN ('positive', 'negative')),
  feedback_note   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_interaction_logs_user_id_idx
  ON ai_interaction_logs (user_id);

CREATE INDEX IF NOT EXISTS ai_interaction_logs_tool_idx
  ON ai_interaction_logs (tool);

CREATE INDEX IF NOT EXISTS ai_interaction_logs_created_at_idx
  ON ai_interaction_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS ai_interaction_logs_warnings_gin_idx
  ON ai_interaction_logs USING GIN (warnings);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
-- L'utilisateur peut lire **ses propres** logs (utile pour un futur
-- dashboard "mon historique") mais ne peut rien insérer ni modifier :
-- l'écriture se fait exclusivement via le service role côté serveur.

ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_interaction_logs_select_own" ON ai_interaction_logs;
CREATE POLICY "ai_interaction_logs_select_own"
  ON ai_interaction_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Pas de policy INSERT/UPDATE/DELETE : seul le service role (bypass RLS)
-- peut écrire dans cette table.

-- Mise à jour du feedback : on autorise l'utilisateur à mettre à jour
-- uniquement le champ `feedback` (et `feedback_note`) de ses propres
-- interactions. Une contrainte de niveau ligne empêche l'altération des
-- autres colonnes via une policy `WITH CHECK` stricte.
DROP POLICY IF EXISTS "ai_interaction_logs_update_feedback_own" ON ai_interaction_logs;
CREATE POLICY "ai_interaction_logs_update_feedback_own"
  ON ai_interaction_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
