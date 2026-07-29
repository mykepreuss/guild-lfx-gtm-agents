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
  CHECK (
    approval_type <> 'context_publish'
    OR exact_approval_text = 'publish approved context to workspace context'
  ),
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
  completion_state text NOT NULL
    CHECK (completion_state IN ('pending', 'completed', 'blocked', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, handoff_id)
);

CREATE TABLE IF NOT EXISTS marketing_os_workflow_runs (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  run_id uuid NOT NULL DEFAULT gen_random_uuid(),
  revision integer NOT NULL CHECK (revision > 0),
  route text NOT NULL,
  specialist text NOT NULL,
  context_revision text,
  package_name text NOT NULL,
  package_version text NOT NULL,
  input_envelope jsonb NOT NULL,
  status text NOT NULL CHECK (
    status IN (
      'running', 'needs_input', 'ready_for_review', 'approved',
      'blocked', 'failed'
    )
  ),
  artifact_id uuid,
  artifact_revision integer,
  handoff_id uuid,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_action text,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, run_id),
  CHECK (
    (artifact_id IS NULL AND artifact_revision IS NULL)
    OR (artifact_id IS NOT NULL AND artifact_revision IS NOT NULL)
  ),
  CHECK (
    status NOT IN ('ready_for_review', 'approved')
    OR artifact_id IS NOT NULL
  ),
  CHECK (status <> 'failed' OR error_summary IS NOT NULL),
  FOREIGN KEY (
    organization_id, workspace_id, artifact_id, artifact_revision
  ) REFERENCES marketing_os_artifacts (
    organization_id, workspace_id, artifact_id, revision
  ),
  FOREIGN KEY (
    organization_id, workspace_id, handoff_id
  ) REFERENCES marketing_os_handoffs (
    organization_id, workspace_id, handoff_id
  )
);

