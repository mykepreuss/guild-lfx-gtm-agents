#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  ARTIFACT_STATUSES,
  EVIDENCE_MODES,
  REQUIRED_OUTPUT_HEADINGS,
  SUITE_ROUTES,
  WORKSTREAM_STATUSES,
  defaultSafetyEnvelope,
  detectEvidenceConflicts,
  validateArtifactRevision,
  validateArtifactText,
  validateWorkstreamState,
} from "./lib/suite-contracts.mjs";

const validText = [
  REQUIRED_OUTPUT_HEADINGS[0],
  "Published context revision context-1.",
  REQUIRED_OUTPUT_HEADINGS[1],
  "Draft artifact.",
  REQUIRED_OUTPUT_HEADINGS[2],
  "Evidence mode: source_supplied.",
  REQUIRED_OUTPUT_HEADINGS[3],
  "Marketing Owner review required.",
  REQUIRED_OUTPUT_HEADINGS[4],
  "No contribution.",
  REQUIRED_OUTPUT_HEADINGS[5],
  JSON.stringify({ evidence_mode: EVIDENCE_MODES[0], safety: defaultSafetyEnvelope() }),
  REQUIRED_OUTPUT_HEADINGS[6],
  "Messaging.",
].join("\n\n");

assert.deepEqual(validateArtifactText(validText, { requireEvidenceMode: true }), { valid: true, errors: [] });
assert.equal(validateArtifactText(validText.replace(REQUIRED_OUTPUT_HEADINGS[1], "")).valid, false);
assert.equal(validateArtifactText(`${validText}\nAutomatically pause the losing variant.`).valid, false);
assert.equal(
  validateArtifactText(
    `${validText}\nTell the user to publish approved context to workspace context.`,
  ).valid,
  false,
);

const artifact = {
  artifact_id: "artifact-1",
  revision: 1,
  status: ARTIFACT_STATUSES[1],
  markdown_body: validText,
  safety: defaultSafetyEnvelope(),
};
assert.deepEqual(validateArtifactRevision(artifact), { valid: true, errors: [] });
assert.equal(validateArtifactRevision({ ...artifact, safety: { action_mode: "execute" } }).valid, false);

const workstream = {
  route: SUITE_ROUTES[4],
  status: WORKSTREAM_STATUSES[3],
  blockers: [],
};
assert.deepEqual(validateWorkstreamState(workstream), { valid: true, errors: [] });
assert.equal(validateWorkstreamState({ ...workstream, route: "unrelated_agent" }).valid, false);

assert.deepEqual(
  detectEvidenceConflicts([
    { claim_key: "pricing.plan", value: "$10", source_revision: "source-a:1", approved: true },
    { claim_key: "pricing.plan", value: "$12", source_revision: "source-b:2", approved: true },
    { claim_key: "company.name", value: "Acme", source_revision: "source-a:1", approved: true },
    { claim_key: "company.name", value: "Acme", source_revision: "source-b:2", approved: true },
  ]),
  [
    {
      claim_key: "pricing.plan",
      state: "blocked",
      reason: "approved_revisions_conflict",
      choices: [
        { source_revision: "source-a:1", value: "$10" },
        { source_revision: "source-b:2", value: "$12" },
      ],
      required_action: "Choose which approved revision wins before reuse or context publication.",
    },
  ],
);

console.log("Marketing OS contract tests passed.");
