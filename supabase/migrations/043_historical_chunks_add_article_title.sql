-- Migration 043 — historical_chunks : ajout article_title + fix archive_reason
-- Contexte : rechunk-aiact (2026-07-03) a échoué avec "Could not find the 'article_title' column"
-- car historical_chunks n'avait pas cette colonne alors que legal_chunks et staging_chunks l'ont.
-- De plus, la valeur archive_reason "rechunk-aiact-parent-child-2026-07" n'était pas autorisée
-- par le CHECK constraint (valeurs autorisées : 'updated' | 'deleted' | 'superseded' | 'rechunking_paragraph_level').

-- 1. Ajouter la colonne article_title (aligne historical_chunks avec legal_chunks et staging_chunks)
ALTER TABLE historical_chunks
  ADD COLUMN IF NOT EXISTS article_title text;

-- 2. Ajouter granularity (également présente dans legal_chunks depuis migration 040, absente de historical_chunks)
ALTER TABLE historical_chunks
  ADD COLUMN IF NOT EXISTS granularity text;

-- 3. Ajouter parent_chunk_id (pour les chunks parent-child, également présent dans legal_chunks)
ALTER TABLE historical_chunks
  ADD COLUMN IF NOT EXISTS parent_chunk_id uuid;

-- 4. Étendre le CHECK constraint archive_reason pour autoriser les rechunks parent-child
ALTER TABLE historical_chunks
  DROP CONSTRAINT IF EXISTS historical_chunks_archive_reason_check;

ALTER TABLE historical_chunks
  ADD CONSTRAINT historical_chunks_archive_reason_check
  CHECK (archive_reason IN (
    'updated',
    'deleted',
    'superseded',
    'rechunking_paragraph_level',
    'rechunking_parent_child'
  ));

-- ==== ROLLBACK ====
-- ALTER TABLE historical_chunks DROP COLUMN IF EXISTS article_title;
-- ALTER TABLE historical_chunks DROP COLUMN IF EXISTS granularity;
-- ALTER TABLE historical_chunks DROP COLUMN IF EXISTS parent_chunk_id;
-- ALTER TABLE historical_chunks DROP CONSTRAINT IF EXISTS historical_chunks_archive_reason_check;
-- ALTER TABLE historical_chunks ADD CONSTRAINT historical_chunks_archive_reason_check
--   CHECK (archive_reason IN ('updated', 'deleted', 'superseded', 'rechunking_paragraph_level'));
-- ==================
