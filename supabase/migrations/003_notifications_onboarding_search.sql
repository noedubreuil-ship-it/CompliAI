-- ─── IN-APP NOTIFICATIONS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error', 'alert')),
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications(user_id, is_read, created_at DESC);

-- ─── ONBOARDING ────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size text;

-- ─── COMPLIANCE SCORE HISTORY ─────────────────────────────────────────────────
-- No new table needed — we compute history from existing audits table.
-- audits already has: id, user_id, compliance_score, created_at.

-- ─── DOCUMENT VERSIONS ────────────────────────────────────────────────────────
ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES generated_documents(id) ON DELETE SET NULL;
