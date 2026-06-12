-- ─── Migration 009 — Organisations équipe + Webhooks sortants ───────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATIONS
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS organizations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  invite_code           text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(5), 'hex'),
  created_by            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                  text NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- Auto-ajouter le créateur comme admin (bypass RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION org_creator_becomes_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_org_creator_admin ON organizations;
CREATE TRIGGER tr_org_creator_admin
  AFTER INSERT ON organizations FOR EACH ROW
  EXECUTE FUNCTION org_creator_becomes_admin();

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_org"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id AND om.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "auth_create_org"
  ON organizations FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "org_admin_update"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id AND om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "org_members_read_membership"
  ON organization_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om2
      WHERE om2.organization_id = organization_members.organization_id AND om2.user_id = auth.uid()
    )
  );

-- Rejoindre une org : uniquement via RPC sécurisée (vérifie le code d'invitation)
CREATE OR REPLACE FUNCTION join_organization(invite text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  oid uuid;
BEGIN
  SELECT id INTO oid FROM organizations WHERE lower(invite_code) = lower(trim(invite));
  IF oid IS NULL THEN RAISE EXCEPTION 'INVALID_INVITE'; END IF;
  IF EXISTS (
    SELECT 1 FROM organization_members WHERE organization_id = oid AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'organization_id', oid);
  END IF;
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (oid, auth.uid(), 'member');
  RETURN jsonb_build_object('ok', true, 'already', false, 'organization_id', oid);
END;
$$;

REVOKE ALL ON FUNCTION join_organization(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_organization(text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- PROJECTS — accès équipe + policies mises à jour
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id) WHERE organization_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can manage own projects" ON projects;

CREATE POLICY "projects_select"
  ON projects FOR SELECT USING (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = projects.organization_id AND om.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "projects_insert"
  ON projects FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      organization_id IS NULL OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = organization_id AND om.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "projects_update_delete"
  ON projects FOR UPDATE USING (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = projects.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'
      )
    )
  );

CREATE POLICY "projects_delete"
  ON projects FOR DELETE USING (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = projects.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'
      )
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- AUDITS — accès équipe
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can manage own audits" ON audits;

CREATE POLICY "audits_select"
  ON audits FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = audits.project_id AND om.user_id = auth.uid()
      AND p.organization_id IS NOT NULL
    )
  );

CREATE POLICY "audits_modify_owner"
  ON audits FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "audits_update"
  ON audits FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "audits_delete"
  ON audits FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOCKING ISSUES — équipe lecture
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can manage own blocking issues" ON blocking_issues;

CREATE POLICY "issues_select"
  ON blocking_issues FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = blocking_issues.project_id AND om.user_id = auth.uid()
      AND p.organization_id IS NOT NULL
    )
  );

CREATE POLICY "issues_insert"
  ON blocking_issues FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "issues_modify"
  ON blocking_issues FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "issues_delete"
  ON blocking_issues FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- WEBHOOKS sortants utilisateur
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url           text NOT NULL,
  signing_secret text,
  events        text[] NOT NULL DEFAULT ARRAY['blocking_issue.created']::text[],
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_webhooks"
  ON webhook_endpoints FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhook_endpoints(user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- Historique explicite des audits (snapshots comparables)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_snapshots (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  audit_id              uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version               integer NOT NULL,
  compliance_score      integer,
  verdict               text,
  ai_act_classification text,
  risk_level            text,
  snapshot              jsonb NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

ALTER TABLE audit_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_select"
  ON audit_snapshots FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = audit_snapshots.project_id AND om.user_id = auth.uid()
      AND p.organization_id IS NOT NULL
    )
  );

CREATE POLICY "snapshots_insert"
  ON audit_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_audit_snapshots_project ON audit_snapshots(project_id, version DESC);
