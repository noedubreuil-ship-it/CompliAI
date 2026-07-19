-- ============================================================================
-- 056 — staging_chunks.text_type : ajout de 'decision_ue'
--
-- Le support du document_type `eu_decision` a ete ajoute au pipeline
-- d'ingestion le 2026-07-19, avec le mapping vers text_type `decision_ue`.
-- Mais staging_chunks porte une contrainte CHECK sur text_type, restee
-- inchangee depuis la 034 : les 33 decisions de l'Union en file echouaient
-- toutes, cote applicatif d'abord (validateur) puis cote base.
--
-- Les decisions de l'Union incluent les DECISIONS D'ADEQUATION (RGPD art. 45),
-- qui autorisent les transferts de donnees hors UE. Contenu de premier plan
-- pour un produit de conformite.
--
-- Migration additive : elargit un CHECK, ne retire aucune valeur, ne touche
-- aucune donnee existante.
-- ============================================================================

ALTER TABLE staging_chunks
  DROP CONSTRAINT IF EXISTS staging_chunks_text_type_check;

ALTER TABLE staging_chunks
  ADD CONSTRAINT staging_chunks_text_type_check CHECK (text_type IN (
    'reglement_ue',
    'directive_ue',
    'decision_ue',
    'jurisprudence_cjue',
    'lignes_directrices',
    'recommandation_edpb',
    'decision_edpb_art65',
    'decision_autorite_nationale',
    'traite_fondateur',
    'droits_fondamentaux',
    'code_pratiques',
    'guidance_ai_office'
  ));


-- ==== ROLLBACK ====
-- Ne pas appliquer si des chunks portent deja text_type = 'decision_ue' :
-- la contrainte serait rejetee. Les purger d'abord :
--   DELETE FROM staging_chunks WHERE text_type = 'decision_ue';
--
-- ALTER TABLE staging_chunks
--   DROP CONSTRAINT IF EXISTS staging_chunks_text_type_check;
-- ALTER TABLE staging_chunks
--   ADD CONSTRAINT staging_chunks_text_type_check CHECK (text_type IN (
--     'reglement_ue', 'directive_ue', 'jurisprudence_cjue',
--     'lignes_directrices', 'recommandation_edpb', 'decision_edpb_art65',
--     'decision_autorite_nationale', 'traite_fondateur',
--     'droits_fondamentaux', 'code_pratiques', 'guidance_ai_office'
--   ));
