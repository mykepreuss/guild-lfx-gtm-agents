#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const messagingDir = path.join(process.cwd(), "agents/messaging");
const build = spawnSync("npm", ["run", "build"], {
  cwd: messagingDir,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});
if (build.status !== 0) {
  process.stderr.write(`${build.stdout ?? ""}${build.stderr ?? ""}`);
  process.exit(build.status ?? 1);
}

const {
  default: messagingAgent,
} = await import(path.join(messagingDir, "dist/agent.js"));
const {
  validateSpecialistArtifact,
} = await import(path.join(messagingDir, "dist/specialist-runtime.js"));

const validArtifact = `## Consumed Context

Published Webflow context and the user's draft-only request.

## Produced Artifact

# Messaging Approval Packet

Draft positioning for Marketing Owner review. Any pricing, compliance, scale, or performance statement remains source-supplied and requires separate evidence approval.

## Assumptions And Missing Evidence

Evidence mode: source_supplied

No connected source was queried.

## Approval Gate

Marketing Owner and the applicable evidence owner must review the draft.

## AEO / AI-Readiness Contribution

Draft entity definitions and answer-ready questions only.

## Status Payload

\`\`\`json
{
  "evidence_mode": "source_supplied",
  "observed_at": null,
  "source_coverage": ["published workspace context", "current user request"],
  "coverage_limitations": ["No connected or live source was inspected."],
  "status": "ready_for_review",
  "safety": {
    "action_mode": "draft_only",
    "external_mutation_requested": false,
    "blocked_actions": ["live publishing", "scheduling", "paid spend", "CRM mutation"],
    "unsupported_claims": [],
    "evidence_gaps": ["Separate approval for sensitive claims."]
  }
}
\`\`\`

## Downstream Handoff

Return the reviewed artifact to Marketing OS Launcher.`;

assert.equal(
  validateSpecialistArtifact(validArtifact).valid,
  true,
  "valid specialist artifact",
);

const unsafeArtifact = validArtifact.replace(
  "Draft positioning for Marketing Owner review.",
  "This production-ready platform instantly eliminates every marketing bottleneck.",
);
const unsafeValidation = validateSpecialistArtifact(unsafeArtifact);
assert.equal(unsafeValidation.valid, false, "unsafe claim must fail");
assert.equal(unsafeValidation.formatOnly, false, "unsafe claim is not a format error");
assert.ok(
  unsafeValidation.issues.some((issue) => issue.kind === "safety"),
  "unsafe claim should produce a safety issue",
);

const strengthenedHipaaArtifact = validArtifact.replace(
  "Draft positioning for Marketing Owner review.",
  "Webflow is not HIPAA compliant.",
);
assert.equal(
  validateSpecialistArtifact(strengthenedHipaaArtifact).valid,
  false,
  "HIPAA nuance must not be strengthened",
);

let calls = 0;
const task = {
  llm: {
    async generateText() {
      calls += 1;
      return {
        text:
          calls === 1
            ? validArtifact.replace("## Downstream Handoff", "## Next Step")
            : validArtifact,
      };
    },
  },
};
const repaired = await messagingAgent.run(
  { type: "text", text: "Draft messaging." },
  task,
);
assert.equal(calls, 2, "format-only failure gets one repair attempt");
assert.equal(repaired.text, validArtifact, "valid repaired artifact is returned");

calls = 0;
task.llm.generateText = async () => {
  calls += 1;
  return { text: unsafeArtifact };
};
const blocked = await messagingAgent.run(
  { type: "text", text: "Draft messaging." },
  task,
);
assert.equal(calls, 1, "safety failures must not be silently repaired");
assert.match(blocked.text, /status": "blocked"/, "safety failure returns a blocked receipt");
assert.doesNotMatch(
  blocked.text,
  /instantly eliminates/,
  "unsafe source artifact is not exposed as a usable draft",
);
assert.equal(
  validateSpecialistArtifact(blocked.text).valid,
  true,
  "blocked receipt itself satisfies the shared contract",
);

console.log("Validated specialist runtime tests passed.");
