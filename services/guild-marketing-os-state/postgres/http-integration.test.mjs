#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import pg from "pg";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import {
  CONTEXT_APPROVAL_PHRASE,
  WORKSPACE_DELETE_PHRASE,
} from "../contracts.mjs";
import { LocalAesEnvelopeEncryption } from "../envelope-encryption.mjs";
import { createMarketingOsStateHandler } from "../http-service.mjs";
import {
  CONTEXT_PUBLISH_SCOPE,
  createGuildJwksIdentityVerifier,
  STATE_SCOPE,
} from "../identity.mjs";
import { PostgresMarketingOsStateAdapter } from "../postgres-adapter.mjs";
import { createNodeServer } from "../server.mjs";
import { migratePostgresSchema } from "./migrate.mjs";

const { Pool } = pg;
const adminUrl = process.env.POSTGRES_TEST_URL;
if (!adminUrl) {
  console.error("POSTGRES_TEST_URL is required.");
  process.exit(2);
}

const roleName = "marketing_os_http_app";
const rolePassword = "marketing_os_http_app_test_password";
const adminPool = new Pool({ connectionString: adminUrl, max: 3 });
let adapter;
let jwksServer;
let stateServer;

try {
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
  `);
  await migratePostgresSchema({
    databaseAdminUrl: adminUrl,
    databaseAppRole: roleName,
  });

  const applicationUrl = new URL(adminUrl);
  applicationUrl.username = roleName;
  applicationUrl.password = rolePassword;
  adapter = new PostgresMarketingOsStateAdapter({
    connectionString: applicationUrl.toString(),
    encryption: new LocalAesEnvelopeEncryption({
      wrappingKey: crypto
        .createHash("sha256")
        .update("postgres-http-integration-key")
        .digest(),
    }),
    poolOptions: { max: 8 },
  });

  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  Object.assign(publicJwk, {
    alg: "RS256",
    kid: "guild-local-integration-key",
    use: "sig",
  });
  jwksServer = http.createServer((request, response) => {
    if (request.url !== "/.well-known/jwks.json") {
      response.statusCode = 404;
      response.end();
      return;
    }
    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.setHeader("cache-control", "no-store");
    response.end(JSON.stringify({ keys: [publicJwk] }));
  });
  const jwksBaseUrl = await listen(jwksServer);
  const issuer = `${jwksBaseUrl}/issuer`;
  const audience = "guild-marketing-os-state-local-acceptance";
  const verifyIdentity = createGuildJwksIdentityVerifier({
    issuer,
    audience,
    jwksUrl: `${jwksBaseUrl}/.well-known/jwks.json`,
    algorithms: ["RS256"],
  });

  let publicationCalls = 0;
  const handler = createMarketingOsStateHandler({
    adapter,
    verifyIdentity,
    checkReady: async () => {
      if (!(await adapter.healthCheck())) throw new Error("not ready");
    },
    contextPublisher: async ({ identity, request }) => {
      publicationCalls += 1;
      assert.equal(identity.tenant.organization_id, "org_http_a");
      assert.equal(identity.tenant.workspace_id, "workspace_http_a");
      assert.equal(request.approval_text, CONTEXT_APPROVAL_PHRASE);
      return {
        guild_context_id: "local-guild-context-1",
        rollback_context_id: "local-guild-context-0",
      };
    },
    rateLimit: { maxRequests: 100, windowSeconds: 60 },
  });
  stateServer = createNodeServer(handler);
  const stateBaseUrl = await listen(stateServer);

  const tokenA = await token({
    privateKey,
    issuer,
    audience,
    organizationId: "org_http_a",
    workspaceId: "workspace_http_a",
    actor: "user_http_a",
    sessionId: "session_http_a",
    taskId: "task_http_a",
    scopes: [STATE_SCOPE],
  });
  const publishTokenA = await token({
    privateKey,
    issuer,
    audience,
    organizationId: "org_http_a",
    workspaceId: "workspace_http_a",
    actor: "user_http_a",
    sessionId: "session_http_a",
    taskId: "task_http_a",
    scopes: [STATE_SCOPE, CONTEXT_PUBLISH_SCOPE],
  });
  const tokenB = await token({
    privateKey,
    issuer,
    audience,
    organizationId: "org_http_b",
    workspaceId: "workspace_http_b",
    actor: "user_http_b",
    sessionId: "session_http_b",
    taskId: "task_http_b",
    scopes: [STATE_SCOPE],
  });
  const wrongAudienceToken = await token({
    privateKey,
    issuer,
    audience: "wrong-audience",
    organizationId: "org_http_a",
    workspaceId: "workspace_http_a",
    actor: "user_http_a",
    sessionId: "session_http_a",
    taskId: "task_http_a",
    scopes: [STATE_SCOPE],
  });

  assert.equal(
    (await request(stateBaseUrl, "GET", "/healthz")).body.status,
    "ok",
  );
  assert.equal(
    (await request(stateBaseUrl, "GET", "/readyz")).body.status,
    "ready",
  );
  assert.equal(
    (await request(stateBaseUrl, "GET", "/v1/context")).response.status,
    401,
  );
  assert.equal(
    (
      await request(
        stateBaseUrl,
        "GET",
        "/v1/context",
        undefined,
        wrongAudienceToken,
      )
    ).response.status,
    401,
  );

  const spoofed = await request(
    stateBaseUrl,
    "POST",
    "/v1/sources",
    {
      organization_id: "org_http_b",
      workspace_id: "workspace_http_b",
      idempotency_key: "http-spoofed-source",
      raw_source: "must not be stored",
    },
    tokenA,
  );
  assert.equal(spoofed.response.status, 403);
  assert.equal(spoofed.body.error.code, "tenant_binding_mismatch");

  const sourceA = await request(
    stateBaseUrl,
    "POST",
    "/v1/sources",
    {
      idempotency_key: "http-source-a",
      raw_source: "HTTP integration confidential source A",
      evidence: {
        mode: "source_supplied",
        source_coverage: ["http-source-a.txt"],
      },
      provenance: { filename: "http-source-a.txt" },
    },
    tokenA,
  );
  assert.equal(sourceA.response.status, 201);
  assert.equal(sourceA.body.data.uploader, "user_http_a");
  assert.equal(
    JSON.stringify(sourceA.body).includes(
      "HTTP integration confidential source A",
    ),
    false,
  );
  const sourceAId = sourceA.body.data.source_id;

  const ciphertext = await adminPool.query(
    `SELECT
       encode(ciphertext, 'hex') AS ciphertext,
       wrapped_key_reference
     FROM marketing_os_sources
     WHERE organization_id = $1
       AND workspace_id = $2
       AND source_id = $3`,
    ["org_http_a", "workspace_http_a", sourceAId],
  );
  assert.equal(ciphertext.rowCount, 1);
  assert.ok(ciphertext.rows[0].ciphertext.length > 20);
  assert.equal(
    ciphertext.rows[0].ciphertext.includes(
      Buffer.from("HTTP integration confidential source A").toString("hex"),
    ),
    false,
  );
  assert.ok(ciphertext.rows[0].wrapped_key_reference);

  const crossTenantRead = await request(
    stateBaseUrl,
    "GET",
    `/v1/sources/${encodeURIComponent(sourceAId)}`,
    undefined,
    tokenB,
  );
  assert.equal(crossTenantRead.response.status, 404);

  const sourceB = await request(
    stateBaseUrl,
    "POST",
    "/v1/sources",
    {
      idempotency_key: "http-source-b",
      raw_source: "HTTP integration confidential source B",
      evidence: { mode: "source_supplied" },
    },
    tokenB,
  );
  assert.equal(sourceB.response.status, 201);

  const workflowRun = await request(
    stateBaseUrl,
    "POST",
    "/v1/runs",
    {
      idempotency_key: "http-run-a",
      route: "messaging",
      specialist: "Messaging",
      context_revision: "1",
      package_name: "publisher~guild-marketing-os-messaging",
      package_version: "1.1.1",
      input_envelope: {
        user_request: "Create answer-ready messaging.",
        context_revision: "1",
      },
    },
    tokenA,
  );
  assert.equal(workflowRun.response.status, 201);
  const runId = workflowRun.body.data.run_id;

  const malformedAttempt = await request(
    stateBaseUrl,
    "POST",
    `/v1/runs/${encodeURIComponent(runId)}/attempts`,
    {
      idempotency_key: "http-run-a-attempt-1",
      attempt_number: 1,
      attempt_kind: "initial",
      package_name: "publisher~guild-marketing-os-messaging",
      package_version: "1.1.1",
      context_revision: "1",
      input_envelope: { prompt: "Create answer-ready messaging." },
      output_body: "# Incomplete messaging",
      validation_errors: ["Missing heading: ## Status Payload"],
      status: "format_invalid",
    },
    tokenA,
  );
  assert.equal(malformedAttempt.response.status, 201);

  const repairedAttempt = await request(
    stateBaseUrl,
    "POST",
    `/v1/runs/${encodeURIComponent(runId)}/attempts`,
    {
      idempotency_key: "http-run-a-attempt-2",
      attempt_number: 2,
      attempt_kind: "format_repair",
      package_name: "publisher~guild-marketing-os-messaging",
      package_version: "1.1.1",
      context_revision: "1",
      input_envelope: {
        prompt: "FORMAT REPAIR ONLY.",
        prior_attempt: "# Incomplete messaging",
      },
      output_body: "# Complete messaging\n\n## Status Payload\nready",
      validation_errors: [],
      status: "succeeded",
    },
    tokenA,
  );
  assert.equal(repairedAttempt.response.status, 201);

  const artifact = await request(
    stateBaseUrl,
    "POST",
    "/v1/artifacts",
    {
      idempotency_key: "http-artifact-a",
      artifact_type: "company_context",
      markdown_body: "# HTTP Integration Company Context",
      consumed_source_revisions: [`${sourceAId}:1`],
      evidence: [
        {
          mode: "source_supplied",
          source_revision_ids: [`${sourceAId}:1`],
        },
      ],
      status: "ready_for_review",
      safety: {
        action_mode: "draft_only",
        external_mutation_requested: false,
      },
    },
    tokenA,
  );
  assert.equal(artifact.response.status, 201);
  const artifactId = artifact.body.data.artifact_id;

  const approved = await request(
    stateBaseUrl,
    "POST",
    `/v1/artifacts/${encodeURIComponent(artifactId)}/approve`,
    {
      idempotency_key: "http-approve-a",
      revision: 1,
      expected_revision: 1,
      approval_text: "Approved HTTP integration company context revision 1",
      actor: "spoofed-actor",
    },
    tokenA,
  );
  assert.equal(approved.response.status, 200);
  assert.equal(approved.body.data.status, "approved");
  assert.equal(
    approved.body.data.approvals[0].actor,
    "user_http_a",
  );

  const handoff = await request(
    stateBaseUrl,
    "POST",
    "/v1/handoffs",
    {
      idempotency_key: "http-handoff-a",
      source_agent: "Messaging",
      target_agent: "Campaigns And Paid Media",
      artifact_references: [
        { artifact_id: artifactId, revision: 1 },
      ],
      context_revision: "1",
      rationale: "Approved messaging is ready for campaign planning.",
    },
    tokenA,
  );
  assert.equal(handoff.response.status, 201);

  const readyWorkflowRun = await request(
    stateBaseUrl,
    "PUT",
    `/v1/runs/${encodeURIComponent(runId)}`,
    {
      idempotency_key: "http-run-a-ready",
      expected_revision: 1,
      status: "ready_for_review",
      artifact_id: artifactId,
      artifact_revision: 1,
      handoff_id: handoff.body.data.handoff_id,
      blockers: [],
      next_action: "Review messaging and continue the handoff.",
    },
    tokenA,
  );
  assert.equal(readyWorkflowRun.response.status, 200);
  assert.equal(readyWorkflowRun.body.data.attempts.length, 2);
  assert.equal(readyWorkflowRun.body.data.package_version, "1.1.1");
  const approvedWorkflowRun = await request(
    stateBaseUrl,
    "PUT",
    `/v1/runs/${encodeURIComponent(runId)}`,
    {
      idempotency_key: "http-run-a-approved",
      expected_revision: 2,
      status: "approved",
      artifact_id: artifactId,
      artifact_revision: 1,
      handoff_id: handoff.body.data.handoff_id,
      blockers: [],
      next_action: "Continue to campaign planning.",
    },
    tokenA,
  );
  assert.equal(approvedWorkflowRun.response.status, 200);
  assert.equal(approvedWorkflowRun.body.data.status, "approved");
  const lateAttempt = await request(
    stateBaseUrl,
    "POST",
    `/v1/runs/${encodeURIComponent(runId)}/attempts`,
    {
      idempotency_key: "http-run-a-attempt-after-approval",
      attempt_number: 1,
      attempt_kind: "initial",
      package_name: "publisher~guild-marketing-os-messaging",
      package_version: "1.1.1",
      context_revision: "1",
      input_envelope: { prompt: "Unexpected late attempt." },
      output_body: "# Unexpected",
      validation_errors: [],
      status: "succeeded",
    },
    tokenA,
  );
  assert.equal(lateAttempt.response.status, 409);
  assert.equal(lateAttempt.body.error.code, "workflow_run_not_running");

  const crossTenantRun = await request(
    stateBaseUrl,
    "GET",
    `/v1/runs/${encodeURIComponent(runId)}`,
    undefined,
    tokenB,
  );
  assert.equal(crossTenantRun.response.status, 404);
  const listedRuns = await request(
    stateBaseUrl,
    "GET",
    "/v1/runs",
    undefined,
    tokenA,
  );
  assert.equal(listedRuns.response.status, 200);
  assert.equal(listedRuns.body.data[0].run_id, runId);

  const missingPublishScope = await request(
    stateBaseUrl,
    "POST",
    "/v1/context/publish",
    contextRequest(artifactId),
    tokenA,
  );
  assert.equal(missingPublishScope.response.status, 403);
  assert.equal(missingPublishScope.body.error.code, "insufficient_scope");
  assert.equal(publicationCalls, 0);

  const published = await request(
    stateBaseUrl,
    "POST",
    "/v1/context/publish",
    contextRequest(artifactId),
    publishTokenA,
  );
  assert.equal(published.response.status, 201);
  assert.equal(published.body.data.published_context_revision, 1);
  assert.equal(publicationCalls, 1);

  const stalePublish = await request(
    stateBaseUrl,
    "POST",
    "/v1/context/publish",
    {
      ...contextRequest(artifactId),
      idempotency_key: "http-context-stale",
    },
    publishTokenA,
  );
  assert.equal(stalePublish.response.status, 409);
  assert.equal(stalePublish.body.error.code, "context_revision_conflict");
  assert.equal(
    publicationCalls,
    1,
    "stale publication must fail before the publisher runs",
  );

  const exported = await request(
    stateBaseUrl,
    "GET",
    "/v1/export",
    undefined,
    tokenA,
  );
  assert.equal(exported.response.status, 200);
  assert.equal(
    exported.body.data.sources[0].raw_source,
    "HTTP integration confidential source A",
  );
  assert.equal(
    exported.body.data.context_snapshot.guild_context_id,
    "local-guild-context-1",
  );
  assert.equal(exported.body.data.workflow_runs[0].attempts.length, 2);

  const deleted = await request(
    stateBaseUrl,
    "DELETE",
    "/v1/workspace",
    { confirmation_text: WORKSPACE_DELETE_PHRASE },
    tokenA,
  );
  assert.equal(deleted.response.status, 200);
  assert.ok(deleted.body.data.deletion_receipt_id);

  const deletionReplay = await request(
    stateBaseUrl,
    "DELETE",
    "/v1/workspace",
    { confirmation_text: WORKSPACE_DELETE_PHRASE },
    tokenA,
  );
  assert.deepEqual(deletionReplay.body.data, deleted.body.data);
  const afterDelete = await request(
    stateBaseUrl,
    "GET",
    "/v1/export",
    undefined,
    tokenA,
  );
  assert.equal(afterDelete.response.status, 410);
  assert.equal(afterDelete.body.error.code, "workspace_deleted");

  const retainedTenantB = await request(
    stateBaseUrl,
    "GET",
    `/v1/sources/${encodeURIComponent(sourceB.body.data.source_id)}`,
    undefined,
    tokenB,
  );
  assert.equal(retainedTenantB.response.status, 200);
  assert.equal(
    retainedTenantB.body.data.raw_source,
    "HTTP integration confidential source B",
  );

  const remaining = await adminPool.query(
    `SELECT
       count(*) FILTER (
         WHERE organization_id = 'org_http_a'
           AND workspace_id = 'workspace_http_a'
       )::integer AS tenant_a,
       count(*) FILTER (
         WHERE organization_id = 'org_http_b'
           AND workspace_id = 'workspace_http_b'
       )::integer AS tenant_b
     FROM marketing_os_sources`,
  );
  assert.equal(remaining.rows[0].tenant_a, 0);
  assert.equal(remaining.rows[0].tenant_b, 1);

  const missingRoute = await request(
    stateBaseUrl,
    "GET",
    "/v1/not-a-route",
    undefined,
    tokenB,
  );
  assert.equal(missingRoute.response.status, 404);
  assert.equal(missingRoute.body.error.code, "route_not_found");
} finally {
  await closeServer(stateServer);
  await closeServer(jwksServer);
  await adapter?.close();
  await adminPool.end();
}

console.log(
  "Marketing OS authenticated PostgreSQL HTTP integration test OK.",
);

function contextRequest(artifactId) {
  return {
    idempotency_key: "http-context-a",
    expected_current_revision: null,
    artifact_id: artifactId,
    artifact_revision: 1,
    compiled_brief: "Compact approved HTTP integration context",
    readiness: "ready",
    source_references: ["http-source-a:1"],
    freshness: { observed_at: "2026-07-28T00:00:00.000Z" },
    approval_text: CONTEXT_APPROVAL_PHRASE,
  };
}

async function token({
  privateKey,
  issuer,
  audience,
  organizationId,
  workspaceId,
  actor,
  sessionId,
  taskId,
  scopes,
}) {
  return new SignJWT({
    organization_id: organizationId,
    workspace_id: workspaceId,
    session_id: sessionId,
    task_id: taskId,
    scope: scopes.join(" "),
  })
    .setProtectedHeader({
      alg: "RS256",
      kid: "guild-local-integration-key",
      typ: "JWT",
    })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(actor)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function request(baseUrl, method, path, body, bearerToken) {
  const headers = {};
  if (bearerToken) headers.authorization = `Bearer ${bearerToken}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    response,
    body: await response.json(),
  };
}
