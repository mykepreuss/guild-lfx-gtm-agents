#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { MemoryMarketingOsStateAdapter } from "./memory-adapter.mjs";
import {
  CONTEXT_APPROVAL_PHRASE,
  StateContractError,
  WORKSPACE_DELETE_PHRASE,
  stableHash,
} from "./contracts.mjs";

let tick = 0;
const adapter = new MemoryMarketingOsStateAdapter({
  encryptionKey: crypto.createHash("sha256").update("test-key").digest(),
  clock: () => `2026-07-28T00:00:${String(tick++).padStart(2, "0")}.000Z`,
});

const tenantA = { organization_id: "org_a", workspace_id: "workspace_a" };
const tenantB = { organization_id: "org_b", workspace_id: "workspace_b" };

const sourceRequest = {
  idempotency_key: "source-1",
  raw_source: "Confidential interview transcript",
  uploader: "user_a",
  provenance: { filename: "interview.txt" },
  evidence: {
    mode: "source_supplied",
    source_coverage: ["interview.txt"],
    limitations: ["Single interview"],
  },
};
const source = await adapter.storeSource(tenantA, sourceRequest);
assert.equal(source.deletion_state, "retained");
assert.equal(source.raw_source, undefined);
assert.equal(JSON.stringify(source).includes("Confidential interview transcript"), false);
assert.deepEqual(await adapter.storeSource(tenantA, sourceRequest), source, "same idempotent request should return same result");
await assert.rejects(
  () => adapter.storeSource(tenantA, { ...sourceRequest, raw_source: "Different source" }),
  (error) => isStateError(error, "idempotency_conflict", 409),
);
assert.equal((await adapter.getSource(tenantA, source.source_id)).raw_source, "Confidential interview transcript");
await assert.rejects(
  () => adapter.getSource(tenantB, source.source_id),
  (error) => isStateError(error, "source_not_found", 404),
  "tenant B must not read tenant A source",
);
const sourceRevision2 = await adapter.reviseSource(tenantA, {
  ...sourceRequest,
  idempotency_key: "source-revision-2",
  source_id: source.source_id,
  expected_revision: 1,
  raw_source: "Confidential interview transcript, corrected",
});
assert.equal(sourceRevision2.revision, 2);
assert.equal(
  (await adapter.getSource(tenantA, source.source_id)).raw_source,
  "Confidential interview transcript, corrected",
);
assert.equal(
  (await adapter.getSource(tenantA, source.source_id, 1)).raw_source,
  "Confidential interview transcript",
);
await assert.rejects(
  () => adapter.reviseSource(tenantA, {
    ...sourceRequest,
    idempotency_key: "source-revision-stale",
    source_id: source.source_id,
    expected_revision: 1,
  }),
  (error) => isStateError(error, "revision_conflict", 409),
);

const artifactRequest = {
  idempotency_key: "artifact-1",
  artifact_type: "messaging",
  markdown_body: "# Messaging Draft",
  consumed_source_revisions: [`${source.source_id}:1`],
  evidence: [{ mode: "source_supplied", source_revision_ids: [`${source.source_id}:1`] }],
  status: "draft",
  safety: {
    action_mode: "draft_only",
    external_mutation_requested: false,
    evidence_gaps: ["More interviews"],
  },
};
const artifactDraft = await adapter.storeArtifact(tenantA, artifactRequest);
assert.equal(artifactDraft.revision, 1);
assert.equal(artifactDraft.status, "draft");
await assert.rejects(
  () => adapter.storeArtifact(tenantA, {
    ...artifactRequest,
    idempotency_key: "artifact-direct-approved",
    status: "approved",
  }),
  (error) => isStateError(error, "invalid_artifact_status", 400),
  "artifact approval must create a separate approval record",
);

const reviewReady = await adapter.setArtifactStatus(tenantA, {
  idempotency_key: "artifact-review-1",
  artifact_id: artifactDraft.artifact_id,
  revision: 1,
  expected_revision: 1,
  status: "ready_for_review",
});
assert.equal(reviewReady.status, "ready_for_review");
await assert.rejects(
  () => adapter.setArtifactStatus(tenantA, {
    idempotency_key: "artifact-status-direct-approved",
    artifact_id: artifactDraft.artifact_id,
    revision: 1,
    expected_revision: 1,
    status: "approved",
  }),
  (error) => isStateError(error, "invalid_artifact_transition", 409),
  "status changes cannot bypass approval",
);

const approved = await adapter.approveArtifact(tenantA, {
  idempotency_key: "artifact-approve-1",
  artifact_id: artifactDraft.artifact_id,
  revision: 1,
  expected_revision: 1,
  actor: "marketing_owner",
  approval_text: "Approved messaging revision 1",
});
assert.equal(approved.status, "approved");
assert.equal(approved.approvals[0].exact_approval_text, "Approved messaging revision 1");

await assert.rejects(
  () => adapter.publishContextSnapshot(tenantA, {
    idempotency_key: "context-bad-approval",
    expected_current_revision: null,
    artifact_id: artifactDraft.artifact_id,
    artifact_revision: 1,
    compiled_brief: "Compact approved company brief.",
    actor: "context_owner",
    approval_text: "publish it",
  }),
  (error) => isStateError(error, "context_approval_required", 403),
);

