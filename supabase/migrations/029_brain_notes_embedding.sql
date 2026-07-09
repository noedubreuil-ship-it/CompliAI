-- Migration 029: ajout d'une colonne embedding sur brain_notes pour la recherche sémantique (H10).

ALTER TABLE brain_notes
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Index HNSW pour les requêtes de similarité cosinus
CREATE INDEX IF NOT EXISTS brain_notes_embedding_idx
  ON brain_notes
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Fonction de recherche sémantique dans les notes d'un utilisateur
CREATE OR REPLACE FUNCTION search_brain_notes(
  p_user_id    uuid,
  p_embedding  vector(1536),
  p_limit      int DEFAULT 6
)
RETURNS TABLE (
  id          uuid,
  title       text,
  content     text,
  path        text,
  tags        text[],
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id, title, content, path, tags,
    1 - (embedding <=> p_embedding) AS similarity
  FROM brain_notes
  WHERE
    user_id = p_user_id
    AND status = 'active'
    AND embedding IS NOT NULL
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;
