-- Filtre optionnel par `domain` (ex. rgpd_nat, eu_case_law, national_case_law).

CREATE OR REPLACE FUNCTION search_national_legal_texts(
  query_embedding vector(1536),
  filter_country_codes text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 4,
  filter_domains text[] DEFAULT NULL
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
    AND (
      filter_domains IS NULL
      OR COALESCE(array_length(filter_domains, 1), 0) = 0
      OR n.domain = ANY(filter_domains)
    )
    AND (1 - (n.embedding <=> query_embedding)) > match_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
$$;
