BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS marketing_os_tenants (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (organization_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS marketing_os_sources (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  source_id uuid NOT NULL DEFAULT gen_random_uuid(),
  revision integer NOT NULL CHECK (revision > 0),
  evidence jsonb NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploader text NOT NULL,
  ciphertext bytea,
  initialization_vector bytea,
  authentication_tag bytea,
  wrapped_key_reference text,
  deletion_state text NOT NULL DEFAULT 'retained'
    CHECK (deletion_state IN ('retained', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (organization_id, workspace_id, source_id, revision),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES marketing_os_tenants (organization_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS marketing_os_artifacts (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  artifact_id uuid NOT NULL DEFAULT gen_random_uuid(),
  revision integer NOT NULL CHECK (revision > 0),
  artifact_type text NOT NULL,
  markdown_body text NOT NULL,
  consumed_context_revision text,
  consumed_source_revisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL
    CHECK (status IN ('draft', 'ready_for_review', 'approved', 'superseded', 'blocked')),
  safety jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, artifact_id, revision),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES marketing_os_tenants (organization_id, workspace_id),
  CHECK (safety ->> 'action_mode' = 'draft_only'),
  CHECK ((safety ->> 'external_mutation_requested')::boolean = false)
);

CREATE TABLE IF NOT EXISTS marketing_os_approvals (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  approval_id uuid NOT NULL DEFAULT gen_random_uuid(),
  approval_type text NOT NULL CHECK (approval_type IN ('artifact', 'context_publish')),
  actor text NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  artifact_id uuid NOT NULL,
  artifact_revision integer NOT NULL,
  exact_approval_text text NOT NULL,
  PRIMARY KEY (organization_id, workspace_id, approval_id),
  FOREIGN KEY (organization_id, workspace_id, artifact_id, artifact_revision)
    REFERENCES marketing_os_artifacts (organization_id, workspace_id, artifact_id, revision)
);

CREATE TABLE IF NOT EXISTS marketing_os_context_snapshots (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  published_context_revision bigint NOT NULL CHECK (published_context_revision > 0),
  guild_context_id text,
  compiled_brief text NOT NULL,
  readiness text NOT NULL,
  source_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  freshness jsonb NOT NULL DEFAULT '{}'::jsonb,
  artifact_id uuid NOT NULL,
  artifact_revision integer NOT NULL,
  approval_id uuid NOT NULL,
  rollback_context_id text,
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, published_context_revision),
  FOREIGN KEY (organization_id, workspace_id, artifact_id, artifact_revision)
    REFERENCES marketing_os_artifacts (organization_id, workspace_id, artifact_id, revision),
  FOREIGN KEY (organization_id, workspace_id, approval_id)
    REFERENCES marketing_os_approvals (organization_id, workspace_id, approval_id)
);

CREATE TABLE IF NOT EXISTS marketing_os_workstreams (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  specialist text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  status text NOT NULL CHECK (
    status IN (
      'not_started', 'running', 'needs_input', 'ready_for_review',
      'approved', 'blocked', 'failed'
    )
  ),
  latest_artifact_id uuid,
  latest_artifact_revision integer,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_action text,
  handoff_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, specialist),
  FOREIGN KEY (
    organization_id, workspace_id, latest_artifact_id, latest_artifact_revision
  ) REFERENCES marketing_os_artifacts (
    organization_id, workspace_id, artifact_id, revision
  )
);

CREATE TABLE IF NOT EXISTS marketing_os_handoffs (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  handoff_id uuid NOT NULL DEFAULT gen_random_uuid(),
  revision integer NOT NULL CHECK (revision > 0),
  source_agent text NOT NULL,
  target_agent text NOT NULL,
  artifact_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  context_revision text,
  rationale text NOT NULL,
  completion_state text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, handoff_id)
);

CREATE TABLE IF NOT EXISTS marketing_os_idempotency (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  operation text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, operation, idempotency_key)
);

CREATE TABLE IF NOT EXISTS marketing_os_audit (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  sequence bigint NOT NULL,
  event_type text NOT NULL,
  actor text,
  event_data jsonb NOT NULL,
  previous_hash text,
  entry_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, sequence),
  UNIQUE (organization_id, workspace_id, entry_hash)
);

CREATE OR REPLACE FUNCTION marketing_os_current_organization()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.organization_id', true), '');
$$;

CREATE OR REPLACE FUNCTION marketing_os_current_workspace()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.workspace_id', true), '');
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'marketing_os_tenants',
    'marketing_os_sources',
    'marketing_os_artifacts',
    'marketing_os_approvals',
    'marketing_os_context_snapshots',
    'marketing_os_workstreams',
    'marketing_os_handoffs',
    'marketing_os_idempotency',
    'marketing_os_audit'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (
        organization_id = marketing_os_current_organization()
        AND workspace_id = marketing_os_current_workspace()
      ) WITH CHECK (
        organization_id = marketing_os_current_organization()
        AND workspace_id = marketing_os_current_workspace()
      )',
      table_name
    );
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION marketing_os_reject_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'marketing_os_audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS marketing_os_audit_immutable ON marketing_os_audit;
CREATE TRIGGER marketing_os_audit_immutable
BEFORE UPDATE OR DELETE ON marketing_os_audit
FOR EACH ROW EXECUTE FUNCTION marketing_os_reject_audit_mutation();

CREATE INDEX IF NOT EXISTS marketing_os_sources_tenant_updated
  ON marketing_os_sources (organization_id, workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS marketing_os_artifacts_tenant_type_updated
  ON marketing_os_artifacts (organization_id, workspace_id, artifact_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS marketing_os_handoffs_tenant_target
  ON marketing_os_handoffs (organization_id, workspace_id, target_agent, updated_at DESC);
CREATE INDEX IF NOT EXISTS marketing_os_audit_tenant_created
  ON marketing_os_audit (organization_id, workspace_id, created_at);

COMMIT;
