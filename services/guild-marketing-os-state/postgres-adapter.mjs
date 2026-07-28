import crypto from "node:crypto";
import pg from "pg";
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
  requiredString,
  stableHash,
  workflowAttemptInput,
  workflowRunInput,
  workflowRunUpdateInput,
  workstreamInput,
} from "./contracts.mjs";

const { Pool } = pg;

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

export class PostgresMarketingOsStateAdapter extends MarketingOsStateAdapter {
  #pool;
  #encryption;
  #clock;

  constructor({
    pool,
    connectionString,
    encryption,
    clock = () => new Date().toISOString(),
    poolOptions = {},
  } = {}) {
    super();
    if (!encryption?.encrypt || !encryption?.decrypt) {
      throw new TypeError(
        "PostgresMarketingOsStateAdapter requires an envelope encryption provider.",
      );
    }
    if (
      !pool &&
      (typeof connectionString !== "string" || !connectionString.trim())
    ) {
      throw new TypeError(
        "PostgresMarketingOsStateAdapter requires a pool or connectionString.",
      );
    }
    this.#pool =
      pool ??
      new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
        ...poolOptions,
      });
    this.#encryption = encryption;
    this.#clock = clock;
  }

  async close() {
    if (typeof this.#pool.end === "function") await this.#pool.end();
  }

  async healthCheck() {
    const result = await this.#pool.query("SELECT 1 AS ready");
    return result.rows[0]?.ready === 1;
  }

  async consumeRateLimit(tenant, request) {
    const binding = assertTenant(tenant);
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
    const now = new Date(this.#clock());
    if (!Number.isFinite(now.getTime())) {
      throw new StateContractError(
        "invalid_clock",
        "The rate-limit clock is invalid.",
        500,
      );
    }
    const windowMilliseconds = windowSeconds * 1000;
    const bucketStart = new Date(
      Math.floor(now.getTime() / windowMilliseconds) *
        windowMilliseconds,
    );
    return this.#transaction(
      binding,
      {
        createTenant: true,
        permitDeletedTenant: request.permit_deleted_tenant === true,
      },
      async (client) => {
        if (request.permit_deleted_tenant === true) {
          const deleted = await client.query(
            `SELECT deleted_at
               FROM marketing_os_tenants
              WHERE organization_id = $1 AND workspace_id = $2`,
            [binding.organization_id, binding.workspace_id],
          );
          if (deleted.rows[0]?.deleted_at) {
            return {
              limit: maxRequests,
              remaining: maxRequests,
              reset_at: new Date(
                bucketStart.getTime() + windowMilliseconds,
              ).toISOString(),
            };
          }
        }
        await client.query(
          `DELETE FROM marketing_os_rate_limits
            WHERE bucket_start < $1::timestamptz - interval '2 days'`,
          [now.toISOString()],
        );
        const result = await client.query(
          `INSERT INTO marketing_os_rate_limits (
             organization_id, workspace_id, subject, bucket_start,
             window_seconds, requests
           ) VALUES ($1,$2,$3,$4,$5,1)
           ON CONFLICT (
             organization_id, workspace_id, subject, bucket_start,
             window_seconds
           )
           DO UPDATE SET requests = marketing_os_rate_limits.requests + 1
           RETURNING requests`,
          [
            binding.organization_id,
            binding.workspace_id,
            subject,
            bucketStart.toISOString(),
            windowSeconds,
          ],
        );
        const requests = Number(result.rows[0].requests);
        if (requests > maxRequests) {
          throw new StateContractError(
            "rate_limit_exceeded",
            "Too many Marketing OS state requests. Retry after the current window.",
            429,
          );
        }
        return {
          limit: maxRequests,
          remaining: maxRequests - requests,
          reset_at: new Date(
            bucketStart.getTime() + windowMilliseconds,
          ).toISOString(),
        };
      },
    );
  }

  async readContextSnapshot(tenant) {
    const binding = assertTenant(tenant);
    return this.#transaction(binding, { createTenant: false }, async (client) => {
      const result = await client.query(
        `SELECT *
           FROM marketing_os_context_snapshots
          ORDER BY published_context_revision DESC
          LIMIT 1`,
      );
      return result.rows[0]
        ? contextSnapshot(result.rows[0], binding)
        : undefined;
    });
  }

  async publishContextSnapshot(tenant, request, { publisher } = {}) {
    const binding = assertTenant(tenant);
    if (request.approval_text !== CONTEXT_APPROVAL_PHRASE) {
      throw new StateContractError(
        "context_approval_required",
        `Context publication requires exact approval text: ${CONTEXT_APPROVAL_PHRASE}`,
        403,
      );
    }
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "publish_context",
        request.idempotency_key,
        request,
        async () => {
          await this.#lockAggregate(
            client,
            binding,
            "context",
            "published",
          );
          const currentResult = await client.query(
            `SELECT published_context_revision
               FROM marketing_os_context_snapshots
              ORDER BY published_context_revision DESC
              LIMIT 1
              FOR UPDATE`,
          );
          const current =
            currentResult.rows[0]?.published_context_revision ?? null;
          const expected = request.expected_current_revision ?? null;
          if (
            (current === null ? null : Number(current)) !==
            (expected === null ? null : Number(expected))
          ) {
            throw new StateContractError(
              "context_revision_conflict",
              `Expected current context revision ${expected ?? "null"}, found ${current ?? "null"}.`,
              409,
            );
          }

          const artifactId = uuid(request.artifact_id, "artifact_id");
          const artifactRevision = positiveInteger(
            request.artifact_revision,
            "artifact_revision",
          );
          const artifactResult = await client.query(
            `SELECT status
               FROM marketing_os_artifacts
              WHERE artifact_id = $1 AND revision = $2
              FOR UPDATE`,
            [artifactId, artifactRevision],
          );
          if (!artifactResult.rows[0]) {
            throw new StateContractError(
              "artifact_revision_not_found",
              "Artifact revision was not found.",
              404,
            );
          }
          if (artifactResult.rows[0].status !== "approved") {
            throw new StateContractError(
              "approved_artifact_required",
              "Context publication requires an approved artifact revision.",
              409,
            );
          }

          const publication = typeof publisher === "function"
            ? await publisher({ tenant: binding, request })
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
          const nextRevision = Number(current ?? 0) + 1;
          const approvalId = crypto.randomUUID();
          const actor = requiredString(request.actor, "actor");
          const timestamp = this.#clock();
          await client.query(
            `INSERT INTO marketing_os_approvals (
               organization_id, workspace_id, approval_id, approval_type,
               actor, approved_at, artifact_id, artifact_revision,
               exact_approval_text
             ) VALUES ($1,$2,$3,'context_publish',$4,$5,$6,$7,$8)`,
            [
              binding.organization_id,
              binding.workspace_id,
              approvalId,
              actor,
              timestamp,
              artifactId,
              artifactRevision,
              request.approval_text,
            ],
          );
          const inserted = await client.query(
            `INSERT INTO marketing_os_context_snapshots (
               organization_id, workspace_id, published_context_revision,
               guild_context_id, compiled_brief, readiness, source_references,
               freshness, artifact_id, artifact_revision, approval_id,
               rollback_context_id, published_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [
              binding.organization_id,
              binding.workspace_id,
              nextRevision,
              publication?.guild_context_id ?? null,
              requiredString(request.compiled_brief, "compiled_brief"),
              request.readiness ?? "ready",
              json(request.source_references ?? []),
              json(request.freshness ?? {}),
              artifactId,
              artifactRevision,
              approvalId,
              publication?.rollback_context_id ?? null,
              timestamp,
            ],
          );
          await this.#audit(client, binding, "context.published", actor, {
            context_revision: nextRevision,
            artifact_id: artifactId,
            artifact_revision: artifactRevision,
            approval_id: approvalId,
          });
          const approval = {
            approval_id: approvalId,
            type: "context_publish",
            actor,
            timestamp,
            artifact_id: artifactId,
            artifact_revision: artifactRevision,
            exact_approval_text: request.approval_text,
          };
          return {
            ...contextSnapshot(inserted.rows[0], binding),
            approval,
          };
        },
      ),
    );
  }

  async storeSource(tenant, request) {
    const binding = assertTenant(tenant);
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "source_store",
        request.idempotency_key,
        request,
        async () => {
          const sourceId = request.source_id
            ? uuid(request.source_id, "source_id")
            : crypto.randomUUID();
          const existing = await client.query(
            `SELECT 1 FROM marketing_os_sources WHERE source_id = $1 LIMIT 1`,
            [sourceId],
          );
          if (existing.rows[0]) {
            throw new StateContractError(
              "source_exists",
              "Source already exists.",
              409,
            );
          }
          const revision = 1;
          const rawSource = requiredString(request.raw_source, "raw_source");
          const encrypted = await this.#encryption.encrypt(
            rawSource,
            sourceAssociatedData(binding, sourceId, revision),
          );
          const timestamp = this.#clock();
          const inserted = await client.query(
            `INSERT INTO marketing_os_sources (
               organization_id, workspace_id, source_id, revision, evidence,
               provenance, uploader, ciphertext, initialization_vector,
               authentication_tag, wrapped_key_reference, created_at, updated_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
             RETURNING *`,
            [
              binding.organization_id,
              binding.workspace_id,
              sourceId,
              revision,
              json(
                evidenceEntry(
                  request.evidence ?? { mode: "source_supplied" },
                ),
              ),
              json(
                request.provenance &&
                  typeof request.provenance === "object"
                  ? request.provenance
                  : {},
              ),
              requiredString(request.uploader, "uploader"),
              encrypted.ciphertext,
              encrypted.initialization_vector,
              encrypted.authentication_tag,
              requiredString(
                encrypted.wrapped_key_reference,
                "wrapped_key_reference",
              ),
              timestamp,
            ],
          );
          await this.#audit(
            client,
            binding,
            "source.stored",
            request.actor ?? request.uploader,
            { source_id: sourceId, revision },
          );
          return publicSource(inserted.rows[0]);
        },
      ),
    );
  }

  async reviseSource(tenant, request) {
    const binding = assertTenant(tenant);
    const sourceId = uuid(request.source_id, "source_id");
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "source_revise",
        request.idempotency_key,
        request,
        async () => {
          await this.#lockAggregate(
            client,
            binding,
            "source",
            sourceId,
          );
          const currentResult = await client.query(
            `SELECT *
               FROM marketing_os_sources
              WHERE source_id = $1
              ORDER BY revision DESC
              LIMIT 1
              FOR UPDATE`,
            [sourceId],
          );
          const current = currentResult.rows[0];
          if (!current) {
            throw new StateContractError(
              "source_not_found",
              "Source was not found.",
              404,
            );
          }
          expectRevision(
            Number(current.revision),
            request.expected_revision,
          );
          if (current.deletion_state === "deleted") {
            throw new StateContractError(
              "source_deleted",
              "A deleted source cannot be revised.",
              410,
            );
          }
          const revision = Number(current.revision) + 1;
          const rawSource = requiredString(
            request.raw_source,
            "raw_source",
          );
          const encrypted = await this.#encryption.encrypt(
            rawSource,
            sourceAssociatedData(binding, sourceId, revision),
          );
          const timestamp = this.#clock();
          const inserted = await client.query(
            `INSERT INTO marketing_os_sources (
               organization_id, workspace_id, source_id, revision, evidence,
               provenance, uploader, ciphertext, initialization_vector,
               authentication_tag, wrapped_key_reference, created_at, updated_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
             RETURNING *`,
            [
              binding.organization_id,
              binding.workspace_id,
              sourceId,
              revision,
              json(
                evidenceEntry(
                  request.evidence ?? current.evidence,
                ),
              ),
              json(
                request.provenance &&
                  typeof request.provenance === "object"
                  ? request.provenance
                  : current.provenance,
              ),
              requiredString(request.uploader, "uploader"),
              encrypted.ciphertext,
              encrypted.initialization_vector,
              encrypted.authentication_tag,
              requiredString(
                encrypted.wrapped_key_reference,
                "wrapped_key_reference",
              ),
              timestamp,
            ],
          );
          await this.#audit(
            client,
            binding,
            "source.revised",
            request.actor ?? request.uploader,
            {
              source_id: sourceId,
              revision,
              previous_revision: Number(current.revision),
            },
          );
          return publicSource(inserted.rows[0]);
        },
      ),
    );
  }

  async getSource(tenant, sourceId, revision) {
    const binding = assertTenant(tenant);
    const id = uuid(sourceId, "source_id");
    const parameters = [id];
    let revisionClause = "";
    if (revision !== undefined) {
      parameters.push(positiveInteger(revision, "revision"));
      revisionClause = "AND revision = $2";
    }
    const record = await this.#transaction(
      binding,
      { createTenant: false },
      async (client) => {
        const result = await client.query(
          `SELECT *
             FROM marketing_os_sources
            WHERE source_id = $1 ${revisionClause}
            ORDER BY revision DESC
            LIMIT 1`,
          parameters,
        );
        if (!result.rows[0]) {
          throw new StateContractError(
            revision === undefined
              ? "source_not_found"
              : "source_revision_not_found",
            revision === undefined
              ? "Source was not found."
              : "Source revision was not found.",
            404,
          );
        }
        return result.rows[0];
      },
    );
    const safe = publicSource(record);
    if (record.deletion_state !== "retained") return safe;
    return {
      ...safe,
      raw_source: await this.#encryption.decrypt(
        encryptedSource(record),
        sourceAssociatedData(binding, id, Number(record.revision)),
      ),
    };
  }

  async deleteSource(tenant, request) {
    const binding = assertTenant(tenant);
    const sourceId = uuid(request.source_id, "source_id");
    if (request.confirmation_text !== `delete source ${sourceId}`) {
      throw new StateContractError(
        "source_delete_confirmation_required",
        `Type exactly: delete source ${sourceId}`,
        403,
      );
    }
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "source_delete",
        request.idempotency_key,
        request,
        async () => {
          await this.#lockAggregate(
            client,
            binding,
            "source",
            sourceId,
          );
          const revisions = await client.query(
            `SELECT *
               FROM marketing_os_sources
              WHERE source_id = $1
              ORDER BY revision
              FOR UPDATE`,
            [sourceId],
          );
          if (!revisions.rows[0]) {
            throw new StateContractError(
              "source_not_found",
              "Source was not found.",
              404,
            );
          }
          if (
            revisions.rows.every(
              (record) => record.deletion_state === "deleted",
            )
          ) {
            return publicSource(revisions.rows.at(-1));
          }
          const timestamp = this.#clock();
          await client.query(
            `UPDATE marketing_os_sources
                SET ciphertext = NULL,
                    initialization_vector = NULL,
                    authentication_tag = NULL,
                    wrapped_key_reference = NULL,
                    deletion_state = 'deleted',
                    deleted_at = $2,
                    updated_at = $2
              WHERE source_id = $1`,
            [sourceId, timestamp],
          );
          await this.#audit(
            client,
            binding,
            "source.deleted",
            request.actor,
            {
              source_id: sourceId,
              revisions_deleted: revisions.rows.length,
            },
          );
          return publicSource({
            ...revisions.rows.at(-1),
            ciphertext: null,
            initialization_vector: null,
            authentication_tag: null,
            wrapped_key_reference: null,
            deletion_state: "deleted",
            deleted_at: timestamp,
            updated_at: timestamp,
          });
        },
      ),
    );
  }

  async storeArtifact(tenant, request) {
    const binding = assertTenant(tenant);
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "artifact_store",
        request.idempotency_key,
        request,
        async () => {
          const artifactId = request.artifact_id
            ? uuid(request.artifact_id, "artifact_id")
            : crypto.randomUUID();
          const existing = await client.query(
            `SELECT 1 FROM marketing_os_artifacts WHERE artifact_id = $1 LIMIT 1`,
            [artifactId],
          );
          if (existing.rows[0]) {
            throw new StateContractError(
              "artifact_exists",
              "Artifact already exists.",
              409,
            );
          }
          const input = artifactRevisionInput(request);
          const timestamp = this.#clock();
          const inserted = await insertArtifactRevision(
            client,
            binding,
            artifactId,
            1,
            input,
            timestamp,
          );
          await this.#audit(
            client,
            binding,
            "artifact.stored",
            request.actor,
            {
              artifact_id: artifactId,
              revision: 1,
              status: input.status,
            },
          );
          return artifactRecord(inserted, []);
        },
      ),
    );
  }

  async getArtifact(tenant, artifactId, revision) {
    const binding = assertTenant(tenant);
    const id = uuid(artifactId, "artifact_id");
    return this.#transaction(binding, { createTenant: false }, async (client) =>
      this.#readArtifact(client, id, revision),
    );
  }

  async reviseArtifact(tenant, request) {
    const binding = assertTenant(tenant);
    const artifactId = uuid(request.artifact_id, "artifact_id");
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "artifact_revise",
        request.idempotency_key,
        request,
        async () => {
          await this.#lockAggregate(
            client,
            binding,
            "artifact",
            artifactId,
          );
          const currentResult = await client.query(
            `SELECT *
               FROM marketing_os_artifacts
              WHERE artifact_id = $1
              ORDER BY revision DESC
              LIMIT 1
              FOR UPDATE`,
            [artifactId],
          );
          const current = currentResult.rows[0];
          if (!current) {
            throw new StateContractError(
              "artifact_not_found",
              "Artifact was not found.",
              404,
            );
          }
          expectRevision(Number(current.revision), request.expected_revision);
          const timestamp = this.#clock();
          if (current.status === "approved") {
            await client.query(
              `UPDATE marketing_os_artifacts
                  SET status = 'superseded', updated_at = $3
                WHERE artifact_id = $1 AND revision = $2`,
              [artifactId, current.revision, timestamp],
            );
          }
          const input = artifactRevisionInput(request);
          const revision = Number(current.revision) + 1;
          const inserted = await insertArtifactRevision(
            client,
            binding,
            artifactId,
            revision,
            { ...input, approvals: [] },
            timestamp,
          );
          await this.#audit(
            client,
            binding,
            "artifact.revised",
            request.actor,
            {
              artifact_id: artifactId,
              revision,
              previous_revision: Number(current.revision),
            },
          );
          return artifactRecord(inserted, []);
        },
      ),
    );
  }

  async setArtifactStatus(tenant, request) {
    const binding = assertTenant(tenant);
    const artifactId = uuid(request.artifact_id, "artifact_id");
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "artifact_status",
        request.idempotency_key,
        request,
        async () => {
          await this.#lockAggregate(
            client,
            binding,
            "artifact",
            artifactId,
          );
          const revision = positiveInteger(request.revision, "revision");
          const currentResult = await client.query(
            `SELECT *
               FROM marketing_os_artifacts
              WHERE artifact_id = $1 AND revision = $2
              FOR UPDATE`,
            [artifactId, revision],
          );
          const current = currentResult.rows[0];
          if (!current) {
            throw new StateContractError(
              "artifact_revision_not_found",
              "Artifact revision was not found.",
              404,
            );
          }
          expectRevision(Number(current.revision), request.expected_revision);
          if (!ARTIFACT_STATUSES.includes(request.status)) {
            throw new StateContractError(
              "invalid_artifact_status",
              "Artifact status is invalid.",
            );
          }
          if (!artifactTransitions[current.status].has(request.status)) {
            throw new StateContractError(
              "invalid_artifact_transition",
              `Cannot transition ${current.status} to ${request.status}.`,
              409,
            );
          }
          const timestamp = this.#clock();
          const updated = await client.query(
            `UPDATE marketing_os_artifacts
                SET status = $3, updated_at = $4
              WHERE artifact_id = $1 AND revision = $2
              RETURNING *`,
            [artifactId, revision, request.status, timestamp],
          );
          const approvals = await readApprovals(
            client,
            artifactId,
            revision,
          );
          await this.#audit(
            client,
            binding,
            "artifact.status_changed",
            request.actor,
            {
              artifact_id: artifactId,
              revision,
              from: current.status,
              to: request.status,
            },
          );
          return artifactRecord(updated.rows[0], approvals);
        },
      ),
    );
  }

  async approveArtifact(tenant, request) {
    const binding = assertTenant(tenant);
    const artifactId = uuid(request.artifact_id, "artifact_id");
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "artifact_approve",
        request.idempotency_key,
        request,
        async () => {
          await this.#lockAggregate(
            client,
            binding,
            "artifact",
            artifactId,
          );
          const revision = positiveInteger(request.revision, "revision");
          const currentResult = await client.query(
            `SELECT *
               FROM marketing_os_artifacts
              WHERE artifact_id = $1 AND revision = $2
              FOR UPDATE`,
            [artifactId, revision],
          );
          const current = currentResult.rows[0];
          if (!current) {
            throw new StateContractError(
              "artifact_revision_not_found",
              "Artifact revision was not found.",
              404,
            );
          }
          expectRevision(Number(current.revision), request.expected_revision);
          if (current.status !== "ready_for_review") {
            throw new StateContractError(
              "artifact_not_review_ready",
              "Only a ready_for_review artifact can be approved.",
              409,
            );
          }
          const approvalId = crypto.randomUUID();
          const actor = requiredString(request.actor, "actor");
          const timestamp = this.#clock();
          await client.query(
            `INSERT INTO marketing_os_approvals (
               organization_id, workspace_id, approval_id, approval_type,
               actor, approved_at, artifact_id, artifact_revision,
               exact_approval_text
             ) VALUES ($1,$2,$3,'artifact',$4,$5,$6,$7,$8)`,
            [
              binding.organization_id,
              binding.workspace_id,
              approvalId,
              actor,
              timestamp,
              artifactId,
              revision,
              requiredString(request.approval_text, "approval_text"),
            ],
          );
          const updated = await client.query(
            `UPDATE marketing_os_artifacts
                SET status = 'approved', updated_at = $3
              WHERE artifact_id = $1 AND revision = $2
              RETURNING *`,
            [artifactId, revision, timestamp],
          );
          const approvals = await readApprovals(
            client,
            artifactId,
            revision,
          );
          await this.#audit(
            client,
            binding,
            "artifact.approved",
            actor,
            {
              artifact_id: artifactId,
              revision,
              approval_id: approvalId,
            },
          );
          return artifactRecord(updated.rows[0], approvals);
        },
      ),
    );
  }

  async readWorkstream(tenant, specialist) {
    const binding = assertTenant(tenant);
    const name = requiredString(specialist, "specialist");
    return this.#transaction(binding, { createTenant: false }, async (client) => {
      const result = await client.query(
        `SELECT * FROM marketing_os_workstreams WHERE specialist = $1`,
        [name],
      );
      return result.rows[0] ? workstreamRecord(result.rows[0]) : undefined;
    });
  }

  async updateWorkstream(tenant, request) {
    const binding = assertTenant(tenant);
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "workstream_update",
        request.idempotency_key,
        request,
        async () => {
          const input = workstreamInput(request);
          await this.#lockAggregate(
            client,
            binding,
            "workstream",
            input.specialist,
          );
          const currentResult = await client.query(
            `SELECT *
               FROM marketing_os_workstreams
              WHERE specialist = $1
              FOR UPDATE`,
            [input.specialist],
          );
          const current = currentResult.rows[0];
          const currentRevision = Number(current?.revision ?? 0);
          expectRevision(currentRevision, request.expected_revision);
          const revision = currentRevision + 1;
          const timestamp = this.#clock();
          const result = await client.query(
            `INSERT INTO marketing_os_workstreams (
               organization_id, workspace_id, specialist, revision, status,
               latest_artifact_id, latest_artifact_revision, blockers,
               next_action, handoff_id, updated_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (organization_id, workspace_id, specialist)
             DO UPDATE SET
               revision = EXCLUDED.revision,
               status = EXCLUDED.status,
               latest_artifact_id = EXCLUDED.latest_artifact_id,
               latest_artifact_revision = EXCLUDED.latest_artifact_revision,
               blockers = EXCLUDED.blockers,
               next_action = EXCLUDED.next_action,
               handoff_id = EXCLUDED.handoff_id,
               updated_at = EXCLUDED.updated_at
             RETURNING *`,
            [
              binding.organization_id,
              binding.workspace_id,
              input.specialist,
              revision,
              input.status,
              input.latest_artifact_id
                ? uuid(input.latest_artifact_id, "latest_artifact_id")
                : null,
              input.latest_artifact_revision ?? null,
              json(input.blockers),
              input.next_action ?? null,
              input.handoff_id
                ? uuid(input.handoff_id, "handoff_id")
                : null,
              timestamp,
            ],
          );
          await this.#audit(
            client,
            binding,
            "workstream.updated",
            request.actor,
            {
              specialist: input.specialist,
              revision,
              status: input.status,
            },
          );
          return workstreamRecord(result.rows[0]);
        },
      ),
    );
  }

  async createHandoff(tenant, request) {
    const binding = assertTenant(tenant);
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "handoff_create",
        request.idempotency_key,
        request,
        async () => {
          const handoffId = request.handoff_id
            ? uuid(request.handoff_id, "handoff_id")
            : crypto.randomUUID();
          const existing = await client.query(
            `SELECT 1 FROM marketing_os_handoffs WHERE handoff_id = $1`,
            [handoffId],
          );
          if (existing.rows[0]) {
            throw new StateContractError(
              "handoff_exists",
              "Handoff already exists.",
              409,
            );
          }
          const timestamp = this.#clock();
          const result = await client.query(
            `INSERT INTO marketing_os_handoffs (
               organization_id, workspace_id, handoff_id, revision,
               source_agent, target_agent, artifact_references,
               context_revision, rationale, completion_state,
               created_at, updated_at
             ) VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10,$10)
             RETURNING *`,
            [
              binding.organization_id,
              binding.workspace_id,
              handoffId,
              requiredString(request.source_agent, "source_agent"),
              requiredString(request.target_agent, "target_agent"),
              json(
                Array.isArray(request.artifact_references)
                  ? request.artifact_references
                  : [],
              ),
              request.context_revision ?? null,
              requiredString(request.rationale, "rationale"),
              handoffCompletionState(request.completion_state),
              timestamp,
            ],
          );
          await this.#audit(
            client,
            binding,
            "handoff.created",
            request.actor,
            {
              handoff_id: handoffId,
              target_agent: request.target_agent,
            },
          );
          return handoffRecord(result.rows[0]);
        },
      ),
    );
  }

  async updateHandoff(tenant, request) {
    const binding = assertTenant(tenant);
    const handoffId = uuid(request.handoff_id, "handoff_id");
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "handoff_update",
        request.idempotency_key,
        request,
        async () => {
          const currentResult = await client.query(
            `SELECT *
               FROM marketing_os_handoffs
              WHERE handoff_id = $1
              FOR UPDATE`,
            [handoffId],
          );
          const current = currentResult.rows[0];
          if (!current) {
            throw new StateContractError(
              "handoff_not_found",
              "Handoff was not found.",
              404,
            );
          }
          expectRevision(Number(current.revision), request.expected_revision);
          const revision = Number(current.revision) + 1;
          const timestamp = this.#clock();
          const result = await client.query(
            `UPDATE marketing_os_handoffs
                SET revision = $2,
                    completion_state = $3,
                    updated_at = $4
              WHERE handoff_id = $1
              RETURNING *`,
            [
              handoffId,
              revision,
              handoffCompletionState(request.completion_state),
              timestamp,
            ],
          );
          await this.#audit(
            client,
            binding,
            "handoff.updated",
            request.actor,
            {
              handoff_id: handoffId,
              revision,
              completion_state: request.completion_state,
            },
          );
          return handoffRecord(result.rows[0]);
        },
      ),
    );
  }

  async createWorkflowRun(tenant, request) {
    const binding = assertTenant(tenant);
    const input = workflowRunInput(request);
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        "workflow_run_create",
        request.idempotency_key,
        request,
        async () => {
          const runId = request.run_id
            ? uuid(request.run_id, "run_id")
            : crypto.randomUUID();
          const existing = await client.query(
            `SELECT 1 FROM marketing_os_workflow_runs WHERE run_id = $1`,
            [runId],
          );
          if (existing.rows[0]) {
            throw new StateContractError(
              "workflow_run_exists",
              "Workflow run already exists.",
              409,
            );
          }
          const timestamp = this.#clock();
          const result = await client.query(
            `INSERT INTO marketing_os_workflow_runs (
               organization_id, workspace_id, run_id, revision, route,
               specialist, context_revision, package_name, package_version,
               input_envelope, status, blockers, next_action,
               created_at, updated_at
             ) VALUES (
               $1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13
             )
             RETURNING *`,
            [
              binding.organization_id,
              binding.workspace_id,
              runId,
              input.route,
              input.specialist,
              input.context_revision ?? null,
              input.package_name,
              input.package_version,
              json(input.input_envelope),
              input.status,
              json(input.blockers),
              input.next_action ?? null,
              timestamp,
            ],
          );
          await this.#audit(
            client,
            binding,
            "workflow_run.created",
            request.actor,
            {
              run_id: runId,
              route: input.route,
              specialist: input.specialist,
              package_name: input.package_name,
              package_version: input.package_version,
              context_revision: input.context_revision ?? null,
              input_envelope_hash: stableHash(input.input_envelope),
            },
          );
          return workflowRunRecord(result.rows[0], []);
        },
      ),
    );
  }

  async getWorkflowRun(tenant, runId) {
    const binding = assertTenant(tenant);
    const id = uuid(runId, "run_id");
    return this.#transaction(binding, { createTenant: false }, async (client) => {
      const result = await client.query(
        `SELECT * FROM marketing_os_workflow_runs WHERE run_id = $1`,
        [id],
      );
      if (!result.rows[0]) {
        throw new StateContractError(
          "workflow_run_not_found",
          "Workflow run was not found.",
          404,
        );
      }
      return workflowRunRecord(
        result.rows[0],
        await readWorkflowAttempts(client, id),
      );
    });
  }

  async listWorkflowRuns(tenant) {
    const binding = assertTenant(tenant);
    return this.#transaction(binding, { createTenant: false }, async (client) => {
      const result = await client.query(
        `SELECT *
           FROM marketing_os_workflow_runs
          ORDER BY updated_at DESC, run_id`,
      );
      const records = [];
      for (const row of result.rows) {
        records.push(
          workflowRunRecord(
            row,
            await readWorkflowAttempts(client, row.run_id),
          ),
        );
      }
      return records;
    });
  }

  async recordWorkflowAttempt(tenant, request) {
    const binding = assertTenant(tenant);
    const runId = uuid(request.run_id, "run_id");
    const input = workflowAttemptInput(request);
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        `workflow_attempt_record:${runId}`,
        request.idempotency_key,
        request,
        async () => {
          await this.#lockAggregate(
            client,
            binding,
            "workflow_run",
            runId,
          );
          const runResult = await client.query(
            `SELECT *
               FROM marketing_os_workflow_runs
              WHERE run_id = $1
              FOR UPDATE`,
            [runId],
          );
          const run = runResult.rows[0];
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
          if (input.attempt_kind === "format_repair") {
            const first = await client.query(
              `SELECT status
                 FROM marketing_os_workflow_attempts
                WHERE run_id = $1 AND attempt_number = 1`,
              [runId],
            );
            if (
              !first.rows[0] ||
              first.rows[0].status !== "format_invalid"
            ) {
              throw new StateContractError(
                "workflow_format_repair_not_allowed",
                "Format repair is allowed only after a format-invalid initial attempt.",
                409,
              );
            }
          }
          const timestamp = this.#clock();
          const result = await client.query(
            `INSERT INTO marketing_os_workflow_attempts (
               organization_id, workspace_id, run_id, attempt_number,
               attempt_kind, package_name, package_version, context_revision,
               input_envelope, output_body, validation_errors, status,
               error_code, error_message, created_at
             ) VALUES (
               $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
             )
             RETURNING *`,
            [
              binding.organization_id,
              binding.workspace_id,
              runId,
              input.attempt_number,
              input.attempt_kind,
              input.package_name,
              input.package_version,
              input.context_revision ?? null,
              json(input.input_envelope),
              input.output_body ?? null,
              json(input.validation_errors),
              input.status,
              input.error_code ?? null,
              input.error_message ?? null,
              timestamp,
            ],
          );
          const attempt = workflowAttemptRecord(result.rows[0]);
          await client.query(
            `UPDATE marketing_os_workflow_runs
                SET updated_at = $2
              WHERE run_id = $1`,
            [runId, timestamp],
          );
          await this.#audit(
            client,
            binding,
            "workflow_run.attempt_recorded",
            request.actor,
            {
              run_id: runId,
              attempt_number: input.attempt_number,
              attempt_kind: input.attempt_kind,
              status: input.status,
              validation_errors: input.validation_errors,
              error_code: input.error_code ?? null,
              attempt_hash: stableHash(attempt),
            },
          );
          return attempt;
        },
      ),
    );
  }

  async updateWorkflowRun(tenant, request) {
    const binding = assertTenant(tenant);
    const runId = uuid(request.run_id, "run_id");
    const input = workflowRunUpdateInput(request);
    return this.#transaction(binding, { createTenant: true }, async (client) =>
      this.#idempotent(
        client,
        binding,
        `workflow_run_update:${runId}`,
        request.idempotency_key,
        request,
        async () => {
          await this.#lockAggregate(
            client,
            binding,
            "workflow_run",
            runId,
          );
          const currentResult = await client.query(
            `SELECT *
               FROM marketing_os_workflow_runs
              WHERE run_id = $1
              FOR UPDATE`,
            [runId],
          );
          const current = currentResult.rows[0];
          if (!current) {
            throw new StateContractError(
              "workflow_run_not_found",
              "Workflow run was not found.",
              404,
            );
          }
          expectRevision(
            Number(current.revision),
            request.expected_revision,
          );
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
          if (["ready_for_review", "approved"].includes(input.status)) {
            const finalAttempt = await client.query(
              `SELECT status
                 FROM marketing_os_workflow_attempts
                WHERE run_id = $1
                ORDER BY attempt_number DESC
                LIMIT 1`,
              [runId],
            );
            if (finalAttempt.rows[0]?.status !== "succeeded") {
              throw new StateContractError(
                "successful_workflow_attempt_required",
                `${input.status} workflow runs require a succeeded final attempt.`,
                409,
              );
            }
            const artifact = await client.query(
              `SELECT status
                 FROM marketing_os_artifacts
                WHERE artifact_id = $1 AND revision = $2`,
              [
                uuid(input.artifact_id, "artifact_id"),
                input.artifact_revision,
              ],
            );
            if (!artifact.rows[0]) {
              throw new StateContractError(
                "artifact_revision_not_found",
                "Artifact revision was not found.",
                404,
              );
            }
            if (
              (input.status === "ready_for_review" &&
                !["ready_for_review", "approved"].includes(
                  artifact.rows[0].status,
                )) ||
              (input.status === "approved" &&
                artifact.rows[0].status !== "approved")
            ) {
              throw new StateContractError(
                "workflow_run_artifact_status_mismatch",
                input.status === "approved"
                  ? "An approved workflow run requires an approved artifact."
                  : "A review-ready workflow run requires a review-ready or approved artifact.",
                409,
              );
            }
          }
          const revision = Number(current.revision) + 1;
          const timestamp = this.#clock();
          const result = await client.query(
            `UPDATE marketing_os_workflow_runs
                SET revision = $2,
                    status = $3,
                    artifact_id = $4,
                    artifact_revision = $5,
                    handoff_id = $6,
                    blockers = $7,
                    next_action = $8,
                    error_summary = $9,
                    updated_at = $10
              WHERE run_id = $1
              RETURNING *`,
            [
              runId,
              revision,
              input.status,
              input.artifact_id
                ? uuid(input.artifact_id, "artifact_id")
                : null,
              input.artifact_revision ?? null,
              input.handoff_id
                ? uuid(input.handoff_id, "handoff_id")
                : null,
              json(input.blockers),
              input.next_action ?? null,
              input.error_summary ?? null,
              timestamp,
            ],
          );
          await this.#audit(
            client,
            binding,
            "workflow_run.updated",
            request.actor,
            {
              run_id: runId,
              revision,
              from: current.status,
              to: input.status,
              artifact_id: input.artifact_id ?? null,
              artifact_revision: input.artifact_revision ?? null,
              handoff_id: input.handoff_id ?? null,
            },
          );
          return workflowRunRecord(
            result.rows[0],
            await readWorkflowAttempts(client, runId),
          );
        },
      ),
    );
  }

  async getAuditTrail(tenant) {
    const binding = assertTenant(tenant);
    return this.#transaction(binding, { createTenant: false }, async (client) => {
      const result = await client.query(
        `SELECT *
           FROM marketing_os_audit
          ORDER BY sequence ASC`,
      );
      return result.rows.map((row) => auditRecord(row, binding));
    });
  }

  async exportWorkspace(tenant) {
    const binding = assertTenant(tenant);
    const exported = await this.#transaction(
      binding,
      { createTenant: false },
      async (client) => {
        const context = await client.query(
          `SELECT *
             FROM marketing_os_context_snapshots
            ORDER BY published_context_revision DESC
            LIMIT 1`,
        );
        const sources = await client.query(
          `SELECT *
             FROM marketing_os_sources
            ORDER BY source_id, revision`,
        );
        const artifacts = await client.query(
          `SELECT *
             FROM marketing_os_artifacts
            ORDER BY artifact_id, revision`,
        );
        const approvals = await client.query(
          `SELECT *
             FROM marketing_os_approvals
            ORDER BY approved_at, approval_id`,
        );
        const workstreams = await client.query(
          `SELECT *
             FROM marketing_os_workstreams
            ORDER BY specialist`,
        );
        const handoffs = await client.query(
          `SELECT *
             FROM marketing_os_handoffs
            ORDER BY created_at, handoff_id`,
        );
        const workflowRuns = await client.query(
          `SELECT *
             FROM marketing_os_workflow_runs
            ORDER BY created_at, run_id`,
        );
        const workflowAttempts = await client.query(
          `SELECT *
             FROM marketing_os_workflow_attempts
            ORDER BY run_id, attempt_number`,
        );
        const audit = await client.query(
          `SELECT *
             FROM marketing_os_audit
            ORDER BY sequence`,
        );
        return {
          context: context.rows[0],
          sources: sources.rows,
          artifacts: artifacts.rows,
          approvals: approvals.rows,
          workstreams: workstreams.rows,
          handoffs: handoffs.rows,
          workflowRuns: workflowRuns.rows,
          workflowAttempts: workflowAttempts.rows,
          audit: audit.rows,
        };
      },
    );

    const sources = [];
    for (const source of exported.sources) {
      const safe = publicSource(source);
      sources.push(
        source.deletion_state === "retained"
          ? {
              ...safe,
              raw_source: await this.#encryption.decrypt(
                encryptedSource(source),
                sourceAssociatedData(
                  binding,
                  source.source_id,
                  Number(source.revision),
                ),
              ),
            }
          : safe,
      );
    }
    const approvalsByArtifact = new Map();
    for (const approval of exported.approvals) {
      const key = `${approval.artifact_id}:${approval.artifact_revision}`;
      const values = approvalsByArtifact.get(key) ?? [];
      values.push(approvalRecord(approval));
      approvalsByArtifact.set(key, values);
    }
    return {
      schema_version: "1.0",
      exported_at: this.#clock(),
      tenant: binding,
      context_snapshot: exported.context
        ? contextSnapshot(exported.context, binding)
        : null,
      sources,
      artifacts: exported.artifacts.map((row) =>
        artifactRecord(
          row,
          approvalsByArtifact.get(
            `${row.artifact_id}:${row.revision}`,
          ) ?? [],
        ),
      ),
      workstreams: exported.workstreams.map(workstreamRecord),
      handoffs: exported.handoffs.map(handoffRecord),
      workflow_runs: exported.workflowRuns.map((row) =>
        workflowRunRecord(
          row,
          exported.workflowAttempts
            .filter((attempt) => attempt.run_id === row.run_id)
            .map(workflowAttemptRecord),
        ),
      ),
      approvals: exported.approvals.map(approvalRecord),
      audit: exported.audit.map((row) => auditRecord(row, binding)),
    };
  }

  async deleteWorkspace(tenant, request) {
    const binding = assertTenant(tenant);
    if (request.confirmation_text !== WORKSPACE_DELETE_PHRASE) {
      throw new StateContractError(
        "workspace_delete_confirmation_required",
        `Type exactly: ${WORKSPACE_DELETE_PHRASE}`,
        403,
      );
    }
    return this.#transaction(
      binding,
      { createTenant: false, permitDeletedTenant: true },
      async (client) => {
        await client.query(
          `SELECT pg_advisory_xact_lock(
             hashtextextended($1, 0)
           )`,
          [`workspace-delete:${binding.organization_id}:${binding.workspace_id}`],
        );
        const tenantResult = await client.query(
          `SELECT deleted_at
             FROM marketing_os_tenants
            WHERE organization_id = $1 AND workspace_id = $2
            FOR UPDATE`,
          [binding.organization_id, binding.workspace_id],
        );
        const existingReceipt = await client.query(
          `SELECT *
             FROM marketing_os_deletion_receipts
            ORDER BY deleted_at DESC
            LIMIT 1`,
        );
        if (tenantResult.rows[0]?.deleted_at && existingReceipt.rows[0]) {
          return deletionReceipt(existingReceipt.rows[0]);
        }

        const counts = {};
        for (const [label, table] of [
          ["sources", "marketing_os_sources"],
          ["artifact_revisions", "marketing_os_artifacts"],
          ["workstreams", "marketing_os_workstreams"],
          ["handoffs", "marketing_os_handoffs"],
          ["workflow_runs", "marketing_os_workflow_runs"],
          ["workflow_attempts", "marketing_os_workflow_attempts"],
          ["approvals", "marketing_os_approvals"],
          ["audit_entries", "marketing_os_audit"],
          ["rate_limit_buckets", "marketing_os_rate_limits"],
        ]) {
          const count = await client.query(
            `SELECT count(*)::integer AS count FROM ${table}`,
          );
          counts[label] = Number(count.rows[0].count);
        }

        const timestamp = this.#clock();
        const finalCounts = {
          ...counts,
          audit_entries: counts.audit_entries + 1,
        };
        await this.#audit(
          client,
          binding,
          "workspace.deleted",
          request.actor,
          { record_counts: finalCounts },
        );
        if (tenantResult.rows[0]) {
          await client.query(
            `UPDATE marketing_os_tenants
                SET deleted_at = $3
              WHERE organization_id = $1 AND workspace_id = $2`,
            [
              binding.organization_id,
              binding.workspace_id,
              timestamp,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO marketing_os_tenants (
               organization_id, workspace_id, deleted_at
             ) VALUES ($1,$2,$3)`,
            [
              binding.organization_id,
              binding.workspace_id,
              timestamp,
            ],
          );
        }

        await client.query(`DELETE FROM marketing_os_context_snapshots`);
        await client.query(`DELETE FROM marketing_os_workflow_attempts`);
        await client.query(`DELETE FROM marketing_os_workflow_runs`);
        await client.query(`DELETE FROM marketing_os_workstreams`);
        await client.query(`DELETE FROM marketing_os_handoffs`);
        await client.query(`DELETE FROM marketing_os_approvals`);
        await client.query(`DELETE FROM marketing_os_artifacts`);
        await client.query(`DELETE FROM marketing_os_sources`);
        await client.query(`DELETE FROM marketing_os_idempotency`);
        await client.query(`DELETE FROM marketing_os_rate_limits`);

        const receiptId = crypto.randomUUID();
        const tenantHash = stableHash(binding);
        const receipt = await client.query(
          `INSERT INTO marketing_os_deletion_receipts (
             organization_id, workspace_id, deletion_receipt_id,
             tenant_hash, record_counts, deleted_at
           ) VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING *`,
          [
            binding.organization_id,
            binding.workspace_id,
            receiptId,
            tenantHash,
            json(finalCounts),
            timestamp,
          ],
        );
        return deletionReceipt(receipt.rows[0]);
      },
    );
  }

  async #readArtifact(client, artifactId, revision) {
    const parameters = [artifactId];
    let revisionClause = "";
    if (revision !== undefined) {
      parameters.push(positiveInteger(revision, "revision"));
      revisionClause = "AND revision = $2";
    }
    const result = await client.query(
      `SELECT *
         FROM marketing_os_artifacts
        WHERE artifact_id = $1 ${revisionClause}
        ORDER BY revision DESC
        LIMIT 1`,
      parameters,
    );
    if (!result.rows[0]) {
      throw new StateContractError(
        revision === undefined
          ? "artifact_not_found"
          : "artifact_revision_not_found",
        revision === undefined
          ? "Artifact was not found."
          : "Artifact revision was not found.",
        404,
      );
    }
    const approvals = await readApprovals(
      client,
      artifactId,
      Number(result.rows[0].revision),
    );
    return artifactRecord(result.rows[0], approvals);
  }

  async #transaction(
    binding,
    { createTenant, permitDeletedTenant = false },
    action,
  ) {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `SELECT
           set_config('app.organization_id', $1, true),
           set_config('app.workspace_id', $2, true)`,
        [binding.organization_id, binding.workspace_id],
      );
      if (createTenant) {
        await client.query(
          `INSERT INTO marketing_os_tenants (organization_id, workspace_id)
           VALUES ($1,$2)
           ON CONFLICT (organization_id, workspace_id) DO NOTHING`,
          [binding.organization_id, binding.workspace_id],
        );
      }
      const tenantResult = await client.query(
        `SELECT deleted_at
           FROM marketing_os_tenants
          WHERE organization_id = $1 AND workspace_id = $2`,
        [binding.organization_id, binding.workspace_id],
      );
      if (
        tenantResult.rows[0]?.deleted_at &&
        !permitDeletedTenant
      ) {
        throw new StateContractError(
          "workspace_deleted",
          "Marketing OS workspace data has been deleted.",
          410,
        );
      }
      const result = await action(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the operation error.
      }
      throw translatePostgresError(error);
    } finally {
      client.release();
    }
  }

  async #idempotent(
    client,
    binding,
    operation,
    idempotencyKey,
    payload,
    action,
  ) {
    const key = requiredString(idempotencyKey, "idempotency_key");
    const requestHash = stableHash(payload);
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [
        `idempotency:${binding.organization_id}:${binding.workspace_id}:${operation}:${key}`,
      ],
    );
    const existing = await client.query(
      `SELECT request_hash, response
         FROM marketing_os_idempotency
        WHERE operation = $1 AND idempotency_key = $2`,
      [operation, key],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].request_hash !== requestHash) {
        throw new StateContractError(
          "idempotency_conflict",
          "The idempotency key was already used with a different request.",
          409,
        );
      }
      return existing.rows[0].response;
    }
    const result = await action();
    await client.query(
      `INSERT INTO marketing_os_idempotency (
         organization_id, workspace_id, operation, idempotency_key,
         request_hash, response
       ) VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        binding.organization_id,
        binding.workspace_id,
        operation,
        key,
        requestHash,
        json(result),
      ],
    );
    return result;
  }

  async #audit(client, binding, eventType, actor, details) {
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`audit:${binding.organization_id}:${binding.workspace_id}`],
    );
    const previous = await client.query(
      `SELECT sequence, entry_hash
         FROM marketing_os_audit
        ORDER BY sequence DESC
        LIMIT 1`,
    );
    const sequence = Number(previous.rows[0]?.sequence ?? 0) + 1;
    const timestamp = this.#clock();
    const entry = {
      sequence,
      tenant: binding,
      event_type: eventType,
      actor: actor ?? null,
      timestamp,
      details,
      previous_hash: previous.rows[0]?.entry_hash ?? null,
    };
    const entryHash = stableHash(entry);
    await client.query(
      `INSERT INTO marketing_os_audit (
         organization_id, workspace_id, sequence, event_type, actor,
         event_data, previous_hash, entry_hash, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        binding.organization_id,
        binding.workspace_id,
        sequence,
        eventType,
        actor ?? null,
        json(details),
        entry.previous_hash,
        entryHash,
        timestamp,
      ],
    );
  }

  async #lockAggregate(client, binding, aggregateType, aggregateId) {
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [
        `aggregate:${binding.organization_id}:${binding.workspace_id}:${aggregateType}:${aggregateId}`,
      ],
    );
  }
}

