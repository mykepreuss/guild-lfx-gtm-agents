#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  CONTEXT_APPROVAL_PHRASE,
  WORKSPACE_DELETE_PHRASE,
} from "./contracts.mjs";
import { createMarketingOsStateHandler } from "./http-service.mjs";
import {
  CONTEXT_PUBLISH_SCOPE,
  STATE_SCOPE,
  delegatedIdentity,
} from "./identity.mjs";
import { MemoryMarketingOsStateAdapter } from "./memory-adapter.mjs";

const adapter = new MemoryMarketingOsStateAdapter({
  encryptionKey: crypto.createHash("sha256").update("http-test").digest(),
});

const claimsByToken = {
  token_a: claims("org_a", "workspace_a", [STATE_SCOPE]),
  token_a_publish: claims("org_a", "workspace_a", [
    STATE_SCOPE,
    CONTEXT_PUBLISH_SCOPE,
  ]),
  token_b: claims("org_b", "workspace_b", [STATE_SCOPE]),
};

const verifyIdentity = async (request) => {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  return delegatedIdentity(claimsByToken[token]);
};

const blockedPublisherHandler = createMarketingOsStateHandler({
  adapter,
  verifyIdentity,
});

const health = await call(blockedPublisherHandler, "GET", "/healthz");
assert.equal(health.response.status, 200);
assert.equal(health.body.context_publication, "blocked");

const unauthorized = await call(
  blockedPublisherHandler,
  "GET",
  "/v1/context",
);
assert.equal(unauthorized.response.status, 401);
assert.equal(unauthorized.body.error.code, "invalid_delegated_identity");

const spoofed = await call(
  blockedPublisherHandler,
  "POST",
  "/v1/sources",
  {
    organization_id: "org_b",
    workspace_id: "workspace_b",
    idempotency_key: "spoof",
    raw_source: "Do not store",
    evidence: { mode: "source_supplied" },
  },
  "token_a",
);
assert.equal(spoofed.response.status, 403);
assert.equal(spoofed.body.error.code, "tenant_binding_mismatch");

const stored = await call(
  blockedPublisherHandler,
  "POST",
  "/v1/sources",
  {
    tenant: {
      organization_id: "org_a",
      workspace_id: "workspace_a",
    },
    idempotency_key: "source-a",
    raw_source: "Private source A",
    evidence: {
      mode: "source_supplied",
      source_coverage: ["source-a.txt"],
    },
  },
  "token_a",
);
assert.equal(stored.response.status, 201);
assert.equal(stored.body.data.uploader, "user_a");
assert.equal(JSON.stringify(stored.body).includes("Private source A"), false);
const sourceId = stored.body.data.source_id;

const crossTenantRead = await call(
  blockedPublisherHandler,
  "GET",
  `/v1/sources/${encodeURIComponent(sourceId)}`,
  undefined,
  "token_b",
);
assert.equal(crossTenantRead.response.status, 404);

const ownRead = await call(
  blockedPublisherHandler,
  "GET",
  `/v1/sources/${encodeURIComponent(sourceId)}`,
  undefined,
  "token_a",
);
assert.equal(ownRead.response.status, 200);
assert.equal(ownRead.body.data.raw_source, "Private source A");

const artifact = await call(
  blockedPublisherHandler,
  "POST",
  "/v1/artifacts",
  {
    idempotency_key: "artifact-a",
    artifact_type: "company_context",
    markdown_body: "# Company Context",
    status: "ready_for_review",
    evidence: [{ mode: "source_supplied" }],
    safety: {
      action_mode: "draft_only",
      external_mutation_requested: false,
    },
  },
  "token_a",
);
assert.equal(artifact.response.status, 201);
const artifactId = artifact.body.data.artifact_id;

const approved = await call(
  blockedPublisherHandler,
  "POST",
  `/v1/artifacts/${encodeURIComponent(artifactId)}/approve`,
  {
    idempotency_key: "approve-a",
    revision: 1,
    expected_revision: 1,
    actor: "spoofed_actor",
    approval_text: "Approved company context revision 1",
  },
  "token_a",
);
assert.equal(approved.response.status, 200);
assert.equal(approved.body.data.approvals[0].actor, "user_a");

const missingPublishScope = await call(
  blockedPublisherHandler,
  "POST",
  "/v1/context/publish",
  contextRequest(artifactId),
  "token_a",
);
assert.equal(missingPublishScope.response.status, 403);
assert.equal(missingPublishScope.body.error.code, "insufficient_scope");

const missingPublisher = await call(
  blockedPublisherHandler,
  "POST",
  "/v1/context/publish",
  contextRequest(artifactId),
  "token_a_publish",
);
assert.equal(missingPublisher.response.status, 503);
assert.equal(
  missingPublisher.body.error.code,
  "delegated_context_publication_unavailable",
);
assert.equal(await adapter.readContextSnapshot({
  organization_id: "org_a",
  workspace_id: "workspace_a",
}), undefined);

let publicationCalls = 0;
const enabledHandler = createMarketingOsStateHandler({
  adapter,
  verifyIdentity,
  contextPublisher: async ({ identity, request }) => {
    publicationCalls += 1;
    assert.equal(identity.tenant.workspace_id, "workspace_a");
    assert.equal(request.approval_text, CONTEXT_APPROVAL_PHRASE);
    return {
      guild_context_id: "guild-context-1",
      rollback_context_id: "guild-context-0",
    };
  },
});
const published = await call(
  enabledHandler,
  "POST",
  "/v1/context/publish",
  contextRequest(artifactId),
  "token_a_publish",
);
assert.equal(published.response.status, 201);
assert.equal(published.body.data.published_context_revision, 1);
assert.equal(publicationCalls, 1);

const exported = await call(
  enabledHandler,
  "GET",
  "/v1/export",
  undefined,
  "token_a",
);
assert.equal(exported.response.status, 200);
assert.equal(exported.body.data.sources[0].raw_source, "Private source A");
assert.equal(exported.body.data.tenant.workspace_id, "workspace_a");

const deleted = await call(
  enabledHandler,
  "DELETE",
  "/v1/workspace",
  { confirmation_text: WORKSPACE_DELETE_PHRASE },
  "token_a",
);
assert.equal(deleted.response.status, 200);
assert.ok(deleted.body.data.deletion_receipt_id);

const emptyExport = await call(
  enabledHandler,
  "GET",
  "/v1/export",
  undefined,
  "token_a",
);
assert.deepEqual(emptyExport.body.data.sources, []);

console.log("Marketing OS authenticated HTTP service test OK.");

function claims(organizationId, workspaceId, scopes) {
  return {
    iss: "https://guild.example.test",
    aud: "guild-marketing-os-state",
    sub: organizationId === "org_a" ? "user_a" : "user_b",
    organization_id: organizationId,
    workspace_id: workspaceId,
    session_id: `session_${workspaceId}`,
    task_id: `task_${workspaceId}`,
    scope: scopes.join(" "),
    exp: 2_000_000_000,
  };
}

function contextRequest(artifactId) {
  return {
    idempotency_key: "context-a",
    expected_current_revision: null,
    artifact_id: artifactId,
    artifact_revision: 1,
    compiled_brief: "Approved compact brief",
    approval_text: CONTEXT_APPROVAL_PHRASE,
  };
}

async function call(handler, method, path, body, token) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  let encodedBody;
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    encodedBody = JSON.stringify(body);
  }
  const response = await handler(
    new Request(`https://state.example.test${path}`, {
      method,
      headers,
      body: encodedBody,
    }),
  );
  return {
    response,
    body: await response.json(),
  };
}
