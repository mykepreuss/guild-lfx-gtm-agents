#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const messagingDir = path.join(process.cwd(), "agents/messaging");
const marketSignalSource = fs.readFileSync(
  path.join(process.cwd(), "agents/market-signal/agent.ts"),
  "utf8",
);
assert.match(
  marketSignalSource,
  /Published company context that identifies the company, audience, and marketing goal,[\s\S]*is sufficient for a review-ready hypothesis brief\./,
  "Market Signal should treat sufficient published context as review-ready",
);
assert.match(
  marketSignalSource,
  /Missing competitor, search, community, analyst, or live-monitoring sources are coverage limitations and optional ways to improve the brief\./,
  "Market Signal should disclose optional evidence gaps without blocking useful work",
);
assert.match(
  marketSignalSource,
  /Use status needs_input only when the company, audience, or marketing goal is missing/,
  "Market Signal should reserve needs_input for missing essential context",
);
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
  normalizeDuplicateSharedHeadings,
  redactUnsafeGeneratedLines,
  validateSpecialistArtifact,
} = await import(path.join(messagingDir, "dist/specialist-runtime.js"));

const approvedHipaaConstraint =
  "Webflow may not be HIPAA compliant, and customers should not provide Protected Health Information / PHI through the platform.";

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
const directlyFiltered = redactUnsafeGeneratedLines(
  unsafeArtifact,
  unsafeValidation.issues,
);
assert.equal(directlyFiltered.changed, true, "unsafe line should be redacted");
const directlyFilteredValidation = validateSpecialistArtifact(
  directlyFiltered.text,
);
assert.equal(
  directlyFilteredValidation.valid,
  true,
  JSON.stringify(directlyFilteredValidation.issues),
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

const paraphrasedHipaaArtifact = validArtifact.replace(
  "Draft positioning for Marketing Owner review.",
  "We adhere strictly to the approved HIPAA constraint. Customers do not input or store PHI within the platform.",
);
const paraphrasedHipaaValidation = validateSpecialistArtifact(
  paraphrasedHipaaArtifact,
);
assert.equal(
  paraphrasedHipaaValidation.valid,
  false,
  "HIPAA constraint must not be paraphrased or expanded",
);
const filteredHipaaParaphrase = redactUnsafeGeneratedLines(
  paraphrasedHipaaArtifact,
  paraphrasedHipaaValidation.issues,
);
assert.equal(
  filteredHipaaParaphrase.changed,
  true,
  "HIPAA paraphrase should be redacted deterministically",
);
assert.equal(
  validateSpecialistArtifact(filteredHipaaParaphrase.text).valid,
  true,
  "redacted HIPAA paraphrase should satisfy the specialist contract",
);

const exactHipaaArtifact = validArtifact.replace(
  "Draft positioning for Marketing Owner review.",
  `Claim status: do_not_use_as_positive_claim — ${approvedHipaaConstraint}`,
);
assert.equal(
  validateSpecialistArtifact(exactHipaaArtifact, {
    expectedHipaaConstraint: approvedHipaaConstraint,
  }).valid,
  true,
  "the exact approved HIPAA constraint remains valid",
);
assert.equal(
  validateSpecialistArtifact(validArtifact, {
    expectedHipaaConstraint: approvedHipaaConstraint,
  }).valid,
  false,
  "an explicitly requested exact constraint may not be silently omitted",
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
const safetyFiltered = await messagingAgent.run(
  { type: "text", text: "Draft messaging." },
  task,
);
assert.equal(calls, 1, "safety filtering never triggers a second LLM attempt");
assert.match(
  safetyFiltered.text,
  /Safety filter disclosure:/,
  "deterministic withholding is disclosed",
);
assert.doesNotMatch(
  safetyFiltered.text,
  /This generated line was withheld by deterministic safety validation/,
  "unsafe generated lines are removed from the reader-facing draft",
);
assert.doesNotMatch(
  safetyFiltered.text
    .split("## Produced Artifact")[1]
    .split("## Assumptions And Missing Evidence")[0],
  /instantly eliminates/,
  "unsafe source artifact is not exposed in the usable draft",
);
assert.equal(
  validateSpecialistArtifact(safetyFiltered.text).valid,
  true,
  "safety-filtered artifact satisfies the shared contract",
);

const nestedUnsafeArtifact = validArtifact
  .replace(
    "Draft positioning for Marketing Owner review.",
    `# Campaign Packet

## Creative And Test Plan

Give marketing visual autonomy while controlling a production-ready code environment.`,
  )
  .replace(
    '"unsupported_claims": []',
    '"unsupported_claims": ["No claims of HIPAA compliance allowed"]',
  );
const nestedUnsafeValidation = validateSpecialistArtifact(
  nestedUnsafeArtifact,
);
assert.equal(
  nestedUnsafeValidation.valid,
  false,
  "unsafe claims under nested specialist headings must be detected",
);
const nestedSafetyFiltered = redactUnsafeGeneratedLines(
  nestedUnsafeArtifact,
  nestedUnsafeValidation.issues,
);
assert.equal(
  nestedSafetyFiltered.changed,
  true,
  "nested unsafe claims should be redacted without touching Status Payload JSON",
);
assert.equal(
  validateSpecialistArtifact(nestedSafetyFiltered.text).valid,
  true,
  JSON.stringify(validateSpecialistArtifact(nestedSafetyFiltered.text).issues),
);
assert.doesNotMatch(
  nestedSafetyFiltered.text
    .split("## Produced Artifact")[1]
    .split("## Assumptions And Missing Evidence")[0],
  /production-ready/,
  "nested unsafe line is absent from the usable draft",
);
assert.match(
  nestedSafetyFiltered.text,
  /No claims of HIPAA compliance allowed/,
  "audit-only Status Payload evidence is preserved as valid JSON",
);

const duplicateHeadingArtifact = validArtifact.replace(
  "## Assumptions And Missing Evidence",
  `## Consumed Context

Additional context note.

## Assumptions And Missing Evidence`,
);
assert.equal(
  validateSpecialistArtifact(duplicateHeadingArtifact).valid,
  false,
  "duplicate shared headings should fail before deterministic normalization",
);
const normalizedHeadingArtifact =
  normalizeDuplicateSharedHeadings(duplicateHeadingArtifact);
assert.match(
  normalizedHeadingArtifact,
  /### Additional Consumed Context/,
  "duplicate shared heading content should be preserved under a subordinate heading",
);
assert.equal(
  validateSpecialistArtifact(normalizedHeadingArtifact).valid,
  true,
  JSON.stringify(validateSpecialistArtifact(normalizedHeadingArtifact).issues),
);

const unqualifiedProofArtifact = validArtifact.replace(
  "Draft positioning for Marketing Owner review.",
  "Retool reported 70% more demo bookings.",
);
const unqualifiedProofValidation = validateSpecialistArtifact(
  unqualifiedProofArtifact,
);
assert.equal(
  unqualifiedProofValidation.valid,
  false,
  "unqualified sensitive proof claims must fail",
);
const filteredProofArtifact = redactUnsafeGeneratedLines(
  unqualifiedProofArtifact,
  unqualifiedProofValidation.issues,
);
assert.equal(
  validateSpecialistArtifact(filteredProofArtifact.text).valid,
  true,
  "unqualified sensitive proof claims should be withheld deterministically",
);
const qualifiedProofArtifact = validArtifact.replace(
  "Draft positioning for Marketing Owner review.",
  "Claim status: source_supplied_review_required — Retool reported 70% more demo bookings; exact source evidence and Marketing Owner review are required before reuse.",
);
assert.equal(
  validateSpecialistArtifact(qualifiedProofArtifact).valid,
  true,
  "explicitly review-gated proof claims remain usable as proof needs",
);

console.log("Validated specialist runtime tests passed.");