async function insertArtifactRevision(
  client,
  binding,
  artifactId,
  revision,
  input,
  timestamp,
) {
  const result = await client.query(
    `INSERT INTO marketing_os_artifacts (
       organization_id, workspace_id, artifact_id, revision, artifact_type,
       markdown_body, consumed_context_revision, consumed_source_revisions,
       evidence, status, safety, metadata, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
     RETURNING *`,
    [
      binding.organization_id,
      binding.workspace_id,
      artifactId,
      revision,
      input.artifact_type,
      input.markdown_body,
      input.consumed_context_revision ?? null,
      json(input.consumed_source_revisions),
      json(input.evidence),
      input.status,
      json(input.safety),
      json(input.metadata),
      timestamp,
    ],
  );
  return result.rows[0];
}

async function readApprovals(client, artifactId, revision) {
  const result = await client.query(
    `SELECT *
       FROM marketing_os_approvals
      WHERE artifact_id = $1 AND artifact_revision = $2
      ORDER BY approved_at, approval_id`,
    [artifactId, revision],
  );
  return result.rows.map(approvalRecord);
}

async function readWorkflowAttempts(client, runId) {
  const result = await client.query(
    `SELECT *
       FROM marketing_os_workflow_attempts
      WHERE run_id = $1
      ORDER BY attempt_number`,
    [runId],
  );
  return result.rows.map(workflowAttemptRecord);
}

