import crypto from "node:crypto";
import { MarketingOsStateAdapter } from "./adapter.mjs";
import {
  ARTIFACT_STATUSES,
  CONTEXT_APPROVAL_PHRASE,
  StateContractError,
  WORKSPACE_DELETE_PHRASE,
  artifactRevisionInput,
  assertTenant,
  evidenceEntry,
  handoffCompletionState,
  newId,
  requiredString,
  stableHash,
  tenantKey,
  workflowAttemptInput,
  workflowRunInput,
  workflowRunUpdateInput,
  workstreamInput,
} from "./contracts.mjs";

const artifactTransitions = Object.freeze({
  draft: new Set(["ready_for_review", "blocked"]),
  ready_for_review: new Set(["draft", "blocked"]),
  approved: new Set(["superseded"]),
  blocked: new Set(["draft", "ready_for_review"]),
  superseded: new Set(),
});

const workflowRunTransitions = Object.freeze({
  running: new Set([
    "needs_input",
    "ready_for_review",
    "blocked",
    "failed",
  ]),
  needs_input: new Set(["running", "blocked", "failed"]),
  ready_for_review: new Set(["running", "approved", "blocked"]),
  approved: new Set(),
  blocked: new Set(["running", "failed"]),
  failed: new Set(),
});

export class MemoryMarketingOsStateAdapter extends MarketingOsStateAdapter {
  #masterKey;
  #tenants = new Map();
  #deletionReceipts = new Map();
  #clock;

  constructor({ encryptionKey, clock = () => new Date().toISOString() } = {}) {
    super();
    this.#masterKey = normalizeMasterKey(encryptionKey);
    this.#clock = clock;
  }

