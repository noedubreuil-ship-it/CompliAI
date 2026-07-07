-- Migration 048 — Supprime l'ancien overload search_legal_chunks_hybrid (4 paramètres)
-- Migration 030 avait créé une version sans filter_regulation_prefix.
-- Migration 041 a créé une version avec filter_regulation_prefix DEFAULT NULL.
-- PostgreSQL ne peut pas choisir entre les deux quand on appelle avec 4 params
-- (le 5e étant NULL implicitement) → erreur d'ambiguïté → 0 résultats silencieux.
-- On supprime l'overload 030 pour ne garder que la version 041.

DROP FUNCTION IF EXISTS search_legal_chunks_hybrid(
  vector(1536),
  text,
  float,
  int
);

-- ==== ROLLBACK ====
-- La version 030 peut être re-créée depuis supabase/migrations/030_legal_chunks_bm25_tsvector.sql
-- CREATE OR REPLACE FUNCTION search_legal_chunks_hybrid(
--   query_embedding vector(1536),
--   query_text      text,
--   match_threshold float   DEFAULT 0.5,
--   match_count     int     DEFAULT 8
-- )
-- RETURNS TABLE (id uuid, regulation text, article_number text, article_title text,
--                content text, source_url text, similarity float)
-- LANGUAGE sql STABLE
-- AS $$ /* ... voir migration 030 ... */ $$;