function contextSnapshot(row, binding) {
  return {
    workspace: binding,
    published_context_revision: Number(row.published_context_revision),
    guild_context_id: row.guild_context_id,
    compiled_brief: row.compiled_brief,
    readiness: row.readiness,
    source_references: row.source_references,
    freshness: row.freshness,
    artifact_id: row.artifact_id,
    artifact_revision: Number(row.artifact_revision),
    rollback_context_id: row.rollback_context_id,
    published_at: timestamp(row.published_at),
  };
}

function publicSource(row) {
  return {
    source_id: row.source_id,
    revision: Number(row.revision),
    evidence: row.evidence,
    provenance: row.provenance,
    uploader: row.uploader,
    deletion_state: row.deletion_state,
    created_at: timestamp(row.created_at),
    updated_at: timestamp(row.updated_at),
    deleted_at: timestamp(row.deleted_at),
  };
}

function encryptedSource(row) {
  return {
    ciphertext: row.ciphertext,
    initialization_vector: row.initialization_vector,
    authentication_tag: row.authentication_tag,
    wrapped_key_reference: row.wrapped_key_reference,
  };
}

function artifactRecord(row, approvals) {
  return {
    artifact_id: row.artifact_id,
    revision: Number(row.revision),
    artifact_type: row.artifact_type,
    markdown_body: row.markdown_body,
    consumed_context_revision: row.consumed_context_revision ?? undefined,
    consumed_source_revisions: row.consumed_source_revisions,
    evidence: row.evidence,
    status: row.status,
    approvals,
    safety: row.safety,
    metadata: row.metadata,
    created_at: timestamp(row.created_at),
    updated_at: timestamp(row.updated_at),
  };
}

