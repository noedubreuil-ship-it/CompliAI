-- Migration 040 — Granularité parent-child sur legal_chunks (P2.5)
-- Permet de distinguer chunks article entier vs paragraphe vs point lettré.

ALTER TABLE legal_chunks
  ADD COLUMN IF NOT EXISTS granularity text NOT NULL DEFAULT 'paragraph'
    CHECK (granularity IN ('article', 'paragraph', 'point'));

COMMENT ON COLUMN legal_chunks.granularity IS
  'Niveau de découpage : article (texte intégral), paragraph (§), point (a/b/c).';

-- Rétro-annotation du corpus RGPD paragraphaire existant (P2)
UPDATE legal_chunks
SET granularity = 'point'
WHERE regulation = 'RGPD (UE 2016/679)'
  AND point_letter IS NOT NULL;

UPDATE legal_chunks
SET granularity = 'paragraph'
WHERE regulation = 'RGPD (UE 2016/679)'
  AND point_letter IS NULL;

-- Index pour filtrage / stats par granularité
CREATE INDEX IF NOT EXISTS idx_legal_chunks_granularity
  ON legal_chunks(granularity);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_regulation_granularity
  ON legal_chunks(regulation, granularity);

-- ==== ROLLBACK ====
-- DROP INDEX IF EXISTS idx_legal_chunks_regulation_granularity;
-- DROP INDEX IF EXISTS idx_legal_chunks_granularity;
-- ALTER TABLE legal_chunks DROP COLUMN IF EXISTS granularity;
-- ==================
