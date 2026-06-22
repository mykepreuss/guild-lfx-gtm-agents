import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { agents, runAgent, runOrchestrator } from "../dist/index.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(currentDir, "../src");

const packetSectionPatterns = [
  /## Workflow Summary/,
  /## Inputs Captured Or Assumed/,
  /## Generated Assets/,
  /## Approval Checklist/,
  /## Dashboard Update Payload/,
  /## Future Integration Adapter Notes/,
  /## Next Recommended Action/,
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
