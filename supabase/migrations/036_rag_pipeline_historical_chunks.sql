-- Migration 036 — RAG Pipeline : table historical_chunks
-- Archive des versions précédentes des chunks mis à jour ou remplacés en production.
-- Aucune foreign key vers legal_chunks (original_chunk_id peut devenir orphelin si le chunk est supprimé).

CREATE TABLE IF NOT EXISTS historical_chunks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_chunk_id uuid,
  regulation        text,
  article_number    text,
  content           text,
  embedding         vector(1536),
  chunk_hash        text,
  version_date      date,
  archived_at       timestamptz DEFAULT now(),
  archive_reason    text CHECK (archive_reason IN ('updated', 'deleted', 'superseded')),
  superseded_by     uuid
);

CREATE INDEX IF NOT EXISTS idx_historical_chunks_original
  ON historical_chunks(original_chunk_id);

CREATE INDEX IF NOT EXISTS idx_historical_chunks_regulation
  ON historical_chunks(regulation);

-- Pas de RLS sur historical_chunks : accès service role uniquement (pipeline backend)
-- Les admins accèdent via service role dans les scripts de pipeline.

-- ==== ROLLBACK ====
-- DROP TABLE IF EXISTS historical_chunks CASCADE;
-- ==================
