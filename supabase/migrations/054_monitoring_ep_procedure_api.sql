-- ============================================================================
-- 054 — Source de veille « procédures législatives du Parlement européen »
--
-- Contexte : aucune source existante ne couvre le droit en cours de
-- négociation. Toutes interrogent des actes publiés (EUR-Lex JO/CELLAR) ou des
-- décisions d'autorités. Le vote du 9 juillet 2026 sur la procédure
-- 2025/0429(COD) — prolongation de la dérogation ePrivacy, « Chat Control 1.0 »
-- — n'était donc détectable par aucun connecteur.
--
-- VEILLE UNIQUEMENT. Les documents portent le document_type
-- `legislative_procedure`, absent de SUPPORTED_DOCUMENT_TYPES
-- (lib/rag-ingestion/pipeline.ts) : le pipeline d'ingestion les écarte et rien
-- n'atteint `legal_chunks`. Une proposition en négociation n'est pas du droit
-- applicable et ne doit jamais être citée comme une obligation en vigueur.
-- ============================================================================

-- 1. Autoriser le nouveau source_type (la 042 ne le connaît pas)
ALTER TABLE monitoring_sources
  DROP CONSTRAINT IF EXISTS monitoring_sources_source_type_check;

ALTER TABLE monitoring_sources
  ADD CONSTRAINT monitoring_sources_source_type_check CHECK (source_type IN (
    'eurlex_rss',
    'curia_rss',
    'curia_scraping',
    'edpb_scraping',
    'ai_office_scraping',
    'ep_procedure_api',
    'national_authority_scraping',
    'national_authority_rss'
  ));

-- 2. Enregistrer la source (idempotent)
--    `active = false` : activation soumise au feu vert du propriétaire, après
--    un run staging en dryRun. Voir RAG_AUTOMATION_RUNBOOK.md.
INSERT INTO monitoring_sources
  (name, source_type, url, authority, country, language, check_frequency,
   expected_min_frequency_days, silence_alert_threshold_days, active)
SELECT
  'Parlement européen — procédures législatives',
  'ep_procedure_api',
  'https://data.europarl.europa.eu/api/v2/procedures',
  'Parlement européen',
  'EU',
  'fr',
  'weekly',
  14,
  30,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM monitoring_sources
  WHERE name = 'Parlement européen — procédures législatives'
);


-- ==== ROLLBACK ====
-- DELETE FROM monitoring_sources
--   WHERE name = 'Parlement européen — procédures législatives';
--
-- ALTER TABLE monitoring_sources
--   DROP CONSTRAINT IF EXISTS monitoring_sources_source_type_check;
-- ALTER TABLE monitoring_sources
--   ADD CONSTRAINT monitoring_sources_source_type_check CHECK (source_type IN (
--     'eurlex_rss',
--     'curia_rss',
--     'curia_scraping',
--     'edpb_scraping',
--     'ai_office_scraping',
--     'national_authority_scraping',
--     'national_authority_rss'
--   ));