CREATE TABLE IF NOT EXISTS marketing_os_workflow_attempts (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  run_id uuid NOT NULL,
  attempt_number integer NOT NULL CHECK (attempt_number IN (1, 2)),
  attempt_kind text NOT NULL CHECK (
    attempt_kind IN ('initial', 'format_repair')
  ),
  package_name text NOT NULL,
  package_version text NOT NULL,
  context_revision text,
  input_envelope jsonb NOT NULL,
  output_body text,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL CHECK (
    status IN (
      'succeeded', 'format_invalid', 'safety_failed', 'tool_failed'
    )
  ),
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (
    organization_id, workspace_id, run_id, attempt_number
  ),
  CHECK (
    (attempt_kind = 'initial' AND attempt_number = 1)
    OR (attempt_kind = 'format_repair' AND attempt_number = 2)
  ),
  CHECK (status <> 'succeeded' OR output_body IS NOT NULL),
  CHECK (
    status <> 'tool_failed'
    OR (error_code IS NOT NULL AND error_message IS NOT NULL)
  ),
  FOREIGN KEY (
    organization_id, workspace_id, run_id
  ) REFERENCES marketing_os_workflow_runs (
    organization_id, workspace_id, run_id
  )
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

CREATE TABLE IF NOT EXISTS marketing_os_rate_limits (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  subject text NOT NULL,
  bucket_start timestamptz NOT NULL,
  window_seconds integer NOT NULL CHECK (
    window_seconds > 0 AND window_seconds <= 86400
  ),
  requests integer NOT NULL CHECK (requests > 0),
  PRIMARY KEY (
    organization_id, workspace_id, subject, bucket_start, window_seconds
  ),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES marketing_os_tenants (organization_id, workspace_id)
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

CREATE TABLE IF NOT EXISTS marketing_os_deletion_receipts (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  deletion_receipt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_hash text NOT NULL,
  record_counts jsonb NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, workspace_id, deletion_receipt_id)
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
    'marketing_os_workflow_runs',
    'marketing_os_workflow_attempts',
    'marketing_os_idempotency',
    'marketing_os_rate_limits',
    'marketing_os_audit',
    'marketing_os_deletion_receipts'
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

CREATE OR REPLACE FUNCTION marketing_os_require_artifact_approval()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'approved' AND NOT EXISTS (
    SELECT 1
      FROM marketing_os_approvals
     WHERE organization_id = NEW.organization_id
       AND workspace_id = NEW.workspace_id
       AND artifact_id = NEW.artifact_id
       AND artifact_revision = NEW.revision
       AND approval_type = 'artifact'
  ) THEN
    RAISE EXCEPTION 'approved artifact requires an approval record';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_os_artifact_approval_required
  ON marketing_os_artifacts;
CREATE TRIGGER marketing_os_artifact_approval_required
BEFORE INSERT OR UPDATE OF status ON marketing_os_artifacts
FOR EACH ROW EXECUTE FUNCTION marketing_os_require_artifact_approval();

CREATE OR REPLACE FUNCTION marketing_os_validate_workflow_run_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.revision <> 1 OR NEW.status <> 'running' THEN
    RAISE EXCEPTION 'workflow runs must be created at revision 1 in running status';
  END IF;
  IF (
    NEW.artifact_id IS NOT NULL
    OR NEW.artifact_revision IS NOT NULL
    OR NEW.handoff_id IS NOT NULL
    OR NEW.error_summary IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'new workflow runs cannot contain outcome references';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_os_workflow_run_insert_valid
  ON marketing_os_workflow_runs;
CREATE TRIGGER marketing_os_workflow_run_insert_valid
BEFORE INSERT ON marketing_os_workflow_runs
FOR EACH ROW EXECUTE FUNCTION marketing_os_validate_workflow_run_insert();

CREATE OR REPLACE FUNCTION marketing_os_reject_workflow_attempt_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'marketing_os_workflow_attempts are immutable';
END;
$$;

DROP TRIGGER IF EXISTS marketing_os_workflow_attempt_immutable
  ON marketing_os_workflow_attempts;
CREATE TRIGGER marketing_os_workflow_attempt_immutable
BEFORE UPDATE ON marketing_os_workflow_attempts
FOR EACH ROW EXECUTE FUNCTION marketing_os_reject_workflow_attempt_update();

CREATE OR REPLACE FUNCTION marketing_os_validate_workflow_attempt()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  bound_package_name text;
  bound_package_version text;
  bound_context_revision text;
  bound_status text;
BEGIN
  SELECT package_name, package_version, context_revision, status
    INTO
      bound_package_name,
      bound_package_version,
      bound_context_revision,
      bound_status
    FROM marketing_os_workflow_runs
   WHERE organization_id = NEW.organization_id
     AND workspace_id = NEW.workspace_id
     AND run_id = NEW.run_id;

  IF bound_status IS DISTINCT FROM 'running' THEN
    RAISE EXCEPTION 'workflow attempts require a running workflow run';
  END IF;

  IF bound_package_name IS NOT NULL AND (
    NEW.package_name IS DISTINCT FROM bound_package_name
    OR NEW.package_version IS DISTINCT FROM bound_package_version
    OR NEW.context_revision IS DISTINCT FROM bound_context_revision
  ) THEN
    RAISE EXCEPTION 'workflow attempt binding must match workflow run';
  END IF;

  IF NEW.attempt_kind = 'format_repair' AND NOT EXISTS (
    SELECT 1
      FROM marketing_os_workflow_attempts
     WHERE organization_id = NEW.organization_id
       AND workspace_id = NEW.workspace_id
       AND run_id = NEW.run_id
       AND attempt_number = 1
       AND status = 'format_invalid'
  ) THEN
    RAISE EXCEPTION 'format repair requires a format-invalid initial attempt';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_os_workflow_attempt_valid
  ON marketing_os_workflow_attempts;
CREATE TRIGGER marketing_os_workflow_attempt_valid
BEFORE INSERT ON marketing_os_workflow_attempts
FOR EACH ROW EXECUTE FUNCTION marketing_os_validate_workflow_attempt();

CREATE OR REPLACE FUNCTION marketing_os_validate_workflow_run_update()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  latest_attempt_status text;
  referenced_artifact_status text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NOT (
    (OLD.status = 'running' AND NEW.status IN (
      'needs_input', 'ready_for_review', 'blocked', 'failed'
    ))
    OR (OLD.status = 'needs_input' AND NEW.status IN (
      'running', 'blocked', 'failed'
    ))
    OR (OLD.status = 'ready_for_review' AND NEW.status IN (
      'running', 'approved', 'blocked'
    ))
    OR (OLD.status = 'blocked' AND NEW.status IN ('running', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid workflow run status transition';
  END IF;

  IF NEW.status IN ('ready_for_review', 'approved') THEN
    SELECT status
      INTO latest_attempt_status
      FROM marketing_os_workflow_attempts
     WHERE organization_id = NEW.organization_id
       AND workspace_id = NEW.workspace_id
       AND run_id = NEW.run_id
     ORDER BY attempt_number DESC
     LIMIT 1;
    IF latest_attempt_status IS DISTINCT FROM 'succeeded' THEN
      RAISE EXCEPTION 'review-ready workflow run requires succeeded attempt';
    END IF;
    SELECT status
      INTO referenced_artifact_status
      FROM marketing_os_artifacts
     WHERE organization_id = NEW.organization_id
       AND workspace_id = NEW.workspace_id
       AND artifact_id = NEW.artifact_id
       AND revision = NEW.artifact_revision;
    IF (
      NEW.status = 'ready_for_review'
      AND referenced_artifact_status NOT IN ('ready_for_review', 'approved')
    ) OR (
      NEW.status = 'approved'
      AND referenced_artifact_status IS DISTINCT FROM 'approved'
    ) THEN
      RAISE EXCEPTION 'workflow run artifact status does not match run status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_os_workflow_run_transition_valid
  ON marketing_os_workflow_runs;
CREATE TRIGGER marketing_os_workflow_run_transition_valid
BEFORE UPDATE ON marketing_os_workflow_runs
FOR EACH ROW EXECUTE FUNCTION marketing_os_validate_workflow_run_update();

CREATE INDEX IF NOT EXISTS marketing_os_sources_tenant_updated
  ON marketing_os_sources (organization_id, workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS marketing_os_artifacts_tenant_type_updated
  ON marketing_os_artifacts (organization_id, workspace_id, artifact_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS marketing_os_handoffs_tenant_target
  ON marketing_os_handoffs (organization_id, workspace_id, target_agent, updated_at DESC);
CREATE INDEX IF NOT EXISTS marketing_os_workflow_runs_tenant_updated
  ON marketing_os_workflow_runs (
    organization_id, workspace_id, updated_at DESC
  );
CREATE INDEX IF NOT EXISTS marketing_os_workflow_attempts_run
  ON marketing_os_workflow_attempts (
    organization_id, workspace_id, run_id, attempt_number
  );
CREATE INDEX IF NOT EXISTS marketing_os_rate_limits_expiry
  ON marketing_os_rate_limits (bucket_start, window_seconds);
CREATE INDEX IF NOT EXISTS marketing_os_audit_tenant_created
  ON marketing_os_audit (organization_id, workspace_id, created_at);

COMMIT;
