-- Migration 030: ajout tsvector pour recherche BM25 hybride sur legal_chunks (H05).
-- On utilise le tsvector natif PostgreSQL (dictionnaire french) — stable et disponible sur Supabase.

-- Colonne tsvector générée automatiquement
ALTER TABLE legal_chunks
  ADD COLUMN IF NOT EXISTS tsv tsvector
    GENERATED ALWAYS AS (
      to_tsvector('french', coalesce(content, ''))
    ) STORED;

-- Index GIN pour la recherche fulltext
CREATE INDEX IF NOT EXISTS legal_chunks_tsv_idx
  ON legal_chunks USING gin(tsv);

-- Fonction de recherche hybride : cosine similarity + ts_rank BM25
-- score_final = cosine_score × 0.6 + ts_rank × 0.4
CREATE OR REPLACE FUNCTION search_legal_chunks_hybrid(
  query_embedding vector(1536),
  query_text      text,
  match_threshold float   DEFAULT 0.5,
  match_count     int     DEFAULT 8
)
RETURNS TABLE (
  id              uuid,
  regulation      text,
  article_number  text,
  article_title   text,
  content         text,
  source_url      text,
  similarity      float
)
LANGUAGE sql STABLE
AS $$
  WITH
  -- 1. Résultats vectoriels (cosine)
  vector_results AS (
    SELECT
      id,
      1 - (embedding <=> query_embedding) AS cosine_score
    FROM legal_chunks
    WHERE 1 - (embedding <=> query_embedding) >= match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  -- 2. Résultats textuels (BM25 via ts_rank)
  text_results AS (
    SELECT
      id,
      ts_rank(tsv, plainto_tsquery('french', query_text)) AS bm25_score
    FROM legal_chunks
    WHERE tsv @@ plainto_tsquery('french', query_text)
    LIMIT match_count * 2
  ),
  -- 3. Union et score hybride
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
    c.hybrid_score AS similarity
  FROM combined c
  JOIN legal_chunks lc ON lc.id = c.id
  ORDER BY c.hybrid_score DESC
  LIMIT match_count;
$$;
