-- ─── Cerveau Numérique — Schema complet (Obsidian-like) ───────────────────────
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── brain_notes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brain_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Contenu
  title        text NOT NULL DEFAULT 'Note sans titre',
  content      text DEFAULT '',

  -- Métadonnées
  path         text NOT NULL DEFAULT '/',
  aliases      text[] DEFAULT '{}',
  tags         text[] DEFAULT '{}',
  status       text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'template')),
  properties   jsonb DEFAULT '{}',

  -- Embedding (pgvector 1536 dims = text-embedding-3-small)
  embedding    vector(1536),

  -- Stats
  word_count   integer DEFAULT 0,
  char_count   integer DEFAULT 0,

  -- Dates
  pinned_at    timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ─── brain_note_links ──────────────────────────────────────────────────────────
-- Liens bidirectionnels [[WikiLink]]
CREATE TABLE IF NOT EXISTS brain_note_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_id   uuid REFERENCES brain_notes(id) ON DELETE CASCADE NOT NULL,
  target_id   uuid REFERENCES brain_notes(id) ON DELETE CASCADE NOT NULL,
  link_text   text,
  context     text,
  is_embed    boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(source_id, target_id, link_text)
);

-- ─── brain_folders ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brain_folders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id  uuid REFERENCES brain_folders(id) ON DELETE CASCADE,
  name       text NOT NULL,
  path       text NOT NULL,
  icon       text DEFAULT '📁',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ─── brain_ai_chats ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brain_ai_chats (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title      text,
  messages   jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Index ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS brain_notes_user_id_idx    ON brain_notes(user_id);
CREATE INDEX IF NOT EXISTS brain_notes_tags_idx       ON brain_notes USING gin(tags);
CREATE INDEX IF NOT EXISTS brain_notes_fts_idx        ON brain_notes USING gin(
  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(content, ''))
);
CREATE INDEX IF NOT EXISTS brain_note_links_src_idx   ON brain_note_links(source_id);
CREATE INDEX IF NOT EXISTS brain_note_links_tgt_idx   ON brain_note_links(target_id);
CREATE INDEX IF NOT EXISTS brain_note_links_user_idx  ON brain_note_links(user_id);

-- Index ivfflat seulement si la table a des données (sinon l'index est vide au départ)
-- CREATE INDEX IF NOT EXISTS brain_notes_embed_idx ON brain_notes
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- → À activer manuellement après avoir ingéré >= 100 notes

-- ─── Fonction : recherche sémantique ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_brain_notes_semantic(
  query_embedding vector(1536),
  user_uuid       uuid,
  match_count     int DEFAULT 10,
  match_threshold float DEFAULT 0.75
)
RETURNS TABLE (
  id         uuid,
  title      text,
  content    text,
  path       text,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT n.id, n.title, n.content, n.path,
         1 - (n.embedding <=> query_embedding) AS similarity
  FROM brain_notes n
  WHERE n.user_id = user_uuid
    AND n.embedding IS NOT NULL
    AND 1 - (n.embedding <=> query_embedding) > match_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─── Trigger updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_brain_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS brain_notes_updated_at ON brain_notes;
CREATE TRIGGER brain_notes_updated_at
  BEFORE UPDATE ON brain_notes
  FOR EACH ROW EXECUTE FUNCTION update_brain_notes_updated_at();

DROP TRIGGER IF EXISTS brain_ai_chats_updated_at ON brain_ai_chats;
CREATE TRIGGER brain_ai_chats_updated_at
  BEFORE UPDATE ON brain_ai_chats
  FOR EACH ROW EXECUTE FUNCTION update_brain_notes_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE brain_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_folders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_ai_chats   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own brain_notes"
  ON brain_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own brain_note_links"
  ON brain_note_links FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own brain_folders"
  ON brain_folders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own brain_ai_chats"
  ON brain_ai_chats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
