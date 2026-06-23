import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function assertLocalExemplar({
  importMetaUrl,
  expectedId,
  expectedHubName,
  expectedWorkstream,
  requestText,
}) {
  const currentDir = dirname(fileURLToPath(importMetaUrl));
  const packageDir = resolve(currentDir, "..");
  const moduleUrl = pathToFileURL(resolve(packageDir, "dist/agent.js")).href;
  const { default: exemplar, run } = await import(moduleUrl);

  assert.equal(exemplar.id, expectedId);
  assert.equal(exemplar.hubName, expectedHubName);
  assert.equal(exemplar.liveExecution, false);
  assert.equal(exemplar.run, run);
  assert.equal(
    existsSync(resolve(packageDir, "guild.json")),
    false,
    "local exemplar must not become a Guild lifecycle package yet",
  );

  const output = await run({
    type: "text",
    text: requestText,
  });

  assert.equal(output.type, "text");
  assert.equal(output.liveExecution, false);
  assert.match(output.text, new RegExp(`# ${escapeRegExp(exemplar.displayName)} Local V1 Packet`));
  assert.match(output.text, /## Context Hub/);
  assert.match(output.text, /"agentHubReadiness":/);
  assert.equal(output.dashboardPayload.agentId, expectedId);
  assert.equal(output.dashboardPayload.agentHubName, expectedHubName);
  assert.equal(output.dashboardPayload.liveExecution, false);
  assert.equal(output.dashboardPayload.workstream, expectedWorkstream);
  assert(Array.isArray(output.dashboardPayload.contextHub.requiredArtifacts));
  assert.equal(output.dashboardPayload.agentHubReadiness.packageStatus, "not_packaged");
  assert.equal(output.dashboardPayload.agentHubReadiness.validationStatus, "not_run");
  assert.equal(output.dashboardPayload.agentHubReadiness.visibility, "draft_only");

  console.log(`${exemplar.displayName} exemplar smoke test passed.`);
}
