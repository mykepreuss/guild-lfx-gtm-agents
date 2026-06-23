import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { agents, buildDashboardPayload, runAgent, runOrchestrator } from "../dist/index.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(currentDir, "../src");

const packetSectionPatterns = [
  /## Workflow Summary/,
  /## Context Hub/,
  /## Inputs Captured Or Assumed/,
  /## Generated Assets/,
  /## Approval Checklist/,
  /## Dashboard Update Payload/,
  /## Future Integration Adapter Notes/,
  /## Next Recommended Action/,
  /"workstream":/,
  /"approvalStatus":/,
  /"decisionRequired":/,
  /"contextHub":/,
  /"agentHubReadiness":/,
  /"mode": "fixture-backed-local-v1"/,
  /"liveExecution": false/,
];

assert.equal(agents.length, 9, "local lab should model nine separate agents");

const expectedIds = [
  "foundation-setup",
  "newsletter-composition",
  "social-content",
  "event-creation",
  "event-promotion",
  "audience-segmentation",
  "owned-media-production",
  "campaign-performance",
  "campaigns-paid-media",
];

assert.deepEqual(
  agents.map((agent) => agent.id),
  expectedIds,
  "agent order should match the source brief",
);

const hubNames = new Set(agents.map((agent) => agent.hubName));
assert.equal(hubNames.size, 9, "each local agent should have a unique future Agent Hub name");
assert.equal(
  existsSync(resolve(srcDir, "shared-context.ts")),
  true,
  "shared fixture context should live outside the ordered agent catalog",
);

for (const agent of agents) {
  assert.equal(
    existsSync(resolve(srcDir, "agents", `${agent.id}.ts`)),
    true,
    `${agent.id} should have a dedicated per-agent definition module`,
  );
}

function assertNonEmptyString(value, message) {
  assert.equal(typeof value, "string", message);
  assert(value.trim().length > 0, message);
}

function assertNonEmptyArray(value, message) {
  assert(Array.isArray(value), message);
  assert(value.length > 0, message);
}

function assertAgentContract(agent) {
  assert.equal(agent.metadata.category, "gtm-marketing-os", `${agent.id} should declare Agent Hub category`);
  assert.equal(agent.metadata.sourceSafetyLevel, "public_fixture_only", `${agent.id} should declare source safety`);
  assert.equal(agent.metadata.visibilityReadiness, "local_lab_only", `${agent.id} should remain local-lab only`);
  assert.equal(
    agent.metadata.agentHubReadiness.packageStatus,
    "not_packaged",
    `${agent.id} should not claim Agent Hub packaging`,
  );
  assert.equal(
    agent.metadata.agentHubReadiness.validationStatus,
    "not_run",
    `${agent.id} should not claim Guild validation has run`,
  );
  assert.equal(
    agent.metadata.agentHubReadiness.visibility,
    "draft_only",
    `${agent.id} should stay draft-only until approved packaging`,
  );
  assertNonEmptyArray(agent.metadata.tags, `${agent.id} should include Agent Hub tags`);
  assertNonEmptyString(agent.metadata.primaryUser, `${agent.id} should identify primary user`);

  assertNonEmptyArray(agent.contextHub.requiredArtifacts, `${agent.id} should declare required Context Hub artifacts`);
  assertNonEmptyString(agent.contextHub.missingContextBehavior, `${agent.id} should describe missing context behavior`);
  assertNonEmptyArray(agent.contextHub.sourcePolicy, `${agent.id} should declare source policy`);

  assertNonEmptyString(agent.approvalModel.ownerRole, `${agent.id} should identify approval owner role`);
  assertNonEmptyArray(agent.approvalModel.requiredApprovers, `${agent.id} should list required approvers`);
  assertNonEmptyString(agent.approvalModel.decisionType, `${agent.id} should identify decision type`);

  assert.equal(agent.dashboard.workstream, agent.metadata.workstream, `${agent.id} dashboard workstream should align`);
  assert.equal(agent.dashboard.ownerRole, agent.approvalModel.ownerRole, `${agent.id} owner role should align`);
  assertNonEmptyString(agent.dashboard.approvalStatus, `${agent.id} should have dashboard approval status`);
  assertNonEmptyString(agent.dashboard.decisionRequired, `${agent.id} should state the dashboard decision`);
  assertNonEmptyArray(agent.dashboard.metrics, `${agent.id} should include dashboard metrics`);
  assertNonEmptyString(agent.dashboard.sourceConfidence, `${agent.id} should declare source confidence`);
}

function sectionBetween(text, startMarker, endMarker) {
  return text.split(startMarker)[1].split(endMarker)[0];
}

function assertLocalPacket(output, agent) {
  assert.match(output, new RegExp(`# ${agent.displayName} Local V1 Packet`));
  assert.match(output, new RegExp(`Future Agent Hub name: \`${agent.hubName}\``));

  for (const pattern of packetSectionPatterns) {
    assert.match(output, pattern);
  }

  assert.doesNotMatch(output, /\bhas (published|scheduled|synced|paused|created live|modified live)\b/i);

  const generatedAssets = sectionBetween(output, "## Generated Assets", "## Approval Checklist");
  assert(
    generatedAssets.length > 400,
    `${agent.id} should include substantive generated assets, not only an outline`,
  );
}

for (const agent of agents) {
  assertAgentContract(agent);

  const payload = buildDashboardPayload(agent, agent.demoPrompt);
  assert.equal(payload.agentId, agent.id, `${agent.id} payload should include agent id`);
  assert.equal(payload.category, agent.metadata.category, `${agent.id} payload should include category`);
  assert.equal(payload.workstream, agent.metadata.workstream, `${agent.id} payload should include workstream`);
  assert.equal(payload.ownerRole, agent.approvalModel.ownerRole, `${agent.id} payload should include owner role`);
  assert.equal(payload.approvalStatus, agent.dashboard.approvalStatus, `${agent.id} payload should include approval`);
  assertNonEmptyString(payload.decisionRequired, `${agent.id} payload should include decision required`);
  assertNonEmptyArray(payload.metrics, `${agent.id} payload should include dashboard metrics`);
  assert.deepEqual(payload.contextHub.requiredArtifacts, agent.contextHub.requiredArtifacts, `${agent.id} payload should include Context Hub artifacts`);
  assert.equal(payload.agentHubReadiness.packageStatus, "not_packaged", `${agent.id} payload should stay local`);

  const output = runAgent(agent.id, agent.demoPrompt);
  assertLocalPacket(output, agent);
}

const menu = runOrchestrator("");
assert.match(menu, /# Marketing OS Local Agent Lab/);
for (const agent of agents) {
  assert.match(menu, new RegExp(`${agent.order}\\. ${agent.displayName}`));
}

const foundation = runOrchestrator("I need foundation setup for a project website and messaging.");
assert.match(foundation, /# Foundation Setup Agent Local V1 Packet/);

const ambiguous = runOrchestrator("Build a campaign dashboard and tell me what to scale.");
assert.match(ambiguous, /# Choose An Agent/);

console.log(`Local smoke tests passed for ${agents.length} separate agent definitions plus orchestrator.`);
