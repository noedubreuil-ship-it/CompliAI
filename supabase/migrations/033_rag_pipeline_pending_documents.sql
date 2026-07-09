-- Migration 033 — RAG Pipeline : table pending_documents
-- File d'attente des documents détectés avant parsing et ingestion.
-- Dépend de : 032_rag_pipeline_monitoring_sources.sql

CREATE TABLE IF NOT EXISTS pending_documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id         uuid REFERENCES monitoring_sources(id) ON DELETE SET NULL,

  -- Identifiants externes (déduplication)
  external_id       text,
  celex             text,
  ecli              text,
  source_url        text NOT NULL,

  -- Métadonnées du document
  title             text,
  document_type     text CHECK (document_type IN (
                      'eu_regulation', 'eu_directive', 'eu_decision',
                      'cjeu_judgment', 'edpb_guideline', 'edpb_recommendation',
                      'edpb_binding_decision', 'ai_office_guidance',
                      'national_decision', 'national_guideline', 'other'
                    )),
  language          text DEFAULT 'fr',
  country           text DEFAULT 'EU',
  publication_date  date,
  detected_at       timestamptz DEFAULT now(),

  -- Pipeline status
  status            text DEFAULT 'pending' CHECK (status IN (
                      'pending',
                      'fetching',
                      'parsing',
                      'staged',
                      'approved',
                      'rejected',
                      'error'
                    )),
  error_message     text,
  retry_count       int DEFAULT 0,
  last_attempted_at timestamptz,

  -- Contenu brut
  raw_content_url   text,
  raw_content_text  text,

  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),

  UNIQUE (celex),
  UNIQUE (ecli),
  UNIQUE (source_url)
);

CREATE INDEX IF NOT EXISTS idx_pending_documents_status
  ON pending_documents(status, detected_at);

CREATE INDEX IF NOT EXISTS idx_pending_documents_source
  ON pending_documents(source_id, status);

ALTER TABLE pending_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_documents_admin_only" ON pending_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==== ROLLBACK ====
-- DROP TABLE IF EXISTS pending_documents CASCADE;
-- ==================
