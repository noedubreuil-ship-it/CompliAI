-- Migration 034 — RAG Pipeline : table staging_chunks
-- Chunks parsés en attente de validation admin avant mise en production.
-- Dépend de : 033_rag_pipeline_pending_documents.sql

CREATE TABLE IF NOT EXISTS staging_chunks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       uuid NOT NULL REFERENCES pending_documents(id) ON DELETE CASCADE,

  -- Identifiants du chunk
  regulation        text NOT NULL,
  article_number    text,
  paragraph_number  text,
  point_letter      text,
  article_title     text,
  chapter           text,

  -- Contenu
  content           text NOT NULL,
  language          text DEFAULT 'fr',
  country           text DEFAULT 'EU',

  -- Classification
  text_type         text CHECK (text_type IN (
                      'reglement_ue', 'directive_ue', 'jurisprudence_cjue',
                      'lignes_directrices', 'recommandation_edpb', 'decision_edpb_art65',
                      'decision_autorite_nationale', 'traite_fondateur',
                      'droits_fondamentaux', 'code_pratiques', 'guidance_ai_office'
                    )),
  source_type       text,

  -- Références
  source_url        text,
  eurlex_url        text,
  publication_date  date,

  -- Embedding (même dimension que legal_chunks)
  embedding         vector(1536),

  -- Validation
  validation_status text DEFAULT 'pending' CHECK (validation_status IN (
                      'pending', 'approved', 'rejected', 'correction_needed'
                    )),
  validated_at      timestamptz,
  validated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason  text,

  -- Hash (même logique que legal_chunks pour le upsert en production)
  chunk_hash        text,

  -- Audit
  parsed_at         timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now(),

  UNIQUE (chunk_hash)
);

CREATE INDEX IF NOT EXISTS idx_staging_chunks_document
  ON staging_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_staging_chunks_validation
  ON staging_chunks(validation_status, parsed_at);

-- HNSW pour cohérence avec l'index de legal_chunks (m=16, ef_construction=64)
CREATE INDEX IF NOT EXISTS idx_staging_chunks_embedding
  ON staging_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE staging_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staging_chunks_admin_only" ON staging_chunks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==== ROLLBACK ====
-- DROP TABLE IF EXISTS staging_chunks CASCADE;
-- ==================
