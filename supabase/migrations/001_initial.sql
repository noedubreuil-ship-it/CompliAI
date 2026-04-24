-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  company text,
  stripe_customer_id text UNIQUE,
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'enterprise')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'inactive')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  stripe_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sector text,
  business_model text,
  target_audience text CHECK (target_audience IN ('B2B', 'B2C', 'B2B2C', 'Public sector')),
  data_types text[],
  uses_personal_data boolean NOT NULL DEFAULT false,
  uses_biometric_data boolean NOT NULL DEFAULT false,
  uses_automated_decisions boolean NOT NULL DEFAULT false,
  deployment_country text[] DEFAULT ARRAY['EU'],
  ai_model_type text,
  training_data_source text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);

-- ─── AUDITS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verdict text NOT NULL CHECK (verdict IN ('Conforme', 'Attention requise', 'Risque élevé', 'Non conforme')),
  ai_act_classification text,
  risk_level text CHECK (risk_level IN ('Inacceptable', 'Haut', 'Limité', 'Minimal')),
  roadmap jsonb DEFAULT '[]',
  cost_estimate jsonb DEFAULT '{}',
  lawyer_needed boolean NOT NULL DEFAULT false,
  raw_response text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own audits" ON audits FOR ALL USING (auth.uid() = user_id);

-- ─── BLOCKING ISSUES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocking_issues (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  regulation text,
  article text,
  severity text NOT NULL DEFAULT 'high' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  phase text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blocking_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own blocking issues" ON blocking_issues FOR ALL USING (auth.uid() = user_id);

-- ─── AI SYSTEM REGISTER ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_system_register (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  system_name text NOT NULL,
  version text,
  description text,
  purpose text,
  risk_category text CHECK (risk_category IN ('Inacceptable', 'Haut', 'Limité', 'Minimal')),
  ai_act_classification text,
  provider_name text,
  deployment_date date,
  deployment_countries text[],
  data_types_processed text[],
  human_oversight boolean NOT NULL DEFAULT true,
  technical_documentation_url text,
  conformity_assessment_done boolean NOT NULL DEFAULT false,
  ce_marking boolean NOT NULL DEFAULT false,
  notified_body text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'decommissioned', 'under_review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_system_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own AI register" ON ai_system_register FOR ALL USING (auth.uid() = user_id);

-- ─── LEGAL CHUNKS (RAG) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS legal_chunks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  regulation text NOT NULL,
  article_number text,
  article_title text,
  chapter text,
  content text NOT NULL,
  embedding vector(1536),
  eurlex_url text,
  language text NOT NULL DEFAULT 'fr',
  chunk_hash text UNIQUE,
  version_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS legal_chunks_embedding_idx
  ON legal_chunks USING hnsw (embedding vector_cosine_ops);

-- Public read access for legal chunks (no PII)
ALTER TABLE legal_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read legal chunks" ON legal_chunks FOR SELECT USING (true);
CREATE POLICY "Service role can manage legal chunks" ON legal_chunks FOR ALL USING (auth.role() = 'service_role');

-- ─── CHAT SESSIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT 'Nouvelle conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chat sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);

-- ─── CHAT MESSAGES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  citations jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own messages" ON chat_messages FOR ALL USING (auth.uid() = user_id);

-- ─── REGULATORY ALERTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulatory_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  regulation text NOT NULL,
  affected_articles text[],
  affected_features text[],
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  is_read boolean NOT NULL DEFAULT false,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE regulatory_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own alerts" ON regulatory_alerts FOR ALL USING (auth.uid() = user_id);

-- ─── AUDIT USAGE COUNTERS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  audit_count integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, month_year)
);

ALTER TABLE audit_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON audit_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage usage" ON audit_usage FOR ALL USING (auth.role() = 'service_role');

-- ─── HELPER FUNCTION: pgvector search ────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_legal_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  regulation text,
  article_number text,
  article_title text,
  chapter text,
  content text,
  eurlex_url text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lc.id,
    lc.regulation,
    lc.article_number,
    lc.article_title,
    lc.chapter,
    lc.content,
    lc.eurlex_url,
    1 - (lc.embedding <=> query_embedding) AS similarity
  FROM legal_chunks lc
  WHERE 1 - (lc.embedding <=> query_embedding) > match_threshold
  ORDER BY lc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
