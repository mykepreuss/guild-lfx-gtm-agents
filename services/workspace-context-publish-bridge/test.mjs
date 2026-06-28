#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  BridgeError,
  isBridgeRequestAuthorized,
  publishWorkspaceContext,
  replaceManagedWorkspaceContextBlock,
  validatePublishRequest,
} from "./bridge.mjs";

const managedBlock = [
  "<!-- guild-marketing-os-context:start -->",
  "# Guild Marketing OS Managed Company Context",
  "",
  "## Workspace Context Brief",
  "Compact Webflow context.",
  "<!-- guild-marketing-os-context:end -->",
].join("\n");

const request = {
  session_id: "session_test",
  managed_context: managedBlock,
  summary: "Compacted Webflow workspace context brief.",
  start_marker: "<!-- guild-marketing-os-context:start -->",
  end_marker: "<!-- guild-marketing-os-context:end -->",
  company_name: "Webflow",
  approval_phrase: "publish approved context to workspace context",
  approved_at: "2026-06-28T20:00:00.000Z",
};

assert.equal(validatePublishRequest(request).session_id, "session_test");
assert.throws(
  () => validatePublishRequest({ ...request, approval_phrase: "publish it" }),
  (error) => error instanceof BridgeError && error.status === 403 && error.code === "approval_required",
);

const replaced = replaceManagedWorkspaceContextBlock([
  "# Existing Context",
  "",
  "Keep this intro.",
  "",
  "<!-- guild-marketing-os-context:start -->",
  "old managed block",
  "<!-- guild-marketing-os-context:end -->",
  "",
  "Keep this outro.",
].join("\n"), managedBlock);
assert.match(replaced, /Keep this intro\./);
assert.match(replaced, /Keep this outro\./);
assert.doesNotMatch(replaced, /old managed block/);
assert.match(replaced, /Compact Webflow context\./);

assert.throws(
  () => replaceManagedWorkspaceContextBlock("Only <!-- guild-marketing-os-context:start --> marker", managedBlock),
  (error) => error instanceof BridgeError && error.status === 409 && error.code === "partial_managed_block",
);

const calls = [];
async function guildFetch(path, init = {}) {
  calls.push({ path, init });
  if (path === "/sessions/session_test") {
    return {
      workspace: {
        id: "workspace_test",
        full_name: "michaelpreuss/guild-marketing-os",
      },
    };
  }
  if (path === "/workspaces/workspace_test/contexts?limit=20&offset=0") {
    return {
      items: [
        {
          id: "context_old",
          status: "PUBLISHED",
          manual_context: "# Existing Context\n\nKeep this intro.\n\nKeep this outro.\n",
        },
      ],
    };
  }
  if (path === "/workspaces/workspace_test/contexts" && init.method === "POST") {
    assert.equal(init.body.status, "DRAFT");
    assert.equal(init.body.summary, request.summary);
    assert.match(init.body.context, /Keep this intro\./);
    assert.match(init.body.context, /Guild Marketing OS Managed Company Context/);
    assert.match(init.body.context, /Keep this outro\./);
    return { id: "context_draft", summary: init.body.summary };
  }
  if (path === "/contexts/context_draft" && init.method === "PATCH") {
    assert.deepEqual(init.body, { status: "PUBLISHED" });
    return { id: "context_published", summary: request.summary };
  }
  throw new Error(`Unexpected Guild API call: ${path}`);
}

const result = await publishWorkspaceContext(request, {
  guildFetch,
  allowedWorkspaceIds: "workspace_test",
  allowedWorkspaceFullNames: "michaelpreuss/guild-marketing-os",
});
assert.equal(result.status, "PUBLISHED");
assert.equal(result.previous_context_id, "context_old");
assert.equal(result.draft_context_id, "context_draft");
assert.equal(result.published_context_id, "context_published");
assert.equal(result.publish_path, "host_bridge");
assert.match(result.rollback_reference, /context_old/);
assert.deepEqual(calls.map((call) => [call.path, call.init.method ?? "GET"]), [
  ["/sessions/session_test", "GET"],
  ["/workspaces/workspace_test/contexts?limit=20&offset=0", "GET"],
  ["/workspaces/workspace_test/contexts", "POST"],
  ["/contexts/context_draft", "PATCH"],
]);

await assert.rejects(
  () => publishWorkspaceContext(request, {
    guildFetch,
    allowedWorkspaceIds: "other_workspace",
  }),
  (error) => error instanceof BridgeError && error.status === 403 && error.code === "workspace_not_allowed",
);

assert.equal(isBridgeRequestAuthorized({ authorization: "Bearer bridge-token" }, "bridge-token"), true);
assert.equal(isBridgeRequestAuthorized({ "x-api-key": "bridge-token" }, "bridge-token"), true);
assert.equal(isBridgeRequestAuthorized({ authorization: "Bearer wrong" }, "bridge-token"), false);
assert.equal(isBridgeRequestAuthorized({}, undefined), true);

console.log("Workspace context publish bridge test OK.");
