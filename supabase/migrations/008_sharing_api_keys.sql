-- ─── Migration 008 — Partage documents + clés API publique ──────────────────

-- Lien de partage pour les documents générés
ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_generated_docs_share_token
  ON generated_documents(share_token) WHERE share_token IS NOT NULL;

-- Clés API publique (I3 — API scaffold)
CREATE TABLE IF NOT EXISTS api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  key_hash     text NOT NULL UNIQUE,  -- SHA-256 de la clé, jamais la clé en clair
  key_prefix   text NOT NULL,         -- 8 premiers chars pour identification visuelle
  scopes       text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  expires_at   timestamptz,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own api keys"
  ON api_keys FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Templates DPIA/RoPA personnalisés (M3)
CREATE TABLE IF NOT EXISTS document_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type    text NOT NULL CHECK (doc_type IN ('dpia', 'ropa', 'fria', 'policy', 'contract', 'checklist')),
  name        text NOT NULL,
  description text,
  template    jsonb NOT NULL DEFAULT '{}',
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own templates"
  ON document_templates FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_doc_templates_user ON document_templates(user_id, doc_type);
