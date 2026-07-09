-- Migration 042 — RAG Pipeline : table monitoring_log
-- Journal d'exécution des cycles de monitoring.
-- Dépend de : 032_rag_pipeline_monitoring_sources.sql

CREATE TABLE IF NOT EXISTS monitoring_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           uuid REFERENCES monitoring_sources(id) ON DELETE SET NULL,
  executed_at         timestamptz DEFAULT now(),
  duration_ms         int,
  documents_found     int DEFAULT 0,
  documents_new       int DEFAULT 0,
  documents_duplicate int DEFAULT 0,
  retry_count         int DEFAULT 0,
  error_message       text,
  raw_response_size   int,
  metadata            jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_monitoring_log_source_date
  ON monitoring_log(source_id, executed_at DESC);

ALTER TABLE monitoring_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitoring_log_admin_read" ON monitoring_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "monitoring_log_service_insert" ON monitoring_log
  FOR INSERT WITH CHECK (false);

-- La policy INSERT ci-dessus bloque les clients authentifiés classiques.
-- Le pipeline serveur utilise SUPABASE_SERVICE_ROLE_KEY, qui contourne RLS.
GRANT SELECT ON monitoring_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON monitoring_log TO service_role;

-- Aligner le schéma DB avec le worker TypeScript actuel.
-- La migration 032 acceptait `curia_rss`, mais le connecteur effectif est `curia_scraping`.
ALTER TABLE monitoring_sources
  DROP CONSTRAINT IF EXISTS monitoring_sources_source_type_check;

ALTER TABLE monitoring_sources
  ADD CONSTRAINT monitoring_sources_source_type_check CHECK (source_type IN (
    'eurlex_rss',
    'curia_rss',
    'curia_scraping',
    'edpb_scraping',
    'ai_office_scraping',
    'national_authority_scraping',
    'national_authority_rss'
  ));

-- ==== ROLLBACK ====
-- ALTER TABLE monitoring_sources DROP CONSTRAINT IF EXISTS monitoring_sources_source_type_check;
-- ALTER TABLE monitoring_sources ADD CONSTRAINT monitoring_sources_source_type_check CHECK (source_type IN (
--   'eurlex_rss', 'curia_rss', 'edpb_scraping', 'ai_office_scraping',
--   'national_authority_scraping', 'national_authority_rss'
-- ));
-- DROP TABLE IF EXISTS monitoring_log CASCADE;
-- ==================
