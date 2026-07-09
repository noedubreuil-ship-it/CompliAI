-- Migration 037 — RAG Pipeline : colonnes de traçabilité sur legal_chunks
-- Enrichit legal_chunks avec les métadonnées nécessaires pour la promotion
-- des staging_chunks en production et l'identification des mises à jour.
-- Dépend de : 033_rag_pipeline_pending_documents.sql

-- ─── Colonnes de traçabilité pipeline ────────────────────────────────────────

ALTER TABLE legal_chunks
  ADD COLUMN IF NOT EXISTS text_type text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'EU',
  ADD COLUMN IF NOT EXISTS pending_document_id uuid REFERENCES pending_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_method text DEFAULT 'manual'
    CHECK (source_method IN ('manual', 'automated_pipeline'));

COMMENT ON COLUMN legal_chunks.text_type IS
  'Catégorie RAG : reglement_ue | directive_ue | jurisprudence_cjue | lignes_directrices | ...';
COMMENT ON COLUMN legal_chunks.country IS
  'Pays d''origine (EU pour textes supranationaux, FR, DE, BE, etc. pour décisions nationales)';
COMMENT ON COLUMN legal_chunks.pending_document_id IS
  'FK vers pending_documents pour traçabilité du pipeline automatisé. NULL pour ingestions manuelles.';
COMMENT ON COLUMN legal_chunks.source_method IS
  'manual = ingestion par scripts, automated_pipeline = pipeline automatique validé par admin.';

-- ─── Colonnes d'identité granulaire ──────────────────────────────────────────
-- Nécessaires pour le détection des mises à jour (même article, contenu modifié).
-- Permettent de distinguer Art. 9 §1 de Art. 9 §2 dans la même regulation.

ALTER TABLE legal_chunks
  ADD COLUMN IF NOT EXISTS paragraph_number text,
  ADD COLUMN IF NOT EXISTS point_letter     text;

COMMENT ON COLUMN legal_chunks.paragraph_number IS
  'Numéro de paragraphe (ex: "1", "2"). Permet la distinction intra-article.';
COMMENT ON COLUMN legal_chunks.point_letter IS
  'Point lettré (ex: "a", "b"). Permet la distinction intra-paragraphe.';

-- ─── Index de traçabilité ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_legal_chunks_text_type
  ON legal_chunks(text_type);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_country
  ON legal_chunks(country);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_version_date
  ON legal_chunks(version_date);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_pending_document
  ON legal_chunks(pending_document_id)
  WHERE pending_document_id IS NOT NULL;

-- Index composite pour la détection des mises à jour (Phase 4 upsert logic).
-- Un chunk est identifié de façon unique par (regulation, article_number,
-- paragraph_number, point_letter, language). Si le hash change → mise à jour.
CREATE INDEX IF NOT EXISTS idx_legal_chunks_identity
  ON legal_chunks(regulation, article_number, paragraph_number, point_letter, language);

-- ==== ROLLBACK ====
-- ALTER TABLE legal_chunks
--   DROP COLUMN IF EXISTS text_type,
--   DROP COLUMN IF EXISTS country,
--   DROP COLUMN IF EXISTS pending_document_id,
--   DROP COLUMN IF EXISTS source_method,
--   DROP COLUMN IF EXISTS paragraph_number,
--   DROP COLUMN IF EXISTS point_letter;
-- DROP INDEX IF EXISTS idx_legal_chunks_text_type;
-- DROP INDEX IF EXISTS idx_legal_chunks_country;
-- DROP INDEX IF EXISTS idx_legal_chunks_version_date;
-- DROP INDEX IF EXISTS idx_legal_chunks_pending_document;
-- DROP INDEX IF EXISTS idx_legal_chunks_identity;
-- ==================
