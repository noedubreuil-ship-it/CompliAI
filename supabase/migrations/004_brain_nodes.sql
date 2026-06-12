-- ─── Cerveau numérique — brain_nodes ─────────────────────────────────────────
-- Workflowy-style hierarchical knowledge base for legal/compliance notes

CREATE TABLE IF NOT EXISTS brain_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES brain_nodes(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  type text DEFAULT 'note' CHECK (type IN ('note', 'task', 'reference', 'insight', 'question')),
  tags text[] DEFAULT '{}',
  is_collapsed boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  position integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE brain_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own brain nodes"
  ON brain_nodes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS brain_nodes_user_id_idx ON brain_nodes(user_id);
CREATE INDEX IF NOT EXISTS brain_nodes_parent_id_idx ON brain_nodes(parent_id);
CREATE INDEX IF NOT EXISTS brain_nodes_user_parent_idx ON brain_nodes(user_id, parent_id, position);
CREATE INDEX IF NOT EXISTS brain_nodes_content_fts_idx ON brain_nodes USING gin(to_tsvector('french', content));

CREATE OR REPLACE FUNCTION update_brain_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brain_nodes_updated_at
  BEFORE UPDATE ON brain_nodes
  FOR EACH ROW EXECUTE FUNCTION update_brain_nodes_updated_at();
