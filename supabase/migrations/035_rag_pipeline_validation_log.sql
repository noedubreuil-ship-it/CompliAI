-- Migration 035 — RAG Pipeline : table validation_log
-- Trace immuable de toutes les actions de validation admin sur les staging_chunks.
-- Dépend de : 033, 034

CREATE TABLE IF NOT EXISTS validation_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid REFERENCES pending_documents(id) ON DELETE SET NULL,
  chunk_id      uuid REFERENCES staging_chunks(id) ON DELETE SET NULL,
  performed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at  timestamptz DEFAULT now(),
  action        text NOT NULL CHECK (action IN (
                  'approved', 'rejected', 'corrected', 'bulk_approved'
                )),
  reason        text,
  before_hash   text,
  after_hash    text,
  metadata      jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_validation_log_document
  ON validation_log(document_id, performed_at);

CREATE INDEX IF NOT EXISTS idx_validation_log_user
  ON validation_log(performed_by, performed_at);

ALTER TABLE validation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "validation_log_admin_insert" ON validation_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "validation_log_admin_read" ON validation_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==== ROLLBACK ====
-- DROP TABLE IF EXISTS validation_log CASCADE;
-- ==================
