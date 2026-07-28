export const REQUIRED_OUTPUT_HEADINGS = Object.freeze([
  "## Consumed Context",
  "## Produced Artifact",
  "## Assumptions And Missing Evidence",
  "## Approval Gate",
  "## AEO / AI-Readiness Contribution",
  "## Status Payload",
  "## Downstream Handoff",
]);

export const EVIDENCE_MODES = Object.freeze([
  "source_supplied",
  "connected_read_only",
  "live_monitoring",
]);

export const ARTIFACT_STATUSES = Object.freeze([
  "draft",
  "ready_for_review",
  "approved",
  "superseded",
  "blocked",
]);

export const WORKSTREAM_STATUSES = Object.freeze([
  "not_started",
  "running",
  "needs_input",
  "ready_for_review",
  "approved",
  "blocked",
  "failed",
]);

export const SUITE_ROUTES = Object.freeze([
  "onboarding",
  "company_context",
  "market_signal",
  "icp",
  "audience_segmentation",
  "messaging",
  "branding_pitch_deck",
  "social_monitoring_content",
  "campaigns_paid_media",
  "guide",
  "blocked",
]);

const executionClaimPatterns = Object.freeze([
  /\bautomatically (?:pause|scale|publish|schedule|sync|activate)\b/i,
  /\b(?:published|scheduled|synced|activated) successfully\b/i,
  /\bspend (?:was |has been )?(?:increased|decreased|started|paused)\b/i,
  /\bcrm (?:was |has been )?(?:activated|updated|synced)\b/i,
  /\bcredentials? (?:was |were |has been |have been )?(?:configured|connected|stored)\b/i,
]);

export function defaultSafetyEnvelope() {
  return {
    action_mode: "draft_only",
    external_mutation_requested: false,
    blocked_actions: [
      "live publishing",
      "scheduling",
      "paid spend",
      "CRM mutation",
      "credential setup",
      "trigger setup",
      "visibility changes",
      "legal approval",
    ],
    unsupported_claims: [],
    evidence_gaps: [],
  };
}

export function validateArtifactText(
  text,
  { requireEvidenceMode = false, requireSafetyEnvelope = true } = {},
) {
  const errors = [];
  let previousIndex = -1;

  for (const heading of REQUIRED_OUTPUT_HEADINGS) {
    const index = text.indexOf(heading);
    if (index === -1) {
      errors.push(`Missing required heading: ${heading}`);
      continue;
    }
    if (index < previousIndex) errors.push(`Required heading is out of order: ${heading}`);
    previousIndex = index;
  }

  if (requireEvidenceMode && !EVIDENCE_MODES.some((mode) => text.includes(mode))) {
    errors.push(`Missing evidence mode: ${EVIDENCE_MODES.join(" | ")}`);
  }
  if (
    requireSafetyEnvelope &&
    !/"?action_mode"?\s*:\s*"?draft_only"?/.test(text)
  ) {
    errors.push("Missing safety action_mode: draft_only.");
  }
  if (
    requireSafetyEnvelope &&
    !/"?external_mutation_requested"?\s*:\s*false/.test(text)
  ) {
    errors.push("Missing safety external_mutation_requested: false.");
  }

  for (const pattern of executionClaimPatterns) {
    if (pattern.test(text)) errors.push(`Execution-adjacent completion claim matched ${pattern}`);
  }

  return { valid: errors.length === 0, errors };
}

export function detectEvidenceConflicts(records) {
  const byClaim = new Map();
  for (const record of records ?? []) {
    if (
      !record ||
      typeof record !== "object" ||
      typeof record.claim_key !== "string" ||
      !record.claim_key.trim() ||
      record.approved !== true
    ) {
      continue;
    }
    const key = record.claim_key.trim();
    const normalizedValue = JSON.stringify(record.value);
    const entries = byClaim.get(key) ?? new Map();
    const references = entries.get(normalizedValue) ?? [];
    references.push({
      source_revision: record.source_revision ?? null,
      value: record.value,
    });
    entries.set(normalizedValue, references);
    byClaim.set(key, entries);
  }

  const conflicts = [];
  for (const [claimKey, values] of byClaim) {
    if (values.size < 2) continue;
    conflicts.push({
      claim_key: claimKey,
      state: "blocked",
      reason: "approved_revisions_conflict",
      choices: [...values.values()].flat(),
      required_action: "Choose which approved revision wins before reuse or context publication.",
    });
  }
  return conflicts;
}

export function validateArtifactRevision(value) {
  const errors = [];
  if (!value || typeof value !== "object") return { valid: false, errors: ["Artifact revision must be an object."] };
  if (typeof value.artifact_id !== "string" || !value.artifact_id) errors.push("artifact_id is required.");
  if (!Number.isInteger(value.revision) || value.revision < 1) errors.push("revision must be a positive integer.");
  if (!ARTIFACT_STATUSES.includes(value.status)) errors.push("status is invalid.");
  if (typeof value.markdown_body !== "string" || !value.markdown_body) errors.push("markdown_body is required.");
  if (value.safety?.action_mode !== "draft_only") errors.push("safety.action_mode must be draft_only.");
  if (value.safety?.external_mutation_requested !== false) {
    errors.push("safety.external_mutation_requested must be false.");
  }
  return { valid: errors.length === 0, errors };
}

export function validateWorkstreamState(value) {
  const errors = [];
  if (!value || typeof value !== "object") return { valid: false, errors: ["Workstream state must be an object."] };
  if (!SUITE_ROUTES.includes(value.route)) errors.push("route is invalid.");
  if (!WORKSTREAM_STATUSES.includes(value.status)) errors.push("status is invalid.");
  if (!Array.isArray(value.blockers)) errors.push("blockers must be an array.");
  return { valid: errors.length === 0, errors };
}