function approvalRecord(row) {
  return {
    approval_id: row.approval_id,
    type: row.approval_type,
    actor: row.actor,
    timestamp: timestamp(row.approved_at),
    artifact_id: row.artifact_id,
    artifact_revision: Number(row.artifact_revision),
    exact_approval_text: row.exact_approval_text,
  };
}

function workstreamRecord(row) {
  return {
    specialist: row.specialist,
    revision: Number(row.revision),
    status: row.status,
    latest_artifact_id: row.latest_artifact_id ?? undefined,
    latest_artifact_revision:
      row.latest_artifact_revision === null
        ? undefined
        : Number(row.latest_artifact_revision),
    blockers: row.blockers,
    next_action: row.next_action ?? undefined,
    handoff_id: row.handoff_id ?? undefined,
    updated_at: timestamp(row.updated_at),
  };
}

function handoffRecord(row) {
  return {
    handoff_id: row.handoff_id,
    revision: Number(row.revision),
    source_agent: row.source_agent,
    target_agent: row.target_agent,
    artifact_references: row.artifact_references,
    context_revision: row.context_revision,
    rationale: row.rationale,
    completion_state: row.completion_state,
    created_at: timestamp(row.created_at),
    updated_at: timestamp(row.updated_at),
  };
}

function workflowRunRecord(row, attempts) {
  return {
    run_id: row.run_id,
    revision: Number(row.revision),
    route: row.route,
    specialist: row.specialist,
    context_revision: row.context_revision ?? undefined,
    package_name: row.package_name,
    package_version: row.package_version,
    input_envelope: row.input_envelope,
    status: row.status,
    artifact_id: row.artifact_id ?? undefined,
    artifact_revision:
      row.artifact_revision === null
        ? undefined
        : Number(row.artifact_revision),
    handoff_id: row.handoff_id ?? undefined,
    blockers: row.blockers,
    next_action: row.next_action ?? undefined,
    error_summary: row.error_summary ?? undefined,
    attempts,
    created_at: timestamp(row.created_at),
    updated_at: timestamp(row.updated_at),
  };
}

