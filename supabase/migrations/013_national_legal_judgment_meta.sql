-- Métadonnées jurisprudentielles (facultatif) pour filtres futurs et citations.

ALTER TABLE national_legal_texts
  ADD COLUMN IF NOT EXISTS ecli text,
  ADD COLUMN IF NOT EXISTS court text,
  ADD COLUMN IF NOT EXISTS judgment_date date;

CREATE INDEX IF NOT EXISTS national_legal_texts_domain_country_idx
  ON national_legal_texts (domain, country_code);

COMMENT ON COLUMN national_legal_texts.ecli IS 'Identifiant ECLI européen ou équivalent tribunal national si disponible.';
COMMENT ON COLUMN national_legal_texts.court IS 'Juridiction (ex. CJUE, TJUE, tribunal national).';
COMMENT ON COLUMN national_legal_texts.judgment_date IS 'Date de décision officielle lorsque connue avec certitude.';

-- 012 (et éventuellement 011) ont une signature / un RETURNS TABLE différents :
-- CREATE OR REPLACE ne peut pas changer le type de retour → DROP explicite.
DROP FUNCTION IF EXISTS public.search_national_legal_texts(vector, text[], double precision, integer);
DROP FUNCTION IF EXISTS public.search_national_legal_texts(vector, text[], double precision, integer, text[]);

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
  ecli text,
  court text,
  judgment_date date,
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
    n.ecli,
    n.court,
    n.judgment_date,
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
