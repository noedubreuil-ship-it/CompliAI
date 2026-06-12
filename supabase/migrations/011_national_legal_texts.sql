-- ━━━ Corpus juridique national (États membres UE) — RAG consultant ━━━━━━━━━━━
-- Même famille que legal_chunks : pgvector 1536 (text-embedding-3-small).

CREATE TABLE IF NOT EXISTS national_legal_texts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  country_name text NOT NULL,
  domain text NOT NULL,
  text_type text NOT NULL,
  title text NOT NULL,
  reference text,
  date_adopted date,
  date_applicable date,
  content text NOT NULL,
  embedding vector(1536),
  source_url text,
  language text NOT NULL DEFAULT 'fr',
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS national_legal_texts_country_idx
  ON national_legal_texts (country_code);

CREATE INDEX IF NOT EXISTS national_legal_texts_domain_idx
  ON national_legal_texts (country_code, domain);

CREATE INDEX IF NOT EXISTS national_legal_texts_embedding_idx
  ON national_legal_texts
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

ALTER TABLE national_legal_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read national legal texts"
  ON national_legal_texts FOR SELECT USING (true);

CREATE POLICY "Service role can manage national legal texts"
  ON national_legal_texts FOR ALL USING (auth.role() = 'service_role');

-- RPC : recherche cosine ; filtre pays optionnel (codes ISO 3166-1 alpha-2 majuscules).
-- filter_country_codes NULL ou tableau vide ⇒ pas de filtre territorial (comportement secours si besoin côté app).
CREATE OR REPLACE FUNCTION search_national_legal_texts(
  query_embedding vector(1536),
  filter_country_codes text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  country_code text,
  country_name text,
  domain text,
  text_type text,
  title text,
  reference text,
  content text,
  source_url text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    n.id,
    n.country_code::text,
    n.country_name,
    n.domain,
    n.text_type,
    n.title,
    n.reference,
    n.content,
    n.source_url,
    (1 - (n.embedding <=> query_embedding))::float AS similarity
  FROM national_legal_texts n
  WHERE n.is_current = true
    AND n.embedding IS NOT NULL
    AND (
      filter_country_codes IS NULL
      OR COALESCE(array_length(filter_country_codes, 1), 0) = 0
      OR n.country_code = ANY(filter_country_codes)
    )
    AND (1 - (n.embedding <=> query_embedding)) > match_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
$$;
