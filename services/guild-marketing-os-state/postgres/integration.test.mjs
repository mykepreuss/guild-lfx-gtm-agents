#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  CONTEXT_APPROVAL_PHRASE,
  StateContractError,
  WORKSPACE_DELETE_PHRASE,
  stableHash,
} from "../contracts.mjs";
import { LocalAesEnvelopeEncryption } from "../envelope-encryption.mjs";
import { PostgresMarketingOsStateAdapter } from "../postgres-adapter.mjs";
import { migratePostgresSchema } from "./migrate.mjs";

const { Pool } = pg;
const adminUrl = process.env.POSTGRES_TEST_URL;
if (!adminUrl) {
  console.error("POSTGRES_TEST_URL is required.");
  process.exit(2);
}

const directory = path.dirname(fileURLToPath(import.meta.url));
const schema = fs.readFileSync(path.join(directory, "schema.sql"), "utf8");
const adminPool = new Pool({ connectionString: adminUrl, max: 2 });
const roleName = "marketing_os_app";
const rolePassword = "marketing_os_app_test_password";

try {
  await adminPool.query(schema);
  await adminPool.query(schema);
  await adminPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${roleName}') THEN
        CREATE ROLE ${roleName} LOGIN PASSWORD '${rolePassword}';
      ELSE
        ALTER ROLE ${roleName} WITH LOGIN PASSWORD '${rolePassword}';
      END IF;
    END
    $$;
    GRANT USAGE ON SCHEMA public TO ${roleName};
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON ALL TABLES IN SCHEMA public TO ${roleName};
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${roleName};
  `);
  const migration = await migratePostgresSchema({
    databaseAdminUrl: adminUrl,
    databaseAppRole: roleName,
  });
  assert.equal(migration.status, "applied");
  assert.equal(migration.application_role, roleName);

  const applicationUrl = new URL(adminUrl);
  applicationUrl.username = roleName;
  applicationUrl.password = rolePassword;
  const appPool = new Pool({
    connectionString: applicationUrl.toString(),
    max: 8,
  });
  const adapter = new PostgresMarketingOsStateAdapter({
    pool: appPool,
    encryption: new LocalAesEnvelopeEncryption({
      wrappingKey: crypto
        .createHash("sha256")
        .update("postgres-integration-key")
        .digest(),
    }),
  });

  try {
    const tenantA = {
      organization_id: "org_postgres_a",
      workspace_id: "workspace_postgres_a",
    };
    const tenantB = {
      organization_id: "org_postgres_b",
      workspace_id: "workspace_postgres_b",
    };

    const rateRequest = {
      subject: "user-a",
      max_requests: 2,
      window_seconds: 60,
    };
    assert.equal(
      (await adapter.consumeRateLimit(tenantA, rateRequest)).remaining,
      1,
    );
    assert.equal(
      (await adapter.consumeRateLimit(tenantA, rateRequest)).remaining,
      0,
    );
    await assert.rejects(
      () => adapter.consumeRateLimit(tenantA, rateRequest),
      (error) => stateError(error, "rate_limit_exceeded", 429),
    );
    assert.equal(
      (await adapter.consumeRateLimit(tenantB, rateRequest)).remaining,
      1,
      "rate limits must be tenant scoped",
    );

    const sourceRequest = {
      idempotency_key: "source-a",
      raw_source: "PostgreSQL confidential source",
      uploader: "user-a",
      actor: "user-a",
      evidence: {
        mode: "source_supplied",
        source_coverage: ["source-a.txt"],
        limitations: ["single supplied source"],
      },
      provenance: { filename: "source-a.txt" },
    };
    const [sourceFirst, sourceReplay] = await Promise.all([
      adapter.storeSource(tenantA, sourceRequest),
      adapter.storeSource(tenantA, sourceRequest),
    ]);
    assert.deepEqual(sourceReplay, sourceFirst);
    assert.equal(
      JSON.stringify(sourceFirst).includes("PostgreSQL confidential source"),
      false,
    );
    assert.equal(
      (await adapter.getSource(tenantA, sourceFirst.source_id)).raw_source,
      "PostgreSQL confidential source",
    );
    await assert.rejects(
      () => adapter.getSource(tenantB, sourceFirst.source_id),
      (error) => stateError(error, "source_not_found", 404),
    );
    const sourceRevision2 = await adapter.reviseSource(tenantA, {
      ...sourceRequest,
      idempotency_key: "source-a-revision-2",
      source_id: sourceFirst.source_id,
      expected_revision: 1,
      raw_source: "PostgreSQL confidential source, corrected",
    });
    assert.equal(sourceRevision2.revision, 2);
    assert.equal(
      (await adapter.getSource(tenantA, sourceFirst.source_id)).raw_source,
      "PostgreSQL confidential source, corrected",
    );
    assert.equal(
      (
        await adapter.getSource(
          tenantA,
          sourceFirst.source_id,
          1,
        )
      ).raw_source,
      "PostgreSQL confidential source",
    );

    const artifact = await adapter.storeArtifact(tenantA, {
      idempotency_key: "artifact-a",
      artifact_type: "company_context",
      markdown_body: "# Approved Company Context",
      consumed_source_revisions: [`${sourceFirst.source_id}:1`],
      evidence: [
        {
          mode: "source_supplied",
          source_revision_ids: [`${sourceFirst.source_id}:1`],
        },
      ],
      status: "ready_for_review",
      safety: {
        action_mode: "draft_only",
        external_mutation_requested: false,
      },
      actor: "user-a",
    });
    const approved = await adapter.approveArtifact(tenantA, {
      idempotency_key: "approve-a",
      artifact_id: artifact.artifact_id,
      revision: 1,
      expected_revision: 1,
      actor: "user-a",
      approval_text: "Approved company context revision 1",
    });
    assert.equal(approved.status, "approved");
    assert.equal(approved.approvals.length, 1);

    let publisherCalls = 0;
    const context = await adapter.publishContextSnapshot(
      tenantA,
      {
        idempotency_key: "context-a",
        expected_current_revision: null,
        artifact_id: artifact.artifact_id,
        artifact_revision: 1,
        compiled_brief: "Compact approved context",
        readiness: "ready",
        source_references: [`${sourceFirst.source_id}:1`],
        freshness: { observed_at: "2026-07-28T00:00:00.000Z" },
        actor: "user-a",
        approval_text: CONTEXT_APPROVAL_PHRASE,
      },
      {
        publisher: async ({ tenant, request }) => {
          publisherCalls += 1;
          assert.equal(tenant.workspace_id, tenantA.workspace_id);
          assert.equal(request.idempotency_key, "context-a");
          return {
            guild_context_id: "guild-context-1",
            rollback_context_id: "guild-context-0",
          };
        },
      },
    );
    assert.equal(context.published_context_revision, 1);
    assert.equal(publisherCalls, 1);
    assert.equal(
      (await adapter.readContextSnapshot(tenantA)).guild_context_id,
      "guild-context-1",
    );
    await assert.rejects(
      () =>
        adapter.publishContextSnapshot(
          tenantA,
          {
            idempotency_key: "context-stale",
            expected_current_revision: null,
            artifact_id: artifact.artifact_id,
            artifact_revision: 1,
            compiled_brief: "Stale",
            actor: "user-a",
            approval_text: CONTEXT_APPROVAL_PHRASE,
          },
          {
            publisher: async () => {
              publisherCalls += 1;
              throw new Error("stale requests must not reach the publisher");
            },
          },
        ),
      (error) => stateError(error, "context_revision_conflict", 409),
    );
    assert.equal(publisherCalls, 1);

    const revisionRequests = [
      adapter.reviseArtifact(tenantA, {
        idempotency_key: "revision-a",
        artifact_id: artifact.artifact_id,
        expected_revision: 1,
        artifact_type: "company_context",
        markdown_body: "# Revision A",
        status: "draft",
        safety: {
          action_mode: "draft_only",
          external_mutation_requested: false,
        },
        actor: "user-a",
      }),
      adapter.reviseArtifact(tenantA, {
        idempotency_key: "revision-b",
        artifact_id: artifact.artifact_id,
        expected_revision: 1,
        artifact_type: "company_context",
        markdown_body: "# Revision B",
        status: "draft",
        safety: {
          action_mode: "draft_only",
          external_mutation_requested: false,
        },
        actor: "user-a",
      }),
    ];
    const concurrentRevisions = await Promise.allSettled(revisionRequests);
    assert.equal(
      concurrentRevisions.filter((item) => item.status === "fulfilled").length,
      1,
    );
    const rejectedRevision = concurrentRevisions.find(
      (item) => item.status === "rejected",
    );
    assert.equal(
      stateError(rejectedRevision.reason, "revision_conflict", 409),
      true,
    );
    assert.equal(
      (await adapter.getArtifact(tenantA, artifact.artifact_id, 1)).status,
      "superseded",
    );

    const handoff = await adapter.createHandoff(tenantA, {
      idempotency_key: "handoff-a",
      source_agent: "Company Context Builder",
      target_agent: "Messaging",
      artifact_references: [
        { artifact_id: artifact.artifact_id, revision: 1 },
      ],
      context_revision: "1",
      rationale: "Approved context is ready for messaging.",
      actor: "user-a",
    });
    const workstream = await adapter.updateWorkstream(tenantA, {
      idempotency_key: "workstream-a",
      expected_revision: 0,
      specialist: "Messaging",
      status: "ready_for_review",
      latest_artifact_id: artifact.artifact_id,
      latest_artifact_revision: 1,
      blockers: [],
      next_action: "Review messaging.",
      handoff_id: handoff.handoff_id,
      actor: "user-a",
    });
    assert.equal(workstream.revision, 1);
    assert.equal(
      (await adapter.readWorkstream(tenantA, "Messaging")).handoff_id,
      handoff.handoff_id,
    );

    const runArtifact = await adapter.storeArtifact(tenantA, {
      idempotency_key: "workflow-run-artifact-a",
      artifact_type: "messaging",
      markdown_body: "# Repaired Messaging Artifact",
      consumed_context_revision: "1",
      evidence: [{ mode: "source_supplied" }],
      status: "ready_for_review",
      safety: {
        action_mode: "draft_only",
        external_mutation_requested: false,
      },
      actor: "launcher-a",
    });
    const workflowRun = await adapter.createWorkflowRun(tenantA, {
      idempotency_key: "workflow-run-a",
      route: "messaging",
      specialist: "Messaging",
      context_revision: "1",
      package_name: "publisher~guild-marketing-os-messaging",
      package_version: "1.1.1",
      input_envelope: {
        user_request: "Create answer-ready messaging.",
        context_revision: "1",
      },
      actor: "launcher-a",
    });
    assert.equal(workflowRun.status, "running");

    const malformedAttempt = await adapter.recordWorkflowAttempt(tenantA, {
      idempotency_key: "workflow-run-a-attempt-1",
      run_id: workflowRun.run_id,
      attempt_number: 1,
      attempt_kind: "initial",
      package_name: workflowRun.package_name,
      package_version: workflowRun.package_version,
      context_revision: "1",
      input_envelope: { prompt: "Create answer-ready messaging." },
      output_body: "# Incomplete messaging",
      validation_errors: ["Missing heading: ## Status Payload"],
      status: "format_invalid",
      actor: "launcher-a",
    });
    assert.equal(malformedAttempt.status, "format_invalid");
    const repairedAttempt = await adapter.recordWorkflowAttempt(tenantA, {
      idempotency_key: "workflow-run-a-attempt-2",
      run_id: workflowRun.run_id,
      attempt_number: 2,
      attempt_kind: "format_repair",
      package_name: workflowRun.package_name,
      package_version: workflowRun.package_version,
      context_revision: "1",
      input_envelope: {
        prompt: "FORMAT REPAIR ONLY.",
        prior_attempt: "# Incomplete messaging",
      },
      output_body: "# Complete messaging\n\n## Status Payload\nready",
      validation_errors: [],
      status: "succeeded",
      actor: "launcher-a",
    });
    assert.equal(repairedAttempt.attempt_number, 2);

    const readyWorkflowRun = await adapter.updateWorkflowRun(tenantA, {
      idempotency_key: "workflow-run-a-ready",
      run_id: workflowRun.run_id,
      expected_revision: 1,
      status: "ready_for_review",
      artifact_id: runArtifact.artifact_id,
      artifact_revision: 1,
      handoff_id: handoff.handoff_id,
      blockers: [],
      next_action: "Review the repaired messaging artifact.",
      actor: "launcher-a",
    });
    assert.equal(readyWorkflowRun.revision, 2);
    assert.equal(readyWorkflowRun.attempts.length, 2);
    assert.equal(readyWorkflowRun.package_version, "1.1.1");
    assert.equal(
      (await adapter.getWorkflowRun(tenantA, workflowRun.run_id))
        .attempts[0].output_body,
      "# Incomplete messaging",
    );
    assert.equal(
      (await adapter.listWorkflowRuns(tenantA))[0].run_id,
      workflowRun.run_id,
    );
    await assert.rejects(
      () => adapter.getWorkflowRun(tenantB, workflowRun.run_id),
      (error) => stateError(error, "workflow_run_not_found", 404),
    );
    const approvedRunArtifact = await adapter.approveArtifact(tenantA, {
      idempotency_key: "workflow-run-artifact-approve-a",
      artifact_id: runArtifact.artifact_id,
      revision: 1,
      expected_revision: 1,
      approval_text: "Approve workflow run artifact revision 1",
      actor: "user-a",
    });
    assert.equal(approvedRunArtifact.status, "approved");
    const approvedWorkflowRun = await adapter.updateWorkflowRun(tenantA, {
      idempotency_key: "workflow-run-a-approved",
      run_id: workflowRun.run_id,
      expected_revision: 2,
      status: "approved",
      artifact_id: runArtifact.artifact_id,
      artifact_revision: 1,
      handoff_id: handoff.handoff_id,
      blockers: [],
      next_action: "Continue to campaign planning.",
      actor: "launcher-a",
    });
    assert.equal(approvedWorkflowRun.status, "approved");
    await assert.rejects(
      () => adapter.recordWorkflowAttempt(tenantA, {
        idempotency_key: "workflow-run-a-attempt-after-approval",
        run_id: workflowRun.run_id,
        attempt_number: 1,
        attempt_kind: "initial",
        package_name: workflowRun.package_name,
        package_version: workflowRun.package_version,
        context_revision: "1",
        input_envelope: { prompt: "Unexpected late attempt." },
        output_body: "# Unexpected",
        validation_errors: [],
        status: "succeeded",
        actor: "launcher-a",
      }),
      (error) => stateError(error, "workflow_run_not_running", 409),
    );

    const safetyWorkflowRun = await adapter.createWorkflowRun(tenantA, {
      idempotency_key: "workflow-run-safety-a",
      route: "campaigns_paid_media",
      specialist: "Campaigns And Paid Media",
      context_revision: "1",
      package_name:
        "publisher~guild-marketing-os-campaigns-paid-media",
      package_version: "1.1.1",
      input_envelope: {
        user_request: "Draft a paid media plan.",
      },
      actor: "launcher-a",
    });
    await adapter.recordWorkflowAttempt(tenantA, {
      idempotency_key: "workflow-run-safety-a-attempt-1",
      run_id: safetyWorkflowRun.run_id,
      attempt_number: 1,
      attempt_kind: "initial",
      package_name: safetyWorkflowRun.package_name,
      package_version: safetyWorkflowRun.package_version,
      context_revision: "1",
      input_envelope: { prompt: "Draft a paid media plan." },
      output_body: "I automatically activated spend.",
      validation_errors: ["Forbidden execution claim"],
      status: "safety_failed",
      actor: "launcher-a",
    });
    await assert.rejects(
      () => adapter.recordWorkflowAttempt(tenantA, {
        idempotency_key: "workflow-run-safety-a-attempt-2",
        run_id: safetyWorkflowRun.run_id,
        attempt_number: 2,
        attempt_kind: "format_repair",
        package_name: safetyWorkflowRun.package_name,
        package_version: safetyWorkflowRun.package_version,
        context_revision: "1",
        input_envelope: { prompt: "repair" },
        output_body: "Changed claim",
        validation_errors: [],
        status: "succeeded",
        actor: "launcher-a",
      }),
      (error) =>
        stateError(error, "workflow_format_repair_not_allowed", 409),
      "safety failures must not receive a format repair",
    );

    const audit = await adapter.getAuditTrail(tenantA);
    assert.ok(audit.length >= 7);
    const runAttemptEvents = audit.filter(
      (entry) =>
        entry.event_type === "workflow_run.attempt_recorded" &&
        entry.details.run_id === workflowRun.run_id,
    );
    assert.equal(runAttemptEvents.length, 2);
    for (const [index, entry] of runAttemptEvents.entries()) {
      assert.equal(
        entry.details.attempt_hash,
        stableHash(approvedWorkflowRun.attempts[index]),
      );
    }
    for (let index = 0; index < audit.length; index += 1) {
      assert.equal(audit[index].sequence, index + 1);
      assert.equal(
        audit[index].previous_hash,
        index === 0 ? null : audit[index - 1].entry_hash,
      );
      const unsigned = {
        sequence: audit[index].sequence,
        tenant: audit[index].tenant,
        event_type: audit[index].event_type,
        actor: audit[index].actor,
        timestamp: audit[index].timestamp,
        details: audit[index].details,
        previous_hash: audit[index].previous_hash,
      };
      assert.equal(audit[index].entry_hash, stableHash(unsigned));
    }

    const exported = await adapter.exportWorkspace(tenantA);
    assert.equal(
      exported.sources[0].raw_source,
      "PostgreSQL confidential source",
    );
    assert.equal(
      exported.sources[1].raw_source,
      "PostgreSQL confidential source, corrected",
    );
    assert.equal(exported.context_snapshot.published_context_revision, 1);
    assert.ok(exported.artifacts.length >= 2);
    assert.equal(exported.workflow_runs.length, 2);
    assert.equal(
      exported.workflow_runs.find(
        (item) => item.run_id === workflowRun.run_id,
      ).attempts.length,
      2,
    );

    const deletedSource = await adapter.deleteSource(tenantA, {
      idempotency_key: "source-delete-a",
      source_id: sourceFirst.source_id,
      confirmation_text: `delete source ${sourceFirst.source_id}`,
      actor: "user-a",
    });
    assert.equal(deletedSource.deletion_state, "deleted");
    assert.equal(
      (
        await adapter.getSource(
          tenantA,
          sourceFirst.source_id,
          1,
        )
      ).raw_source,
      undefined,
    );
    assert.equal(
      (
        await adapter.getSource(
          tenantA,
          sourceFirst.source_id,
          2,
        )
      ).raw_source,
      undefined,
    );

    const directClient = await appPool.connect();
    try {
      await directClient.query("BEGIN");
      await directClient.query(
        `SELECT
           set_config('app.organization_id', $1, true),
           set_config('app.workspace_id', $2, true)`,
        [tenantB.organization_id, tenantB.workspace_id],
      );
      const isolated = await directClient.query(
        `SELECT count(*)::integer AS count FROM marketing_os_sources`,
      );
      assert.equal(isolated.rows[0].count, 0);
      await directClient.query("ROLLBACK");

      await directClient.query("BEGIN");
      await directClient.query(
        `SELECT
           set_config('app.organization_id', $1, true),
           set_config('app.workspace_id', $2, true)`,
        [tenantA.organization_id, tenantA.workspace_id],
      );
      let unapprovedArtifactRejected = false;
      try {
        await directClient.query(
          `UPDATE marketing_os_artifacts
              SET status = 'approved'
            WHERE artifact_id = $1 AND revision = 2`,
          [artifact.artifact_id],
        );
      } catch {
        unapprovedArtifactRejected = true;
      }
      assert.equal(unapprovedArtifactRejected, true);
      await directClient.query("ROLLBACK");

      await directClient.query("BEGIN");
      await directClient.query(
        `SELECT
           set_config('app.organization_id', $1, true),
           set_config('app.workspace_id', $2, true)`,
        [tenantA.organization_id, tenantA.workspace_id],
      );
      let invalidInitialRunRejected = false;
      try {
        await directClient.query(
          `INSERT INTO marketing_os_workflow_runs (
             organization_id, workspace_id, run_id, revision, route,
             specialist, package_name, package_version, input_envelope,
             status
           ) VALUES ($1,$2,$3,1,'messaging','Messaging',$4,'1.1.1','{}','blocked')`,
          [
            tenantA.organization_id,
            tenantA.workspace_id,
            crypto.randomUUID(),
            "publisher~guild-marketing-os-messaging",
          ],
        );
      } catch {
        invalidInitialRunRejected = true;
      }
      assert.equal(invalidInitialRunRejected, true);
      await directClient.query("ROLLBACK");

      await directClient.query("BEGIN");
      await directClient.query(
        `SELECT
           set_config('app.organization_id', $1, true),
           set_config('app.workspace_id', $2, true)`,
        [tenantA.organization_id, tenantA.workspace_id],
      );
      let auditMutationRejected = false;
      try {
        await directClient.query(
          `UPDATE marketing_os_audit SET actor = 'tampered'`,
        );
      } catch {
        auditMutationRejected = true;
      }
      assert.equal(auditMutationRejected, true);
      await directClient.query("ROLLBACK");

      await directClient.query("BEGIN");
      await directClient.query(
        `SELECT
           set_config('app.organization_id', $1, true),
           set_config('app.workspace_id', $2, true)`,
        [tenantA.organization_id, tenantA.workspace_id],
      );
      let attemptMutationRejected = false;
      try {
        await directClient.query(
          `UPDATE marketing_os_workflow_attempts
              SET output_body = 'tampered'
            WHERE run_id = $1 AND attempt_number = 1`,
          [workflowRun.run_id],
        );
      } catch {
        attemptMutationRejected = true;
      }
      assert.equal(attemptMutationRejected, true);
      await directClient.query("ROLLBACK");

      await directClient.query("BEGIN");
      await directClient.query(
        `SELECT
           set_config('app.organization_id', $1, true),
           set_config('app.workspace_id', $2, true)`,
        [tenantA.organization_id, tenantA.workspace_id],
      );
      let invalidFormatRepairRejected = false;
      try {
        await directClient.query(
          `INSERT INTO marketing_os_workflow_attempts (
             organization_id, workspace_id, run_id, attempt_number,
             attempt_kind, package_name, package_version, context_revision,
             input_envelope, output_body, validation_errors, status
           ) VALUES ($1,$2,$3,2,'format_repair',$4,$5,'1','{}','Changed','[]','succeeded')`,
          [
            tenantA.organization_id,
            tenantA.workspace_id,
            safetyWorkflowRun.run_id,
            safetyWorkflowRun.package_name,
            safetyWorkflowRun.package_version,
          ],
        );
      } catch {
        invalidFormatRepairRejected = true;
      }
      assert.equal(invalidFormatRepairRejected, true);
      await directClient.query("ROLLBACK");
    } finally {
      directClient.release();
    }

    const receipt = await adapter.deleteWorkspace(tenantA, {
      confirmation_text: WORKSPACE_DELETE_PHRASE,
      actor: "user-a",
    });
    assert.ok(receipt.deletion_receipt_id);
    assert.ok(receipt.record_counts.artifact_revisions >= 2);
    assert.equal(receipt.record_counts.workflow_runs, 2);
    assert.equal(receipt.record_counts.workflow_attempts, 3);
    await assert.rejects(
      () => adapter.exportWorkspace(tenantA),
      (error) => stateError(error, "workspace_deleted", 410),
    );
    assert.deepEqual(
      await adapter.deleteWorkspace(tenantA, {
        confirmation_text: WORKSPACE_DELETE_PHRASE,
        actor: "user-a",
      }),
      receipt,
    );
    await assert.rejects(
      () => adapter.consumeRateLimit(tenantA, rateRequest),
      (error) => stateError(error, "workspace_deleted", 410),
    );
    assert.equal(
      (
        await adapter.consumeRateLimit(tenantA, {
          ...rateRequest,
          permit_deleted_tenant: true,
        })
      ).remaining,
      2,
    );

    const remaining = await adminPool.query(
      `SELECT
         (SELECT count(*)::integer FROM marketing_os_sources) AS sources,
         (SELECT count(*)::integer FROM marketing_os_artifacts) AS artifacts,
         (SELECT count(*)::integer FROM marketing_os_workflow_runs) AS workflow_runs,
         (SELECT count(*)::integer FROM marketing_os_workflow_attempts) AS workflow_attempts,
         (SELECT count(*)::integer FROM marketing_os_idempotency) AS idempotency,
         (SELECT count(*)::integer FROM marketing_os_rate_limits) AS rate_limits,
         (SELECT count(*)::integer FROM marketing_os_audit) AS audit,
         (SELECT count(*)::integer FROM marketing_os_deletion_receipts) AS receipts`,
    );
    assert.equal(remaining.rows[0].sources, 0);
    assert.equal(remaining.rows[0].artifacts, 0);
    assert.equal(remaining.rows[0].workflow_runs, 0);
    assert.equal(remaining.rows[0].workflow_attempts, 0);
    assert.equal(remaining.rows[0].idempotency, 0);
    assert.equal(
      remaining.rows[0].rate_limits,
      1,
      "tenant B rate-limit bucket must remain isolated",
    );
    assert.ok(remaining.rows[0].audit > 0);
    assert.equal(remaining.rows[0].receipts, 1);
    const finalAudit = await adminPool.query(
      `SELECT event_type, actor
         FROM marketing_os_audit
        ORDER BY sequence DESC
        LIMIT 1`,
    );
    assert.equal(finalAudit.rows[0].event_type, "workspace.deleted");
    assert.equal(finalAudit.rows[0].actor, "user-a");
  } finally {
    await adapter.close();
  }
} finally {
  await adminPool.end();
}

console.log("Marketing OS PostgreSQL integration test OK.");

function stateError(error, code, status) {
  return (
    error instanceof StateContractError &&
    error.code === code &&
    error.status === status
  );
}
