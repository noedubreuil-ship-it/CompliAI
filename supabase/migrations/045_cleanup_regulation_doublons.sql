-- Migration 045 — Nettoyage doublons regulation (apostrophes typographiques)
-- Diagnostic 2026-07-03 : 5 chunks ont été insérés avec une apostrophe typographique (U+2019 ')
-- au lieu de l'apostrophe ASCII standard (U+0027 ') dans le champ `regulation`.
-- Résultat : 3 regulations apparaissent en double dans le corpus.
-- Correction : mettre à jour le champ `regulation` des 5 chunks vers la valeur canonique.
--
-- Chunks concernés (UUIDs identifiés par diagnostic) :
--   dfc77335-ba3b-40a1-bfe9-3f951cd1faba  Charte Art.20
--   93e7ce0b-80b1-45b0-8f5e-26f225249d7a  TUE Art.58
--   337fbc95-c3af-4dd1-8757-6d0eae4fca7a  TFUE Art.152
--   7383c055-0105-41cb-8d27-645865884084  TFUE Art.80
--   fcafe3a9-2acf-41f2-b9b1-26dbcb460058  TFUE Art.292
--
-- Valeur canonique (apostrophe ASCII U+0027) :
--   Charte : "Charte des droits fondamentaux de l'Union Européenne (2016/C 202/02)"
--   TUE    : "Traité sur l'Union Européenne (TUE)"
--   TFUE   : "Traité sur le fonctionnement de l'Union Européenne (TFUE)"

-- Charte — Art.20
UPDATE legal_chunks
SET regulation = 'Charte des droits fondamentaux de l''Union Européenne (2016/C 202/02)'
WHERE id = 'dfc77335-ba3b-40a1-bfe9-3f951cd1faba';

-- TUE — Art.58
UPDATE legal_chunks
SET regulation = 'Traité sur l''Union Européenne (TUE)'
WHERE id = '93e7ce0b-80b1-45b0-8f5e-26f225249d7a';

-- TFUE — Art.80, Art.152, Art.292
UPDATE legal_chunks
SET regulation = 'Traité sur le fonctionnement de l''Union Européenne (TFUE)'
WHERE id IN (
  '337fbc95-c3af-4dd1-8757-6d0eae4fca7a',
  '7383c055-0105-41cb-8d27-645865884084',
  'fcafe3a9-2acf-41f2-b9b1-26dbcb460058'
);

-- Vérification : après cette migration, il ne doit plus exister de regulation
-- contenant l'apostrophe typographique U+2019 (')
-- SELECT regulation, COUNT(*) FROM legal_chunks
-- WHERE regulation LIKE '%' || chr(8217) || '%'
-- GROUP BY regulation;
-- → doit retourner 0 lignes

-- ==== ROLLBACK ====
-- Les valeurs originales avec apostrophe typographique U+2019 :
-- UPDATE legal_chunks
-- SET regulation = 'Charte des droits fondamentaux de l’Union Européenne (2016/C 202/02)'
-- WHERE id = 'dfc77335-ba3b-40a1-bfe9-3f951cd1faba';
-- UPDATE legal_chunks
-- SET regulation = 'Traité sur l’Union Européenne (TUE)'
-- WHERE id = '93e7ce0b-80b1-45b0-8f5e-26f225249d7a';
-- UPDATE legal_chunks
-- SET regulation = 'Traité sur le fonctionnement de l’Union Européenne (TFUE)'
-- WHERE id IN ('337fbc95-ca3f-4dd1-8757-6d0eae4fca7a','7383c055-0105-41cb-8d27-645865884084','fcafe3a9-2acf-41f2-b9b1-26dbcb460058');
-- ==================
