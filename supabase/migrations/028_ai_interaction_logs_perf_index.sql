-- Migration 028: index performance pour le dashboard admin ai_interaction_logs
-- Évite les seq-scans sur la table lors des requêtes admin filtrées par date.

CREATE INDEX IF NOT EXISTS ai_interaction_logs_created_at_idx
  ON ai_interaction_logs (created_at DESC);

-- Index composite pour les requêtes warnings (filtre OR warnings IS NOT NULL)
CREATE INDEX IF NOT EXISTS ai_interaction_logs_warnings_created_at_idx
  ON ai_interaction_logs (created_at DESC)
  WHERE warnings IS NOT NULL;

-- Index composite pour les requêtes feedback négatif
CREATE INDEX IF NOT EXISTS ai_interaction_logs_feedback_created_at_idx
  ON ai_interaction_logs (feedback, created_at DESC)
  WHERE feedback IS NOT NULL;
