-- Migration 041 — Recherche hybride avec filtre regulation optionnel (P2.5)
-- Permet une seconde passe ciblée sur RGPD / AI Act sans exclure l'EDPB.

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
LANGUAGE sql STABLE
AS $$
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
$$;
