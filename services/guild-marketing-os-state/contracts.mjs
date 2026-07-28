import crypto from "node:crypto";

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

export const HANDOFF_COMPLETION_STATES = Object.freeze([
  "pending",
  "completed",
  "blocked",
  "failed",
]);

export const WORKFLOW_RUN_STATUSES = Object.freeze([
  "running",
  "needs_input",
  "ready_for_review",
  "approved",
  "blocked",
  "failed",
]);

export const WORKFLOW_ATTEMPT_KINDS = Object.freeze([
  "initial",
  "format_repair",
]);

export const WORKFLOW_ATTEMPT_STATUSES = Object.freeze([
  "succeeded",
  "format_invalid",
  "safety_failed",
  "tool_failed",
]);

export const EVIDENCE_MODES = Object.freeze([
  "source_supplied",
  "connected_read_only",
  "live_monitoring",
]);

export const CONTEXT_APPROVAL_PHRASE = "publish approved context to workspace context";
export const WORKSPACE_DELETE_PHRASE = "delete marketing os workspace data";

export class StateContractError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "StateContractError";
    this.code = code;
    this.status = status;
  }
}

export function assertTenant(tenant) {
  if (!tenant || typeof tenant !== "object") {
    throw new StateContractError("tenant_required", "Tenant binding is required.", 401);
  }
  const organizationId = requiredString(tenant.organization_id, "tenant.organization_id");
  const workspaceId = requiredString(tenant.workspace_id, "tenant.workspace_id");
  return Object.freeze({ organization_id: organizationId, workspace_id: workspaceId });
}

export function tenantKey(tenant) {
  const value = assertTenant(tenant);
  return `${value.organization_id}:${value.workspace_id}`;
}

export function safetyEnvelope(value = {}) {
  if (value.action_mode !== undefined && value.action_mode !== "draft_only") {
    throw new StateContractError("execution_not_supported", "V1 safety.action_mode must be draft_only.", 403);
  }
  if (value.external_mutation_requested !== undefined && value.external_mutation_requested !== false) {
    throw new StateContractError(
      "external_mutation_blocked",
      "V1 safety.external_mutation_requested must be false.",
      403,
    );
  }
  return {
    action_mode: "draft_only",
    external_mutation_requested: false,
    blocked_actions: stringArray(value.blocked_actions ?? [
      "live publishing",
      "scheduling",
      "paid spend",
      "CRM mutation",
      "credential setup",
      "legal approval",
    ]),
    unsupported_claims: stringArray(value.unsupported_claims ?? []),
    evidence_gaps: stringArray(value.evidence_gaps ?? []),
  };
}

export function evidenceEntry(value) {
  if (!value || typeof value !== "object") {
    throw new StateContractError("invalid_evidence", "Evidence entry must be an object.");
  }
  if (!EVIDENCE_MODES.includes(value.mode)) {
    throw new StateContractError("invalid_evidence_mode", `Evidence mode must be ${EVIDENCE_MODES.join(", ")}.`);
  }
  return {
    mode: value.mode,
    observed_at: optionalString(value.observed_at),
    source_coverage: stringArray(value.source_coverage ?? []),
    limitations: stringArray(value.limitations ?? []),
    source_revision_ids: stringArray(value.source_revision_ids ?? []),
  };
}

export function artifactRevisionInput(value) {
  if (!value || typeof value !== "object") {
    throw new StateContractError("invalid_artifact", "Artifact revision must be an object.");
  }
  const status = value.status ?? "draft";
  if (!["draft", "ready_for_review", "blocked"].includes(status)) {
    throw new StateContractError(
      "invalid_artifact_status",
      "A new artifact revision must be draft, ready_for_review, or blocked. Approval requires a separate approval record.",
    );
  }
  return {
    artifact_type: requiredString(value.artifact_type, "artifact_type"),
    markdown_body: requiredString(value.markdown_body, "markdown_body"),
    consumed_context_revision: optionalString(value.consumed_context_revision),
    consumed_source_revisions: stringArray(value.consumed_source_revisions ?? []),
    evidence: (value.evidence ?? []).map(evidenceEntry),
    status,
    approvals: Array.isArray(value.approvals) ? structuredClone(value.approvals) : [],
    safety: safetyEnvelope(value.safety),
    metadata: value.metadata && typeof value.metadata === "object" ? structuredClone(value.metadata) : {},
  };
}

export function workstreamInput(value) {
  if (!value || typeof value !== "object") {
    throw new StateContractError("invalid_workstream", "Workstream state must be an object.");
  }
  if (!WORKSTREAM_STATUSES.includes(value.status)) {
    throw new StateContractError("invalid_workstream_status", `Workstream status must be ${WORKSTREAM_STATUSES.join(", ")}.`);
  }
  return {
    specialist: requiredString(value.specialist, "specialist"),
    status: value.status,
    latest_artifact_id: optionalString(value.latest_artifact_id),
    latest_artifact_revision: optionalPositiveInteger(value.latest_artifact_revision, "latest_artifact_revision"),
    blockers: stringArray(value.blockers ?? []),
    next_action: optionalString(value.next_action),
    handoff_id: optionalString(value.handoff_id),
  };
}

export function handoffCompletionState(value = "pending") {
  if (!HANDOFF_COMPLETION_STATES.includes(value)) {
    throw new StateContractError(
      "invalid_handoff_completion_state",
      `Handoff completion_state must be ${HANDOFF_COMPLETION_STATES.join(", ")}.`,
    );
  }
  return value;
}

