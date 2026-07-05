-- Migration 047 — Backfill parent_chunk_id dans legal_chunks
-- Résout la Dette B : lors des promotions précédentes, parent_chunk_id était forcé à NULL
-- car les staging UUIDs ne correspondaient pas aux legal_chunks UUIDs.
--
-- Cette requête relie les chunks paragraph et point à leur chunk article parent
-- en se basant sur (regulation, article_number, language) — identité sémantique stable.
--
-- Scope : uniquement les chunks dont granularity IN ('paragraph', 'point')
-- et dont parent_chunk_id IS NULL.
-- Les chunks article, annexe, considerant n'ont pas de parent → on ne les touche pas.

UPDATE legal_chunks child
SET parent_chunk_id = parent.id
FROM legal_chunks parent
WHERE parent.granularity = 'article'
  AND parent.regulation = child.regulation
  AND parent.article_number = child.article_number
  AND parent.language = child.language
  AND child.granularity IN ('paragraph', 'point')
  AND child.parent_chunk_id IS NULL;

-- ── Vérification post-backfill ────────────────────────────────────────────────
-- Exécuter cette requête après le UPDATE pour contrôler le résultat :
--
-- SELECT regulation, granularity,
--        COUNT(*) AS total,
--        COUNT(parent_chunk_id) AS with_parent,
--        COUNT(*) - COUNT(parent_chunk_id) AS missing_parent
-- FROM legal_chunks
-- WHERE granularity IN ('paragraph', 'point')
-- GROUP BY regulation, granularity
-- ORDER BY regulation, granularity;
--
-- Attendu : missing_parent = 0 pour toute regulation ayant des chunks article.
-- Si missing_parent > 0 sur une regulation : soit elle n'a pas de chunks article
-- (corpus non rechunké), soit article_number ne correspond pas (à investiguer).

-- ==== ROLLBACK ====
-- UPDATE legal_chunks
-- SET parent_chunk_id = NULL
-- WHERE granularity IN ('paragraph', 'point')
--   AND parent_chunk_id IS NOT NULL;