function workflowAttemptRecord(row) {
  return {
    run_id: row.run_id,
    attempt_number: Number(row.attempt_number),
    attempt_kind: row.attempt_kind,
    package_name: row.package_name,
    package_version: row.package_version,
    context_revision: row.context_revision ?? undefined,
    input_envelope: row.input_envelope,
    output_body: row.output_body ?? undefined,
    validation_errors: row.validation_errors,
    status: row.status,
    error_code: row.error_code ?? undefined,
    error_message: row.error_message ?? undefined,
    created_at: timestamp(row.created_at),
  };
}

function auditRecord(row, binding) {
  return {
    sequence: Number(row.sequence),
    tenant: binding,
    event_type: row.event_type,
    actor: row.actor,
    timestamp: timestamp(row.created_at),
    details: row.event_data,
    previous_hash: row.previous_hash,
    entry_hash: row.entry_hash,
  };
}

function deletionReceipt(row) {
  return {
    deletion_receipt_id: row.deletion_receipt_id,
    tenant_hash: row.tenant_hash,
    deleted_at: timestamp(row.deleted_at),
    record_counts: row.record_counts,
  };
}

function sourceAssociatedData(binding, sourceId, revision) {
  return `${binding.organization_id}:${binding.workspace_id}:${sourceId}:${revision}`;
}

