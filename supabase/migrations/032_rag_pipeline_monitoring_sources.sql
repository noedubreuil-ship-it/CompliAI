-- Migration 032 — RAG Pipeline : table monitoring_sources
-- Registre des sources officielles surveillées par le pipeline d'automatisation RAG.
-- PHASE 1 — nouvelles tables uniquement, aucune modification de l'existant.

CREATE TABLE IF NOT EXISTS monitoring_sources (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text NOT NULL,
  source_type                 text NOT NULL CHECK (source_type IN (
                                'eurlex_rss', 'curia_rss',
                                'edpb_scraping', 'ai_office_scraping',
                                'national_authority_scraping', 'national_authority_rss'
                              )),
  url                         text NOT NULL,
  authority                   text,
  country                     text DEFAULT 'EU',
  language                    text,
  check_frequency             text DEFAULT 'daily' CHECK (check_frequency IN ('hourly', 'daily', 'weekly')),
  last_checked_at             timestamptz,
  last_success_at             timestamptz,
  last_document_detected_at   timestamptz,
  consecutive_failures        int DEFAULT 0,
  consecutive_silence_days    int DEFAULT 0,
  expected_min_frequency_days int,
  silence_alert_threshold_days int,
  page_structure_hash         text,
  active                      boolean DEFAULT true,
  config                      jsonb DEFAULT '{}',
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_sources_active
  ON monitoring_sources(active, check_frequency);

ALTER TABLE monitoring_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitoring_sources_admin_only" ON monitoring_sources
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==== ROLLBACK ====
-- DROP TABLE IF EXISTS monitoring_sources CASCADE;
-- ==================
