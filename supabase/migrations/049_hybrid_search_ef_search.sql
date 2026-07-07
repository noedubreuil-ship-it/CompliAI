-- Migration 049 — Augmente hnsw.ef_search dans search_legal_chunks_hybrid
-- Problème : avec ef_construction=64 et un cluster dense de 388 chunks Commission Guidelines,
-- le graphe HNSW ne propage pas jusqu'aux chunks AI Act Art.50 pour certaines queries.
-- Art.50 (cosine 64% pour Q15) n'apparaît qu'à partir de match_count ≥ 1000.
-- Fix : forcer hnsw.ef_search=1000 à l'intérieur de la fonction pour garantir le rappel.
-- Passe de LANGUAGE sql STABLE à LANGUAGE plpgsql pour pouvoir appeler set_config().

DROP FUNCTION IF EXISTS search_legal_chunks_hybrid(
  vector(1536), text, float, int, text
);

CREATE OR REPLACE FUNCTION search_legal_chunks_hybrid(
  query_embedding vector(1536),
  query_text      text,
  match_threshold float   DEFAULT 0.5,
  match_count     int     DEFAULT 8,
  filter_regulation_prefix text DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  regulation      text,
  article_number  text,
  article_title   text,
  content         text,
  source_url      text,
  similarity      float,
  granularity     text
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  -- Augmente ef_search pour cette transaction pour garantir le rappel sur toutes les queries.
  -- Valeur 1000 : couvre les cas difficiles (ex: corpus Commission Guidelines dense).
  -- Cf. migration 049 pour le diagnostic complet.
  PERFORM set_config('hnsw.ef_search', '1000', true);

  RETURN QUERY
  WITH
  vector_results AS (
    SELECT
      lc.id,
      1 - (lc.embedding <=> query_embedding) AS cosine_score
    FROM legal_chunks lc
    WHERE 1 - (lc.embedding <=> query_embedding) >= match_threshold
      AND (
        filter_regulation_prefix IS NULL
        OR lc.regulation LIKE filter_regulation_prefix || '%'
      )
    ORDER BY lc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT
      lc.id,
      ts_rank(lc.tsv, plainto_tsquery('french', query_text)) AS bm25_score
    FROM legal_chunks lc
    WHERE lc.tsv @@ plainto_tsquery('french', query_text)
      AND (
        filter_regulation_prefix IS NULL
        OR lc.regulation LIKE filter_regulation_prefix || '%'
      )
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(v.id, t.id) AS id,
      COALESCE(v.cosine_score, 0.0) * 0.6 + COALESCE(t.bm25_score, 0.0) * 0.4 AS hybrid_score
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
  )
  SELECT
    lc.id,
    lc.regulation,
    lc.article_number,
    lc.article_title,
    lc.content,
    lc.eurlex_url,
    c.hybrid_score AS similarity,
    lc.granularity
  FROM combined c
  JOIN legal_chunks lc ON lc.id = c.id
  ORDER BY c.hybrid_score DESC
  LIMIT match_count;
END;
$$;

-- ==== ROLLBACK ====
-- DROP FUNCTION IF EXISTS search_legal_chunks_hybrid(vector(1536), text, float, int, text);
-- -- Puis recréer depuis migration 041_hybrid_search_regulation_filter.sql