  async consumeRateLimit(tenant, request) {
    const binding = assertTenant(tenant);
    const deleted = this.#deletionReceipts.has(tenantKey(binding));
    if (deleted && request.permit_deleted_tenant !== true) {
      throw new StateContractError(
        "workspace_deleted",
        "Marketing OS workspace data has been deleted.",
        410,
      );
    }
    const subject = requiredString(request.subject, "subject");
    const maxRequests = boundedPositiveInteger(
      request.max_requests,
      "max_requests",
      100_000,
    );
    const windowSeconds = boundedPositiveInteger(
      request.window_seconds,
      "window_seconds",
      86_400,
    );
    const now = Date.parse(this.#clock());
    if (!Number.isFinite(now)) {
      throw new StateContractError(
        "invalid_clock",
        "The rate-limit clock is invalid.",
        500,
      );
    }
    const windowMilliseconds = windowSeconds * 1000;
    const bucketStart =
      Math.floor(now / windowMilliseconds) * windowMilliseconds;
    if (deleted) {
      return {
        limit: maxRequests,
        remaining: maxRequests,
        reset_at: new Date(
          bucketStart + windowMilliseconds,
        ).toISOString(),
      };
    }
    const state = this.#state(binding);
    for (const [existingKey, bucket] of state.rateLimits) {
      if (bucket.expiresAt + 86_400_000 < now) {
        state.rateLimits.delete(existingKey);
      }
    }
    const key = `${subject}:${bucketStart}:${windowSeconds}`;
    const requests = (state.rateLimits.get(key)?.requests ?? 0) + 1;
    if (requests > maxRequests) {
      throw new StateContractError(
        "rate_limit_exceeded",
        "Too many Marketing OS state requests. Retry after the current window.",
        429,
      );
    }
    state.rateLimits.set(key, {
      requests,
      expiresAt: bucketStart + windowMilliseconds,
    });
    return {
      limit: maxRequests,
      remaining: maxRequests - requests,
      reset_at: new Date(
        bucketStart + windowMilliseconds,
      ).toISOString(),
    };
  }

  async readContextSnapshot(tenant) {
    const state = this.#state(tenant, false);
    return clone(state?.contextSnapshot);
  }

  async publishContextSnapshot(tenant, request, { publisher } = {}) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "publish_context", request.idempotency_key, request, async () => {
      if (request.approval_text !== CONTEXT_APPROVAL_PHRASE) {
        throw new StateContractError("context_approval_required", `Context publication requires exact approval text: ${CONTEXT_APPROVAL_PHRASE}`, 403);
      }
      const expected = request.expected_current_revision ?? null;
      const current = state.contextSnapshot?.published_context_revision ?? null;
      if (expected !== current) {
        throw new StateContractError("context_revision_conflict", `Expected current context revision ${expected ?? "null"}, found ${current ?? "null"}.`, 409);
      }

      const artifact = this.#artifactRevision(
        state,
        requiredString(request.artifact_id, "artifact_id"),
        request.artifact_revision,
      );
      if (artifact.status !== "approved") {
        throw new StateContractError("approved_artifact_required", "Context publication requires an approved artifact revision.", 409);
      }
      const publication = typeof publisher === "function"
        ? await publisher({ tenant: binding, request: clone(request) })
        : {
            guild_context_id: request.guild_context_id,
            rollback_context_id: request.rollback_context_id,
          };
      if (typeof publisher === "function") {
        requiredString(
          publication?.guild_context_id,
          "publisher.guild_context_id",
        );
      }
      const nextRevision = (state.contextSnapshot?.published_context_revision ?? 0) + 1;
      const now = this.#clock();
      const approval = {
        approval_id: newId("approval"),
        type: "context_publish",
        actor: requiredString(request.actor, "actor"),
        timestamp: now,
        artifact_id: artifact.artifact_id,
        artifact_revision: artifact.revision,
        exact_approval_text: request.approval_text,
      };
      const snapshot = {
        workspace: binding,
        published_context_revision: nextRevision,
        guild_context_id: publication?.guild_context_id ?? null,
        rollback_context_id: publication?.rollback_context_id ?? null,
        compiled_brief: requiredString(request.compiled_brief, "compiled_brief"),
        readiness: request.readiness ?? "ready",
        source_references: [...new Set(request.source_references ?? [])],
        freshness: request.freshness ?? {},
        artifact_id: artifact.artifact_id,
        artifact_revision: artifact.revision,
        published_at: now,
        approval,
      };
      state.contextSnapshot = snapshot;
      state.approvals.push(approval);
      this.#audit(state, binding, "context.published", {
        context_revision: nextRevision,
        artifact_id: artifact.artifact_id,
        artifact_revision: artifact.revision,
      });
      return clone(snapshot);
    });
  }

  async storeSource(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "source_store", request.idempotency_key, request, () => {
      const sourceId = request.source_id ?? newId("source");
      if (state.sources.has(sourceId)) {
        throw new StateContractError("source_exists", "Source already exists.", 409);
      }
      const now = this.#clock();
      const revision = 1;
      const rawSource = requiredString(request.raw_source, "raw_source");
      const encrypted = encrypt(rawSource, this.#tenantEncryptionKey(binding), `${tenantKey(binding)}:${sourceId}:${revision}`);
      const record = {
        source_id: sourceId,
        revision,
        evidence: evidenceEntry(request.evidence ?? { mode: "source_supplied" }),
        provenance: request.provenance && typeof request.provenance === "object" ? clone(request.provenance) : {},
        uploader: requiredString(request.uploader, "uploader"),
        encrypted_raw_source: encrypted,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        deletion_state: "retained",
      };
      state.sources.set(sourceId, [record]);
      this.#audit(state, binding, "source.stored", { source_id: sourceId, revision });
      return publicSource(record);
    });
  }

  async getSource(tenant, sourceId, revision) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding, false);
    const revisions = state?.sources.get(sourceId);
    const record = revision === undefined
      ? revisions?.at(-1)
      : revisions?.find((item) => item.revision === revision);
    if (!record) throw new StateContractError("source_not_found", "Source was not found.", 404);
    const rawSource =
      record.deletion_state === "retained"
        ? decrypt(record.encrypted_raw_source, this.#tenantEncryptionKey(binding), `${tenantKey(binding)}:${record.source_id}:${record.revision}`)
        : undefined;
    return { ...publicSource(record), raw_source: rawSource };
  }

  async reviseSource(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(
      state,
      "source_revise",
      request.idempotency_key,
      request,
      () => {
        const sourceId = requiredString(request.source_id, "source_id");
        const revisions = state.sources.get(sourceId);
        if (!revisions) {
          throw new StateContractError(
            "source_not_found",
            "Source was not found.",
            404,
          );
        }
        const current = revisions.at(-1);
        this.#expectRevision(current.revision, request.expected_revision);
        if (current.deletion_state === "deleted") {
          throw new StateContractError(
            "source_deleted",
            "A deleted source cannot be revised.",
            410,
          );
        }
        const revision = current.revision + 1;
        const timestamp = this.#clock();
        const rawSource = requiredString(request.raw_source, "raw_source");
        const record = {
          source_id: sourceId,
          revision,
          evidence: evidenceEntry(
            request.evidence ?? current.evidence,
          ),
          provenance:
            request.provenance && typeof request.provenance === "object"
              ? clone(request.provenance)
              : clone(current.provenance),
          uploader: requiredString(request.uploader, "uploader"),
          encrypted_raw_source: encrypt(
            rawSource,
            this.#tenantEncryptionKey(binding),
            `${tenantKey(binding)}:${sourceId}:${revision}`,
          ),
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
          deletion_state: "retained",
        };
        revisions.push(record);
        this.#audit(state, binding, "source.revised", {
          source_id: sourceId,
          revision,
          previous_revision: current.revision,
        });
        return publicSource(record);
      },
    );
  }

  async deleteSource(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "source_delete", request.idempotency_key, request, () => {
      const sourceId = requiredString(request.source_id, "source_id");
      if (request.confirmation_text !== `delete source ${sourceId}`) {
        throw new StateContractError("source_delete_confirmation_required", `Type exactly: delete source ${sourceId}`, 403);
      }
      const revisions = state.sources.get(sourceId);
      if (!revisions) throw new StateContractError("source_not_found", "Source was not found.", 404);
      const current = revisions.at(-1);
      if (revisions.every((record) => record.deletion_state === "deleted")) {
        return publicSource(current);
      }
      const now = this.#clock();
      const deleted = revisions.map((record) => ({
        ...record,
        encrypted_raw_source: null,
        updated_at: now,
        deleted_at: now,
        deletion_state: "deleted",
      }));
      state.sources.set(sourceId, deleted);
      this.#audit(state, binding, "source.deleted", {
        source_id: sourceId,
        revisions_deleted: deleted.length,
      });
      return publicSource(deleted.at(-1));
    });
  }

  async storeArtifact(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "artifact_store", request.idempotency_key, request, () => {
      const artifactId = request.artifact_id ?? newId("artifact");
      if (state.artifacts.has(artifactId)) {
        throw new StateContractError("artifact_exists", "Artifact already exists.", 409);
      }
      const now = this.#clock();
      const record = {
        artifact_id: artifactId,
        revision: 1,
        ...artifactRevisionInput(request),
        created_at: now,
        updated_at: now,
      };
      state.artifacts.set(artifactId, [record]);
      this.#audit(state, binding, "artifact.stored", {
        artifact_id: artifactId,
        revision: 1,
        status: record.status,
      });
      return clone(record);
    });
  }

  async getArtifact(tenant, artifactId, revision) {
    const state = this.#state(assertTenant(tenant), false);
    return clone(this.#artifactRevision(state, artifactId, revision));
  }

  async reviseArtifact(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "artifact_revise", request.idempotency_key, request, () => {
      const artifactId = requiredString(request.artifact_id, "artifact_id");
      const revisions = state.artifacts.get(artifactId);
      if (!revisions) throw new StateContractError("artifact_not_found", "Artifact was not found.", 404);
      const current = revisions.at(-1);
      this.#expectRevision(current.revision, request.expected_revision);
      if (current.status === "approved") {
        revisions[revisions.length - 1] = { ...current, status: "superseded", updated_at: this.#clock() };
      }
      const now = this.#clock();
      const record = {
        artifact_id: artifactId,
        revision: current.revision + 1,
        ...artifactRevisionInput(request),
        approvals: [],
        created_at: now,
        updated_at: now,
      };
      revisions.push(record);
      this.#audit(state, binding, "artifact.revised", {
        artifact_id: artifactId,
        revision: record.revision,
        previous_revision: current.revision,
      });
      return clone(record);
    });
  }

  async setArtifactStatus(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "artifact_status", request.idempotency_key, request, () => {
      const artifactId = requiredString(request.artifact_id, "artifact_id");
      const revision = this.#artifactRevision(state, artifactId, request.revision);
      this.#expectRevision(revision.revision, request.expected_revision);
      if (!ARTIFACT_STATUSES.includes(request.status)) {
        throw new StateContractError("invalid_artifact_status", "Artifact status is invalid.");
      }
      if (!artifactTransitions[revision.status].has(request.status)) {
        throw new StateContractError("invalid_artifact_transition", `Cannot transition ${revision.status} to ${request.status}.`, 409);
      }
      const updated = { ...revision, status: request.status, updated_at: this.#clock() };
      this.#replaceArtifactRevision(state, updated);
      this.#audit(state, binding, "artifact.status_changed", {
        artifact_id: artifactId,
        revision: updated.revision,
        from: revision.status,
        to: updated.status,
      });
      return clone(updated);
    });
  }

  async approveArtifact(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "artifact_approve", request.idempotency_key, request, () => {
      const artifactId = requiredString(request.artifact_id, "artifact_id");
      const revision = this.#artifactRevision(state, artifactId, request.revision);
      this.#expectRevision(revision.revision, request.expected_revision);
      if (revision.status !== "ready_for_review") {
        throw new StateContractError("artifact_not_review_ready", "Only a ready_for_review artifact can be approved.", 409);
      }
      const approval = {
        approval_id: newId("approval"),
        type: "artifact",
        actor: requiredString(request.actor, "actor"),
        timestamp: this.#clock(),
        artifact_id: artifactId,
        artifact_revision: revision.revision,
        exact_approval_text: requiredString(request.approval_text, "approval_text"),
      };
      const updated = {
        ...revision,
        status: "approved",
        approvals: [...revision.approvals, approval],
        updated_at: approval.timestamp,
      };
      this.#replaceArtifactRevision(state, updated);
      state.approvals.push(approval);
      this.#audit(state, binding, "artifact.approved", {
        artifact_id: artifactId,
        revision: revision.revision,
        approval_id: approval.approval_id,
      });
      return clone(updated);
    });
  }

  async readWorkstream(tenant, specialist) {
    const state = this.#state(assertTenant(tenant), false);
    return clone(state?.workstreams.get(specialist));
  }

  async updateWorkstream(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "workstream_update", request.idempotency_key, request, () => {
      const value = workstreamInput(request);
      const current = state.workstreams.get(value.specialist);
      const expected = request.expected_revision ?? 0;
      const currentRevision = current?.revision ?? 0;
      this.#expectRevision(currentRevision, expected);
      const record = {
        ...value,
        revision: currentRevision + 1,
        updated_at: this.#clock(),
      };
      state.workstreams.set(value.specialist, record);
      this.#audit(state, binding, "workstream.updated", {
        specialist: value.specialist,
        revision: record.revision,
        status: record.status,
      });
      return clone(record);
    });
  }

  async createHandoff(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "handoff_create", request.idempotency_key, request, () => {
      const handoffId = request.handoff_id ?? newId("handoff");
      if (state.handoffs.has(handoffId)) throw new StateContractError("handoff_exists", "Handoff already exists.", 409);
      const record = {
        handoff_id: handoffId,
        revision: 1,
        source_agent: requiredString(request.source_agent, "source_agent"),
        target_agent: requiredString(request.target_agent, "target_agent"),
        artifact_references: Array.isArray(request.artifact_references) ? clone(request.artifact_references) : [],
        context_revision: request.context_revision ?? null,
        rationale: requiredString(request.rationale, "rationale"),
        completion_state: handoffCompletionState(request.completion_state),
        created_at: this.#clock(),
        updated_at: this.#clock(),
      };
      state.handoffs.set(handoffId, record);
      this.#audit(state, binding, "handoff.created", { handoff_id: handoffId, target_agent: record.target_agent });
      return clone(record);
    });
  }

  async updateHandoff(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "handoff_update", request.idempotency_key, request, () => {
      const handoffId = requiredString(request.handoff_id, "handoff_id");
      const current = state.handoffs.get(handoffId);
      if (!current) throw new StateContractError("handoff_not_found", "Handoff was not found.", 404);
      this.#expectRevision(current.revision, request.expected_revision);
      const record = {
        ...current,
        completion_state: handoffCompletionState(request.completion_state),
        revision: current.revision + 1,
        updated_at: this.#clock(),
      };
      state.handoffs.set(handoffId, record);
      this.#audit(state, binding, "handoff.updated", {
        handoff_id: handoffId,
        revision: record.revision,
        completion_state: record.completion_state,
      });
      return clone(record);
    });
  }

  async createWorkflowRun(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(
      state,
      "workflow_run_create",
      request.idempotency_key,
      request,
      () => {
        const runId = request.run_id ?? newId("run");
        if (state.workflowRuns.has(runId)) {
          throw new StateContractError(
            "workflow_run_exists",
            "Workflow run already exists.",
            409,
          );
        }
        const timestamp = this.#clock();
        const record = {
          run_id: runId,
          revision: 1,
          ...workflowRunInput(request),
          artifact_id: undefined,
          artifact_revision: undefined,
          handoff_id: undefined,
          error_summary: undefined,
          attempts: [],
          created_at: timestamp,
          updated_at: timestamp,
        };
        state.workflowRuns.set(runId, record);
        this.#audit(state, binding, "workflow_run.created", {
          run_id: runId,
          route: record.route,
          specialist: record.specialist,
          package_name: record.package_name,
          package_version: record.package_version,
          context_revision: record.context_revision ?? null,
          input_envelope_hash: stableHash(record.input_envelope),
        });
        return clone(record);
      },
    );
  }

  async getWorkflowRun(tenant, runId) {
    const state = this.#state(assertTenant(tenant), false);
    const record = state?.workflowRuns.get(runId);
    if (!record) {
      throw new StateContractError(
        "workflow_run_not_found",
        "Workflow run was not found.",
        404,
      );
    }
    return clone(record);
  }

  async listWorkflowRuns(tenant) {
    const state = this.#state(assertTenant(tenant), false);
    return clone(
      [...(state?.workflowRuns.values() ?? [])].sort((left, right) =>
        right.updated_at.localeCompare(left.updated_at),
      ),
    );
  }

  async recordWorkflowAttempt(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    const runId = requiredString(request.run_id, "run_id");
    return this.#idempotent(
      state,
      `workflow_attempt_record:${runId}`,
      request.idempotency_key,
      request,
      () => {
        const run = state.workflowRuns.get(runId);
        if (!run) {
          throw new StateContractError(
            "workflow_run_not_found",
            "Workflow run was not found.",
            404,
          );
        }
        if (run.status !== "running") {
          throw new StateContractError(
            "workflow_run_not_running",
            "Workflow attempts can be recorded only while the run is running.",
            409,
          );
        }
        const input = workflowAttemptInput(request);
        if (
          input.package_name !== run.package_name ||
          input.package_version !== run.package_version
        ) {
          throw new StateContractError(
            "workflow_attempt_package_mismatch",
            "Workflow attempt package and version must match the run binding.",
            409,
          );
        }
        if (
          (input.context_revision ?? null) !==
          (run.context_revision ?? null)
        ) {
          throw new StateContractError(
            "workflow_attempt_context_mismatch",
            "Workflow attempt context revision must match the run binding.",
            409,
          );
        }
        if (
          run.attempts.some(
            (attempt) =>
              attempt.attempt_number === input.attempt_number,
          )
        ) {
          throw new StateContractError(
            "workflow_attempt_exists",
            "Workflow attempt number already exists.",
            409,
          );
        }
        if (input.attempt_kind === "format_repair") {
          const first = run.attempts.find(
            (attempt) => attempt.attempt_number === 1,
          );
          if (!first || first.status !== "format_invalid") {
            throw new StateContractError(
              "workflow_format_repair_not_allowed",
              "Format repair is allowed only after a format-invalid initial attempt.",
              409,
            );
          }
        }
        const attempt = {
          run_id: runId,
          ...input,
          created_at: this.#clock(),
        };
        run.attempts.push(attempt);
        run.updated_at = attempt.created_at;
        this.#audit(state, binding, "workflow_run.attempt_recorded", {
          run_id: runId,
          attempt_number: attempt.attempt_number,
          attempt_kind: attempt.attempt_kind,
          status: attempt.status,
          validation_errors: attempt.validation_errors,
          error_code: attempt.error_code ?? null,
          attempt_hash: stableHash(attempt),
        });
        return clone(attempt);
      },
    );
  }

  async updateWorkflowRun(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    const runId = requiredString(request.run_id, "run_id");
    return this.#idempotent(
      state,
      `workflow_run_update:${runId}`,
      request.idempotency_key,
      request,
      () => {
        const current = state.workflowRuns.get(runId);
        if (!current) {
          throw new StateContractError(
            "workflow_run_not_found",
            "Workflow run was not found.",
            404,
          );
        }
        this.#expectRevision(
          current.revision,
          request.expected_revision,
        );
        const input = workflowRunUpdateInput(request);
        if (
          input.status !== current.status &&
          !workflowRunTransitions[current.status].has(input.status)
        ) {
          throw new StateContractError(
            "invalid_workflow_run_transition",
            `Cannot transition workflow run ${current.status} to ${input.status}.`,
            409,
          );
        }
        if (
          ["ready_for_review", "approved"].includes(input.status) &&
          (!input.artifact_id || !input.artifact_revision)
        ) {
          throw new StateContractError(
            "workflow_run_artifact_required",
            `${input.status} workflow runs require an artifact reference.`,
            409,
          );
        }
        if (input.status === "failed" && !input.error_summary) {
          throw new StateContractError(
            "workflow_run_error_required",
            "A failed workflow run requires error_summary.",
          );
        }
        let referencedArtifact;
        if (input.artifact_id) {
          referencedArtifact = this.#artifactRevision(
            state,
            input.artifact_id,
            input.artifact_revision,
          );
        }
        if (
          input.status === "ready_for_review" &&
          !["ready_for_review", "approved"].includes(
            referencedArtifact.status,
          )
        ) {
          throw new StateContractError(
            "workflow_run_artifact_status_mismatch",
            "A review-ready workflow run requires a review-ready or approved artifact.",
            409,
          );
        }
        if (
          input.status === "approved" &&
          referencedArtifact.status !== "approved"
        ) {
          throw new StateContractError(
            "workflow_run_artifact_status_mismatch",
            "An approved workflow run requires an approved artifact.",
            409,
          );
        }
        if (
          input.handoff_id &&
          !state.handoffs.has(input.handoff_id)
        ) {
          throw new StateContractError(
            "handoff_not_found",
            "Handoff was not found.",
            404,
          );
        }
        if (
          ["ready_for_review", "approved"].includes(input.status) &&
          current.attempts.at(-1)?.status !== "succeeded"
        ) {
          throw new StateContractError(
            "successful_workflow_attempt_required",
            `${input.status} workflow runs require a succeeded final attempt.`,
            409,
          );
        }
        const updated = {
          ...current,
          ...input,
          revision: current.revision + 1,
          updated_at: this.#clock(),
        };
        state.workflowRuns.set(runId, updated);
        this.#audit(state, binding, "workflow_run.updated", {
          run_id: runId,
          revision: updated.revision,
          from: current.status,
          to: updated.status,
          artifact_id: updated.artifact_id ?? null,
          artifact_revision: updated.artifact_revision ?? null,
          handoff_id: updated.handoff_id ?? null,
        });
        return clone(updated);
      },
    );
  }

  async getAuditTrail(tenant) {
    const state = this.#state(assertTenant(tenant), false);
    return clone(state?.audit ?? []);
  }

  async exportWorkspace(tenant) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding, false);
    if (!state) {
      return { schema_version: "1.0", tenant: binding, context_snapshot: null, sources: [], artifacts: [], workstreams: [], handoffs: [], workflow_runs: [], approvals: [], audit: [] };
    }
    const sources = [];
    for (const revisions of state.sources.values()) {
      for (const source of revisions) {
        sources.push(
          await this.getSource(binding, source.source_id, source.revision),
        );
      }
    }
    return {
      schema_version: "1.0",
      exported_at: this.#clock(),
      tenant: binding,
      context_snapshot: clone(state.contextSnapshot),
      sources,
      artifacts: [...state.artifacts.values()].flatMap((items) => clone(items)),
      workstreams: clone([...state.workstreams.values()]),
      handoffs: clone([...state.handoffs.values()]),
      workflow_runs: clone([...state.workflowRuns.values()]),
      approvals: clone(state.approvals),
      audit: clone(state.audit),
    };
  }

  async deleteWorkspace(tenant, request) {
    const binding = assertTenant(tenant);
    if (request.confirmation_text !== WORKSPACE_DELETE_PHRASE) {
      throw new StateContractError("workspace_delete_confirmation_required", `Type exactly: ${WORKSPACE_DELETE_PHRASE}`, 403);
    }
    const key = tenantKey(binding);
    const existingReceipt = this.#deletionReceipts.get(key);
    if (existingReceipt) return clone(existingReceipt);
    const state = this.#tenants.get(key);
    const receipt = {
      deletion_receipt_id: newId("deletion"),
      tenant_hash: stableHash(binding),
      deleted_at: this.#clock(),
      record_counts: state
        ? {
            source_revisions: [...state.sources.values()].reduce(
              (count, revisions) => count + revisions.length,
              0,
            ),
            artifact_revisions: [...state.artifacts.values()].reduce((count, revisions) => count + revisions.length, 0),
            workstreams: state.workstreams.size,
            handoffs: state.handoffs.size,
            workflow_runs: state.workflowRuns.size,
            workflow_attempts: [...state.workflowRuns.values()].reduce(
              (count, run) => count + run.attempts.length,
              0,
            ),
            approvals: state.approvals.length,
            audit_entries: state.audit.length,
          }
        : {},
    };
    this.#tenants.delete(key);
    this.#deletionReceipts.set(key, receipt);
    return clone(receipt);
  }

  #state(tenant, create = true) {
    const binding = assertTenant(tenant);
    const key = tenantKey(binding);
    if (this.#deletionReceipts.has(key)) {
      throw new StateContractError(
        "workspace_deleted",
        "Marketing OS workspace data has been deleted.",
        410,
      );
    }
    if (!this.#tenants.has(key) && create) {
      this.#tenants.set(key, {
        contextSnapshot: undefined,
        sources: new Map(),
        artifacts: new Map(),
        workstreams: new Map(),
        handoffs: new Map(),
        workflowRuns: new Map(),
        approvals: [],
        audit: [],
        idempotency: new Map(),
        rateLimits: new Map(),
      });
    }
    return this.#tenants.get(key);
  }

  #artifactRevision(state, artifactId, revision) {
    const revisions = state?.artifacts.get(artifactId);
    if (!revisions) throw new StateContractError("artifact_not_found", "Artifact was not found.", 404);
    const record = revision === undefined ? revisions.at(-1) : revisions.find((item) => item.revision === revision);
    if (!record) throw new StateContractError("artifact_revision_not_found", "Artifact revision was not found.", 404);
    return record;
  }

  #replaceArtifactRevision(state, updated) {
    const revisions = state.artifacts.get(updated.artifact_id);
    const index = revisions.findIndex((item) => item.revision === updated.revision);
    revisions[index] = updated;
  }

  #expectRevision(current, expected) {
    if (!Number.isInteger(expected) || current !== expected) {
      throw new StateContractError("revision_conflict", `Expected revision ${expected}, found ${current}.`, 409);
    }
  }

  async #idempotent(state, operation, idempotencyKey, payload, action) {
    const key = requiredString(idempotencyKey, "idempotency_key");
    const scopedKey = `${operation}:${key}`;
    const payloadHash = stableHash(payload);
    const existing = state.idempotency.get(scopedKey);
    if (existing) {
      if (existing.payload_hash !== payloadHash) {
        throw new StateContractError("idempotency_conflict", "The idempotency key was already used with a different request.", 409);
      }
      return clone(existing.result);
    }
    const result = await action();
    state.idempotency.set(scopedKey, { payload_hash: payloadHash, result: clone(result) });
    return result;
  }

  #audit(state, tenant, eventType, details) {
    const previousHash = state.audit.at(-1)?.entry_hash ?? null;
    const entry = {
      audit_id: newId("audit"),
      sequence: state.audit.length + 1,
      tenant: clone(tenant),
      event_type: eventType,
      timestamp: this.#clock(),
      details: clone(details),
      previous_hash: previousHash,
    };
    entry.entry_hash = stableHash(entry);
    state.audit.push(Object.freeze(entry));
  }

  #tenantEncryptionKey(tenant) {
    return crypto.createHmac("sha256", this.#masterKey).update(tenantKey(tenant)).digest();
  }
}

function normalizeMasterKey(value) {
  if (Buffer.isBuffer(value) && value.length === 32) return Buffer.from(value);
  if (typeof value === "string") {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 32) return decoded;
  }
  if (value === undefined) return crypto.randomBytes(32);
  throw new StateContractError("invalid_encryption_key", "encryptionKey must be 32 bytes or base64-encoded 32 bytes.");
}

function encrypt(plaintext, key, associatedData) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(associatedData));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    algorithm: "AES-256-GCM",
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    auth_tag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(encrypted, key, associatedData) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(encrypted.iv, "base64"));
  decipher.setAAD(Buffer.from(associatedData));
  decipher.setAuthTag(Buffer.from(encrypted.auth_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function publicSource(record) {
  const { encrypted_raw_source: _encrypted, ...safe } = record;
  return clone(safe);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function boundedPositiveInteger(value, field, maximum) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new StateContractError(
      "invalid_request",
      `${field} must be a positive integer no greater than ${maximum}.`,
    );
  }
  return value;
}