function expectRevision(current, expected) {
  if (!Number.isInteger(expected) || current !== expected) {
    throw new StateContractError(
      "revision_conflict",
      `Expected revision ${expected}, found ${current}.`,
      409,
    );
  }
}

function positiveInteger(value, field) {
  if (!Number.isInteger(value) || value < 1) {
    throw new StateContractError(
      "invalid_request",
      `${field} must be a positive integer.`,
    );
  }
  return value;
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

function uuid(value, field) {
  const normalized = requiredString(value, field);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
  ) {
    throw new StateContractError(
      "invalid_request",
      `${field} must be a UUID.`,
    );
  }
  return normalized;
}

function json(value) {
  return JSON.stringify(value);
}

function timestamp(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function translatePostgresError(error) {
  if (error instanceof StateContractError) return error;
  if (error?.code === "23503") {
    return new StateContractError(
      "referenced_record_not_found",
      "A referenced artifact, approval, or tenant record was not found.",
      409,
    );
  }
  if (error?.code === "23505") {
    return new StateContractError(
      "record_conflict",
      "A state record already exists.",
      409,
    );
  }
  if (
    error?.code === "P0001" &&
    String(error.message).includes(
      "approved artifact requires an approval record",
    )
  ) {
    return new StateContractError(
      "artifact_approval_required",
      "An approved artifact requires a matching approval record.",
      409,
    );
  }
  if (error?.code === "23514") {
    return new StateContractError(
      "database_constraint_rejected",
      "The state change violates a Marketing OS contract.",
      400,
    );
  }
  return error;
}
