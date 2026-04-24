-- ─── COMPLIANCE SCORE ────────────────────────────────────────────────────────
ALTER TABLE audits ADD COLUMN IF NOT EXISTS compliance_score integer CHECK (compliance_score >= 0 AND compliance_score <= 100);

-- ─── GENERATED DOCUMENTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generated_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  audit_id uuid REFERENCES audits(id) ON DELETE SET NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('art11_technical', 'fria', 'employee_policy', 'investor_report')),
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  raw_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own documents" ON generated_documents FOR ALL USING (auth.uid() = user_id);

-- ─── CONTRACT ANALYSES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_analyses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  provider_name text,
  analysis jsonb NOT NULL DEFAULT '{}',
  risk_score integer CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contract_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own contract analyses" ON contract_analyses FOR ALL USING (auth.uid() = user_id);

-- ─── AUDIT TRAIL ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_trail (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit trail" ON audit_trail FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert audit trail" ON audit_trail FOR INSERT WITH CHECK (true);

-- ─── PROFILE SETTINGS ─────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_webhook_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sector text;

-- ─── SECTOR BENCHMARKS (anonymised aggregates) ────────────────────────────────
CREATE TABLE IF NOT EXISTS sector_benchmarks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector text NOT NULL,
  avg_score numeric(5,2),
  p25_score numeric(5,2),
  p75_score numeric(5,2),
  sample_count integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sector_benchmarks_sector_idx ON sector_benchmarks(sector);
