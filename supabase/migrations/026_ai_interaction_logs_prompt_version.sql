-- ─── Migration 026 — Versionnage du prompt système dans les logs IA ──────────
--
-- Hypothèse H13 (audit v2) : ajouter une colonne `prompt_version` (hash
-- SHA-256 tronqué sur 16 car) permettant de relier chaque interaction IA
-- au prompt système exact qui l'a produite.
-- Cela permet de mesurer l'impact d'un changement de prompt sur la qualité
-- (latence, longueur sortie, taux de warnings).

ALTER TABLE ai_interaction_logs
  ADD COLUMN IF NOT EXISTS prompt_version varchar(16);

COMMENT ON COLUMN ai_interaction_logs.prompt_version IS
  'Premiers 16 caractères du SHA-256 du system prompt utilisé — permet le suivi des évolutions de prompt.';

CREATE INDEX IF NOT EXISTS ai_interaction_logs_prompt_version_idx
  ON ai_interaction_logs (prompt_version)
  WHERE prompt_version IS NOT NULL;
