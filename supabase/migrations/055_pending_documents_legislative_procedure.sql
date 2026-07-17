-- ============================================================================
-- 055 — pending_documents.document_type : ajout de legislative_procedure
--       (+ cjeu_order et cjeu_referral, manquants depuis la 033)
--
-- La 054 a elargi monitoring_sources.source_type pour accepter
-- `ep_procedure_api`, mais pending_documents porte sa PROPRE contrainte CHECK
-- sur document_type, restee inchangee depuis la 033. Sans cette migration, le
-- connecteur EP detecte ses procedures puis chaque INSERT est rejete par la
-- contrainte : la source echoue a chaque run.
--
-- Au passage, `cjeu_order` et `cjeu_referral` existent dans le type
-- DocumentType (lib/rag-monitoring/types.ts) et le connecteur Curia peut les
-- produire, mais la 033 ne les autorisait pas. Meme classe de bug, corrigee
-- ici pour eviter un echec silencieux sur la source CJUE.
--
-- RAPPEL : `legislative_procedure` est volontairement absent de
-- SUPPORTED_DOCUMENT_TYPES (lib/rag-ingestion/pipeline.ts). Ces documents
-- transitent par pending_documents pour la veille, mais l'ingestion les
-- ecarte : rien n'atteint legal_chunks. Ne pas ajouter ce type a cet ensemble
-- sans porter d'abord un marquage « proposition — non applicable » jusque dans
-- les prompts de generation.
-- ============================================================================

ALTER TABLE pending_documents
  DROP CONSTRAINT IF EXISTS pending_documents_document_type_check;

ALTER TABLE pending_documents
  ADD CONSTRAINT pending_documents_document_type_check CHECK (document_type IN (
    'eu_regulation',
    'eu_directive',
    'eu_decision',
    'cjeu_judgment',
    'cjeu_order',
    'cjeu_referral',
    'edpb_guideline',
    'edpb_recommendation',
    'edpb_binding_decision',
    'ai_office_guidance',
    'national_decision',
    'national_guideline',
    'legislative_procedure',
    'other'
  ));


-- ==== ROLLBACK ====
-- Ne pas appliquer ce rollback si des lignes portent l'un des types ajoutes :
-- la contrainte serait rejetee. Les purger d'abord, par exemple :
--   DELETE FROM pending_documents
--    WHERE document_type IN ('legislative_procedure', 'cjeu_order', 'cjeu_referral');
--
-- ALTER TABLE pending_documents
--   DROP CONSTRAINT IF EXISTS pending_documents_document_type_check;
-- ALTER TABLE pending_documents
--   ADD CONSTRAINT pending_documents_document_type_check CHECK (document_type IN (
--     'eu_regulation', 'eu_directive', 'eu_decision',
--     'cjeu_judgment', 'edpb_guideline', 'edpb_recommendation',
--     'edpb_binding_decision', 'ai_office_guidance',
--     'national_decision', 'national_guideline', 'other'
--   ));
