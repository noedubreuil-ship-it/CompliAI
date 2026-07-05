-- Migration 046 — Ajout parent_chunk_id sur legal_chunks
-- Nécessaire pour la hiérarchie parent-child (article → paragraphe → point).
-- La colonne existe déjà sur staging_chunks (migration 044) ; cette migration
-- l'ajoute sur legal_chunks pour que l'indexer production puisse l'écrire.

ALTER TABLE legal_chunks
  ADD COLUMN IF NOT EXISTS parent_chunk_id uuid REFERENCES legal_chunks(id) ON DELETE SET NULL;

COMMENT ON COLUMN legal_chunks.parent_chunk_id IS
  'Référence vers le chunk parent (article) pour les chunks paragraph et point.';

CREATE INDEX IF NOT EXISTS idx_legal_chunks_parent_chunk_id
  ON legal_chunks(parent_chunk_id)
  WHERE parent_chunk_id IS NOT NULL;

-- ==== ROLLBACK ====
-- DROP INDEX IF EXISTS idx_legal_chunks_parent_chunk_id;
-- ALTER TABLE legal_chunks DROP COLUMN IF EXISTS parent_chunk_id;