const contextRequest = {
  idempotency_key: "context-1",
  expected_current_revision: null,
  artifact_id: artifactDraft.artifact_id,
  artifact_revision: 1,
  compiled_brief: "Compact approved company brief.",
  readiness: "ready",
  source_references: [`${source.source_id}:1`],
  freshness: { observed_at: "2026-07-28T00:00:00.000Z" },
  actor: "context_owner",
  approval_text: CONTEXT_APPROVAL_PHRASE,
};
const context = await adapter.publishContextSnapshot(tenantA, contextRequest);
assert.equal(context.published_context_revision, 1);
assert.deepEqual(await adapter.publishContextSnapshot(tenantA, contextRequest), context);
await assert.rejects(
  () => adapter.publishContextSnapshot(tenantA, { ...contextRequest, idempotency_key: "context-stale", compiled_brief: "Changed" }),
  (error) => isStateError(error, "context_revision_conflict", 409),
);

const revision2 = await adapter.reviseArtifact(tenantA, {
  ...artifactRequest,
  idempotency_key: "artifact-revision-2",
  artifact_id: artifactDraft.artifact_id,
  expected_revision: 1,
  markdown_body: "# Messaging Draft Revision 2",
});
assert.equal(revision2.revision, 2);
assert.equal((await adapter.getArtifact(tenantA, artifactDraft.artifact_id, 1)).status, "superseded");
await assert.rejects(
  () => adapter.reviseArtifact(tenantA, {
    ...artifactRequest,
    idempotency_key: "artifact-stale",
    artifact_id: artifactDraft.artifact_id,
    expected_revision: 1,
  }),
  (error) => isStateError(error, "revision_conflict", 409),
);

const handoff = await adapter.createHandoff(tenantA, {
  idempotency_key: "handoff-1",
  source_agent: "Messaging",
  target_agent: "Campaigns And Paid Media",
  artifact_references: [{ artifact_id: artifactDraft.artifact_id, revision: 1 }],
  context_revision: 1,
  rationale: "Approved messaging is ready for campaign planning.",
});
assert.equal(handoff.completion_state, "pending");
await assert.rejects(
  () => adapter.createHandoff(tenantA, {
    idempotency_key: "handoff-invalid-state",
    source_agent: "Messaging",
    target_agent: "Campaigns And Paid Media",
    rationale: "Invalid state should be rejected.",
    completion_state: "executed",
  }),
  (error) => isStateError(error, "invalid_handoff_completion_state", 400),
);
const completedHandoff = await adapter.updateHandoff(tenantA, {
  idempotency_key: "handoff-complete-1",
  handoff_id: handoff.handoff_id,
  expected_revision: 1,
  completion_state: "completed",
});
assert.equal(completedHandoff.revision, 2);

const workstream = await adapter.updateWorkstream(tenantA, {
  idempotency_key: "workstream-1",
  expected_revision: 0,
  specialist: "Messaging",
  status: "approved",
  latest_artifact_id: artifactDraft.artifact_id,
  latest_artifact_revision: 1,
  blockers: [],
  next_action: "Continue to campaign planning.",
  handoff_id: handoff.handoff_id,
});
assert.equal(workstream.revision, 1);
await assert.rejects(
  () => adapter.updateWorkstream(tenantA, {
    ...workstream,
    idempotency_key: "workstream-stale",
    expected_revision: 0,
  }),
  (error) => isStateError(error, "revision_conflict", 409),
);

const audit = await adapter.getAuditTrail(tenantA);
assert.ok(audit.length >= 9);
for (let index = 0; index < audit.length; index += 1) {
  const entry = audit[index];
  assert.equal(entry.sequence, index + 1);
  assert.equal(entry.previous_hash, index === 0 ? null : audit[index - 1].entry_hash);
  const { entry_hash: _entryHash, ...unsigned } = entry;
  assert.equal(entry.entry_hash, stableHash(unsigned));
}

const exported = await adapter.exportWorkspace(tenantA);
assert.equal(exported.sources[0].raw_source, "Confidential interview transcript");
assert.equal(exported.sources[1].raw_source, "Confidential interview transcript, corrected");
assert.equal(exported.context_snapshot.published_context_revision, 1);
assert.ok(exported.artifacts.some((item) => item.revision === 1 && item.status === "superseded"));
assert.ok(exported.artifacts.some((item) => item.revision === 2));

await assert.rejects(
  () => adapter.deleteSource(tenantA, {
    idempotency_key: "source-delete-wrong",
    source_id: source.source_id,
    confirmation_text: "delete it",
  }),
  (error) => isStateError(error, "source_delete_confirmation_required", 403),
);
const deletedSource = await adapter.deleteSource(tenantA, {
  idempotency_key: "source-delete-1",
  source_id: source.source_id,
  confirmation_text: `delete source ${source.source_id}`,
});
assert.equal(deletedSource.deletion_state, "deleted");
assert.equal((await adapter.getSource(tenantA, source.source_id)).raw_source, undefined);
assert.equal(
  (await adapter.getSource(tenantA, source.source_id, 1)).raw_source,
  undefined,
);

await assert.rejects(
  () => adapter.deleteWorkspace(tenantA, { confirmation_text: "delete workspace" }),
  (error) => isStateError(error, "workspace_delete_confirmation_required", 403),
);
const deletionReceipt = await adapter.deleteWorkspace(tenantA, { confirmation_text: WORKSPACE_DELETE_PHRASE });
assert.ok(deletionReceipt.record_counts.artifact_revisions >= 2);
assert.deepEqual(
  await adapter.deleteWorkspace(tenantA, {
    confirmation_text: WORKSPACE_DELETE_PHRASE,
  }),
  deletionReceipt,
);
await assert.rejects(
  () => adapter.getAuditTrail(tenantA),
  (error) => isStateError(error, "workspace_deleted", 410),
);
await assert.rejects(
  () => adapter.exportWorkspace(tenantA),
  (error) => isStateError(error, "workspace_deleted", 410),
);

console.log("Marketing OS state adapter contract test OK.");

function isStateError(error, code, status) {
  return error instanceof StateContractError && error.code === code && error.status === status;
}
