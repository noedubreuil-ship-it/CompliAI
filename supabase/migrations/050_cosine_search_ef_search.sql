-- Migration 050 — Augmente hnsw.ef_search dans search_legal_chunks (cosine-only)
-- Problème : la fonction cosine-only search_legal_chunks est utilisée par :
--   1. Le second-pass du golden set runner (matchCount=1000)
--   2. Le pipeline chat principal (app/api/chat/route.ts, threshold=0.55, matchCount=8)
-- Avec ef_search par défaut (≈40), le graphe HNSW ne propage pas assez pour des matchCount élevés.
-- Migration 049 avait fixé ef_search=1000 uniquement dans search_legal_chunks_hybrid.
-- Cette migration étend le même fix à search_legal_chunks.
--
-- STAGING UNIQUEMENT — ne pas appliquer en production sans feu vert explicite.

DROP FUNCTION IF EXISTS search_legal_chunks(vector(1536), float, int);

CREATE OR REPLACE FUNCTION search_legal_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count     int   DEFAULT 6
)
RETURNS TABLE (
  id              uuid,
  regulation      text,
  article_number  text,
  article_title   text,
  chapter         text,
  content         text,
  eurlex_url      text,
  similarity      float
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  -- Augmente ef_search pour cette transaction pour garantir le rappel.
  -- Valeur 1000 : cohérente avec search_legal_chunks_hybrid (migration 049).
  -- Nécessaire pour le second-pass du golden set runner (matchCount=1000)
  -- et pour ne pas pénaliser le recall de la recherche cosine principale.
  PERFORM set_config('hnsw.ef_search', '1000', true);

  RETURN QUERY
  SELECT
    lc.id,
    lc.regulation,
    lc.article_number,
    lc.article_title,
    lc.chapter,
    lc.content,
    lc.eurlex_url,
    1 - (lc.embedding <=> query_embedding) AS similarity
  FROM legal_chunks lc
  WHERE 1 - (lc.embedding <=> query_embedding) > match_threshold
  ORDER BY lc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ==== ROLLBACK ====
-- DROP FUNCTION IF EXISTS search_legal_chunks(vector(1536), float, int);
-- -- Puis recréer depuis migration 001_initial.sql (version LANGUAGE sql sans ef_search).
-- CREATE OR REPLACE FUNCTION search_legal_chunks(
--   query_embedding vector(1536),
--   match_threshold float DEFAULT 0.7,
--   match_count int DEFAULT 6
-- ) RETURNS TABLE (id uuid, regulation text, article_number text, article_title text,
--   chapter text, content text, eurlex_url text, similarity float)
-- LANGUAGE plpgsql AS $$
-- BEGIN
--   RETURN QUERY SELECT lc.id, lc.regulation, lc.article_number, lc.article_title,
--     lc.chapter, lc.content, lc.eurlex_url,
--     1 - (lc.embedding <=> query_embedding) AS similarity
--   FROM legal_chunks lc
--   WHERE 1 - (lc.embedding <=> query_embedding) > match_threshold
--   ORDER BY lc.embedding <=> query_embedding LIMIT match_count;
-- END; $$;
