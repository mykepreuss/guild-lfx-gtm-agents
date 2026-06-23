import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import exemplar, { run } from "../dist/agent.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(currentDir, "..");

assert.equal(exemplar.id, "campaign-performance");
assert.equal(exemplar.hubName, "marketing-os-campaign-performance");
assert.equal(exemplar.liveExecution, false);
assert.equal(exemplar.run, run);
assert.equal(
  existsSync(resolve(packageDir, "guild.json")),
  false,
  "local exemplar must not become a Guild lifecycle package yet",
);

const output = await run({
  type: "text",
  text: "Run the Monday performance readout and recommend pause or scale actions.",
});

assert.equal(output.type, "text");
assert.equal(output.liveExecution, false);
assert.match(output.text, /# Campaign Performance Agent Local V1 Packet/);
assert.match(output.text, /"agentHubReadiness":/);
assert.equal(output.dashboardPayload.agentId, "campaign-performance");
assert.equal(output.dashboardPayload.agentHubName, "marketing-os-campaign-performance");
assert.equal(output.dashboardPayload.liveExecution, false);
assert.equal(output.dashboardPayload.workstream, "performance");
assert.equal(output.dashboardPayload.agentHubReadiness.packageStatus, "not_packaged");
assert.equal(output.dashboardPayload.agentHubReadiness.validationStatus, "not_run");
assert.equal(output.dashboardPayload.agentHubReadiness.visibility, "draft_only");

console.log("Campaign Performance Agent Hub exemplar smoke test passed.");
