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
  newId,
  requiredString,
  stableHash,
  tenantKey,
  workstreamInput,
} from "./contracts.mjs";

const artifactTransitions = Object.freeze({
  draft: new Set(["ready_for_review", "blocked"]),
  ready_for_review: new Set(["draft", "approved", "blocked"]),
  approved: new Set(["superseded"]),
  blocked: new Set(["draft", "ready_for_review"]),
  superseded: new Set(),
});

export class MemoryMarketingOsStateAdapter extends MarketingOsStateAdapter {
  #masterKey;
  #tenants = new Map();
  #deletionReceipts = [];
  #clock;

  constructor({ encryptionKey, clock = () => new Date().toISOString() } = {}) {
    super();
    this.#masterKey = normalizeMasterKey(encryptionKey);
    this.#clock = clock;
  }

  async readContextSnapshot(tenant) {
    const state = this.#state(tenant, false);
    return clone(state?.contextSnapshot);
  }

  async publishContextSnapshot(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "publish_context", request.idempotency_key, request, () => {
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
      state.sources.set(sourceId, record);
      this.#audit(state, binding, "source.stored", { source_id: sourceId, revision });
      return publicSource(record);
    });
  }

  async getSource(tenant, sourceId) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding, false);
    const record = state?.sources.get(sourceId);
    if (!record) throw new StateContractError("source_not_found", "Source was not found.", 404);
    const rawSource =
      record.deletion_state === "retained"
        ? decrypt(record.encrypted_raw_source, this.#tenantEncryptionKey(binding), `${tenantKey(binding)}:${record.source_id}:${record.revision}`)
        : undefined;
    return { ...publicSource(record), raw_source: rawSource };
  }

  async deleteSource(tenant, request) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding);
    return this.#idempotent(state, "source_delete", request.idempotency_key, request, () => {
      const sourceId = requiredString(request.source_id, "source_id");
      if (request.confirmation_text !== `delete source ${sourceId}`) {
        throw new StateContractError("source_delete_confirmation_required", `Type exactly: delete source ${sourceId}`, 403);
      }
      const record = state.sources.get(sourceId);
      if (!record) throw new StateContractError("source_not_found", "Source was not found.", 404);
      if (record.deletion_state === "deleted") return publicSource(record);
      const now = this.#clock();
      const deleted = {
        ...record,
        encrypted_raw_source: null,
        updated_at: now,
        deleted_at: now,
        deletion_state: "deleted",
      };
      state.sources.set(sourceId, deleted);
      this.#audit(state, binding, "source.deleted", { source_id: sourceId, revision: record.revision });
      return publicSource(deleted);
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
        completion_state: request.completion_state ?? "pending",
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
        completion_state: requiredString(request.completion_state, "completion_state"),
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

  async getAuditTrail(tenant) {
    const state = this.#state(assertTenant(tenant), false);
    return clone(state?.audit ?? []);
  }

  async exportWorkspace(tenant) {
    const binding = assertTenant(tenant);
    const state = this.#state(binding, false);
    if (!state) {
      return { schema_version: "1.0", tenant: binding, context_snapshot: null, sources: [], artifacts: [], workstreams: [], handoffs: [], approvals: [], audit: [] };
    }
    const sources = [];
    for (const source of state.sources.values()) {
      sources.push(await this.getSource(binding, source.source_id));
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
    const state = this.#tenants.get(key);
    const receipt = {
      deletion_receipt_id: newId("deletion"),
      tenant_hash: stableHash(binding),
      deleted_at: this.#clock(),
      record_counts: state
        ? {
            sources: state.sources.size,
            artifact_revisions: [...state.artifacts.values()].reduce((count, revisions) => count + revisions.length, 0),
            workstreams: state.workstreams.size,
            handoffs: state.handoffs.size,
            approvals: state.approvals.length,
            audit_entries: state.audit.length,
          }
        : {},
    };
    this.#tenants.delete(key);
    this.#deletionReceipts.push(receipt);
    return clone(receipt);
  }

  #state(tenant, create = true) {
    const binding = assertTenant(tenant);
    const key = tenantKey(binding);
    if (!this.#tenants.has(key) && create) {
      this.#tenants.set(key, {
        contextSnapshot: undefined,
        sources: new Map(),
        artifacts: new Map(),
        workstreams: new Map(),
        handoffs: new Map(),
        approvals: [],
        audit: [],
        idempotency: new Map(),
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

  #idempotent(state, operation, idempotencyKey, payload, action) {
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
    const result = action();
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
