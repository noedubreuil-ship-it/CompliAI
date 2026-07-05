-- Migration 044 — Nouvelles granularités : annexe + considerant
-- Contexte : Décision utilisateur 2026-07-03 d'ingérer toutes les annexes et tous
-- les considérants de tous les règlements. Nécessite l'extension du CHECK constraint
-- sur legal_chunks.granularity et l'ajout des colonnes granularity + parent_chunk_id
-- dans staging_chunks pour le pipeline staging → production.

-- 1. Étendre le CHECK constraint de legal_chunks.granularity
ALTER TABLE legal_chunks
  DROP CONSTRAINT IF EXISTS legal_chunks_granularity_check;

ALTER TABLE legal_chunks
  ADD CONSTRAINT legal_chunks_granularity_check
  CHECK (granularity IN ('article', 'paragraph', 'point', 'annexe', 'considerant'));

-- 2. Ajouter granularity à staging_chunks (même valeurs autorisées)
ALTER TABLE staging_chunks
  ADD COLUMN IF NOT EXISTS granularity text
    CHECK (granularity IN ('article', 'paragraph', 'point', 'annexe', 'considerant'))
    DEFAULT 'paragraph';

-- 3. Ajouter parent_chunk_id à staging_chunks
--    (UUID du chunk parent dans staging_chunks, pour les structures article > paragraph > point)
ALTER TABLE staging_chunks
  ADD COLUMN IF NOT EXISTS parent_chunk_id uuid;

-- Note : pas de FK sur parent_chunk_id dans staging_chunks — les chunks d'un même document
-- sont insérés en batch et la FK serait difficile à gérer. L'intégrité est assurée par le script
-- de rechunk qui génère les UUIDs parents avant les enfants.

-- ==== ROLLBACK ====
-- ALTER TABLE staging_chunks DROP COLUMN IF EXISTS parent_chunk_id;
-- ALTER TABLE staging_chunks DROP COLUMN IF EXISTS granularity;
-- ALTER TABLE legal_chunks DROP CONSTRAINT IF EXISTS legal_chunks_granularity_check;
-- ALTER TABLE legal_chunks ADD CONSTRAINT legal_chunks_granularity_check
--   CHECK (granularity IN ('article', 'paragraph', 'point'));
-- ==================
