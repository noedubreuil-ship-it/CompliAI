-- M5 — Recherche sémantique sur les documents générés (DPIA, RoPA, scans…)

ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Index vector optionnel après backfill (évite erreur ivfflat sur table vide) :
-- CREATE INDEX ... ivfflat (embedding vector_cosine_ops) ...

DROP FUNCTION IF EXISTS public.search_user_documents(vector, uuid, double precision, integer);

CREATE OR REPLACE FUNCTION search_user_documents(
  query_embedding vector(1536),
  p_user_id uuid,
  match_threshold float DEFAULT 0.55,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  doc_type text,
  title text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.doc_type,
    d.title,
    (1 - (d.embedding <=> query_embedding))::float AS similarity
  FROM generated_documents d
  WHERE d.user_id = p_user_id
    AND d.embedding IS NOT NULL
    AND (1 - (d.embedding <=> query_embedding)) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION search_user_documents(vector, uuid, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_user_documents(vector, uuid, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION search_user_documents(vector, uuid, double precision, integer) TO service_role;