export function workflowRunInput(value) {
  if (!value || typeof value !== "object") {
    throw new StateContractError(
      "invalid_workflow_run",
      "Workflow run must be an object.",
    );
  }
  const status = value.status ?? "running";
  if (!WORKFLOW_RUN_STATUSES.includes(status)) {
    throw new StateContractError(
      "invalid_workflow_run_status",
      `Workflow run status must be ${WORKFLOW_RUN_STATUSES.join(", ")}.`,
    );
  }
  if (status !== "running") {
    throw new StateContractError(
      "invalid_initial_workflow_run_status",
      "A workflow run must be created in running status.",
    );
  }
  return {
    route: requiredString(value.route, "route"),
    specialist: requiredString(value.specialist, "specialist"),
    context_revision: optionalString(value.context_revision),
    package_name: requiredString(value.package_name, "package_name"),
    package_version: requiredString(
      value.package_version,
      "package_version",
    ),
    input_envelope: objectValue(value.input_envelope, "input_envelope"),
    status,
    blockers: stringArray(value.blockers ?? []),
    next_action: optionalString(value.next_action),
  };
}

export function workflowAttemptInput(value) {
  if (!value || typeof value !== "object") {
    throw new StateContractError(
      "invalid_workflow_attempt",
      "Workflow attempt must be an object.",
    );
  }
  const attemptNumber = positiveInteger(
    value.attempt_number,
    "attempt_number",
  );
  if (!WORKFLOW_ATTEMPT_KINDS.includes(value.attempt_kind)) {
    throw new StateContractError(
      "invalid_workflow_attempt_kind",
      `Workflow attempt kind must be ${WORKFLOW_ATTEMPT_KINDS.join(", ")}.`,
    );
  }
  if (
    (value.attempt_kind === "initial" && attemptNumber !== 1) ||
    (value.attempt_kind === "format_repair" && attemptNumber !== 2)
  ) {
    throw new StateContractError(
      "invalid_workflow_attempt_number",
      "Initial workflow attempts use number 1 and format repairs use number 2.",
    );
  }
  if (!WORKFLOW_ATTEMPT_STATUSES.includes(value.status)) {
    throw new StateContractError(
      "invalid_workflow_attempt_status",
      `Workflow attempt status must be ${WORKFLOW_ATTEMPT_STATUSES.join(", ")}.`,
    );
  }
  const outputBody = optionalString(value.output_body);
  const errorCode = optionalString(value.error_code);
  const errorMessage = optionalString(value.error_message);
  if (value.status === "succeeded" && !outputBody) {
    throw new StateContractError(
      "workflow_attempt_output_required",
      "A succeeded workflow attempt requires output_body.",
    );
  }
  if (value.status === "tool_failed" && (!errorCode || !errorMessage)) {
    throw new StateContractError(
      "workflow_attempt_error_required",
      "A failed workflow tool attempt requires error_code and error_message.",
    );
  }
  return {
    attempt_number: attemptNumber,
    attempt_kind: value.attempt_kind,
    package_name: requiredString(value.package_name, "package_name"),
    package_version: requiredString(
      value.package_version,
      "package_version",
    ),
    context_revision: optionalString(value.context_revision),
    input_envelope: objectValue(value.input_envelope, "input_envelope"),
    output_body: outputBody,
    validation_errors: stringArray(value.validation_errors ?? []),
    status: value.status,
    error_code: errorCode,
    error_message: errorMessage,
  };
}

export function workflowRunUpdateInput(value) {
  if (!value || typeof value !== "object") {
    throw new StateContractError(
      "invalid_workflow_run",
      "Workflow run update must be an object.",
    );
  }
  if (!WORKFLOW_RUN_STATUSES.includes(value.status)) {
    throw new StateContractError(
      "invalid_workflow_run_status",
      `Workflow run status must be ${WORKFLOW_RUN_STATUSES.join(", ")}.`,
    );
  }
  const artifactId = optionalString(value.artifact_id);
  const artifactRevision = optionalPositiveInteger(
    value.artifact_revision,
    "artifact_revision",
  );
  if ((artifactId && !artifactRevision) || (!artifactId && artifactRevision)) {
    throw new StateContractError(
      "invalid_workflow_artifact_reference",
      "artifact_id and artifact_revision must be supplied together.",
    );
  }
  return {
    status: value.status,
    artifact_id: artifactId,
    artifact_revision: artifactRevision,
    handoff_id: optionalString(value.handoff_id),
    blockers: stringArray(value.blockers ?? []),
    next_action: optionalString(value.next_action),
    error_summary: optionalString(value.error_summary),
  };
}

export function stableHash(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function requiredString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new StateContractError("invalid_request", `${field} is required.`);
  }
  return value.trim();
}

export function requiredRawSource(value, field = "raw_source") {
  if (typeof value !== "string" || !value.trim()) {
    throw new StateContractError("invalid_request", `${field} is required.`);
  }
  return value;
}

export function optionalString(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new StateContractError("invalid_request", "Expected a string.");
  return value;
}

export function stringArray(value) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new StateContractError("invalid_request", "Expected an array of strings.");
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function optionalPositiveInteger(value, field) {
  if (value === undefined || value === null) return undefined;
  if (!Number.isInteger(value) || value < 1) {
    throw new StateContractError("invalid_request", `${field} must be a positive integer.`);
  }
  return value;
}

function positiveInteger(value, field) {
  if (!Number.isInteger(value) || value < 1) {
    throw new StateContractError(
      "invalid_request",
      `${field} must be a positive integer.`,
    );
  }
  return value;
}

function objectValue(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new StateContractError(
      "invalid_request",
      `${field} must be an object.`,
    );
  }
  return structuredClone(value);
}
