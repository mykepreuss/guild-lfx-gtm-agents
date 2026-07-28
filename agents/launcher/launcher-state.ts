import { z } from "zod";
import {
  suiteInstallOrder,
  type DelegatedRoute,
} from "./launcher-core.js";

export const workflowRunStatusSchema = z.enum([
  "running",
  "needs_input",
  "ready_for_review",
  "approved",
  "blocked",
  "failed",
]);

export const workflowAttemptSchema = z
  .object({
    run_id: z.string(),
    attempt_number: z.union([z.literal(1), z.literal(2)]),
    attempt_kind: z.enum(["initial", "format_repair"]),
    package_name: z.string(),
    package_version: z.string(),
    context_revision: z.string().nullable().optional(),
    input_envelope: z.record(z.string(), z.unknown()),
    output_body: z.string().nullable().optional(),
    validation_errors: z.array(z.string()).default([]),
    status: z.enum([
      "succeeded",
      "format_invalid",
      "safety_failed",
      "tool_failed",
    ]),
    error_code: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
    created_at: z.string().optional(),
  })
  .passthrough();

export const workflowRunSchema = z
  .object({
    run_id: z.string(),
    revision: z.number().int().positive(),
    route: z.string(),
    specialist: z.string(),
    context_revision: z.string().nullable().optional(),
    package_name: z.string(),
    package_version: z.string(),
    input_envelope: z.record(z.string(), z.unknown()),
    status: workflowRunStatusSchema,
    artifact_id: z.string().nullable().optional(),
    artifact_revision: z.number().int().positive().nullable().optional(),
    handoff_id: z.string().nullable().optional(),
    blockers: z.array(z.string()).default([]),
    next_action: z.string().nullable().optional(),
    error_summary: z.string().nullable().optional(),
    attempts: z.array(workflowAttemptSchema).default([]),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const artifactRecordSchema = z
  .object({
    artifact_id: z.string(),
    revision: z.number().int().positive(),
    artifact_type: z.string(),
    status: z.enum([
      "draft",
      "ready_for_review",
      "approved",
      "superseded",
      "blocked",
    ]),
    approvals: z
      .array(
        z
          .object({
            exact_approval_text: z.string(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

export const handoffRecordSchema = z
  .object({
    handoff_id: z.string(),
    revision: z.number().int().positive(),
    source_agent: z.string(),
    target_agent: z.string(),
    completion_state: z.string(),
  })
  .passthrough();

export const workstreamRecordSchema = z
  .object({
    specialist: z.string(),
    revision: z.number().int().positive(),
    status: z.enum([
      "not_started",
      "running",
      "needs_input",
      "ready_for_review",
      "approved",
      "blocked",
      "failed",
    ]),
    latest_artifact_id: z.string().nullable().optional(),
    latest_artifact_revision: z.number().int().positive().nullable().optional(),
    blockers: z.array(z.string()).default([]),
    next_action: z.string().nullable().optional(),
    handoff_id: z.string().nullable().optional(),
  })
  .passthrough();

export const createWorkflowRunRequestSchema = z.object({
  idempotency_key: z.string(),
  run_id: z.string(),
  route: z.string(),
  specialist: z.string(),
  context_revision: z.string().optional(),
  package_name: z.string(),
  package_version: z.string(),
  input_envelope: z.record(z.string(), z.unknown()),
  status: z.literal("running").optional(),
  blockers: z.array(z.string()).optional(),
  next_action: z.string().optional(),
});

export const recordWorkflowAttemptRequestSchema = z.object({
  runId: z.string(),
  idempotency_key: z.string(),
  attempt_number: z.union([z.literal(1), z.literal(2)]),
  attempt_kind: z.enum(["initial", "format_repair"]),
  package_name: z.string(),
  package_version: z.string(),
  context_revision: z.string().optional(),
  input_envelope: z.record(z.string(), z.unknown()),
  output_body: z.string().optional(),
  validation_errors: z.array(z.string()).optional(),
  status: z.enum([
    "succeeded",
    "format_invalid",
    "safety_failed",
    "tool_failed",
  ]),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
});

export const storeArtifactRequestSchema = z.object({
  idempotency_key: z.string(),
  artifact_type: z.string(),
  markdown_body: z.string(),
  consumed_context_revision: z.string().optional(),
  consumed_source_revisions: z.array(z.string()).optional(),
  evidence: z
    .array(
      z
        .object({
          mode: z.enum([
            "source_supplied",
            "connected_read_only",
            "live_monitoring",
          ]),
        })
        .passthrough(),
    )
    .optional(),
  status: z.enum(["draft", "ready_for_review", "blocked"]).optional(),
  safety: z
    .object({
      action_mode: z.literal("draft_only"),
      external_mutation_requested: z.literal(false),
      blocked_actions: z.array(z.string()).optional(),
      unsupported_claims: z.array(z.string()).optional(),
      evidence_gaps: z.array(z.string()).optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const readArtifactRequestSchema = z.object({
  artifactId: z.string(),
  revision: z.number().int().positive().optional(),
});

export const approveArtifactRequestSchema = z.object({
  artifactId: z.string(),
  idempotency_key: z.string(),
  revision: z.number().int().positive(),
  expected_revision: z.number().int().positive(),
  approval_text: z.string().min(1),
});

export const createHandoffRequestSchema = z.object({
  idempotency_key: z.string(),
  source_agent: z.string(),
  target_agent: z.string(),
  artifact_references: z
    .array(z.record(z.string(), z.unknown()))
    .optional(),
  context_revision: z.string().nullable().optional(),
  rationale: z.string(),
  completion_state: z
    .enum(["pending", "completed", "blocked", "failed"])
    .optional(),
});

export const updateHandoffRequestSchema = z.object({
  handoffId: z.string(),
  idempotency_key: z.string(),
  expected_revision: z.number().int().positive(),
  completion_state: z.enum(["pending", "completed", "blocked", "failed"]),
});

export const updateWorkflowRunRequestSchema = z.object({
  runId: z.string(),
  idempotency_key: z.string(),
  expected_revision: z.number().int().positive(),
  status: workflowRunStatusSchema,
  artifact_id: z.string().optional(),
  artifact_revision: z.number().int().positive().optional(),
  handoff_id: z.string().optional(),
  blockers: z.array(z.string()).optional(),
  next_action: z.string().optional(),
  error_summary: z.string().optional(),
});

export const readWorkflowRunRequestSchema = z.object({
  runId: z.string(),
});

export const listWorkflowRunsRequestSchema = z.object({});

export const readWorkstreamRequestSchema = z.object({
  specialist: z.string(),
});

export const updateWorkstreamRequestSchema = z.object({
  specialist: z.string(),
  idempotency_key: z.string(),
  expected_revision: z.number().int().nonnegative(),
  status: z.enum([
    "not_started",
    "running",
    "needs_input",
    "ready_for_review",
    "approved",
    "blocked",
    "failed",
  ]),
  latest_artifact_id: z.string().optional(),
  latest_artifact_revision: z.number().int().positive().optional(),
  blockers: z.array(z.string()).optional(),
  next_action: z.string().optional(),
  handoff_id: z.string().optional(),
});

export const workflowRunResponseSchema = z.object({
  data: workflowRunSchema,
});
export const workflowRunsResponseSchema = z.object({
  data: z.array(workflowRunSchema),
});
export const workflowAttemptResponseSchema = z.object({
  data: workflowAttemptSchema,
});
export const artifactResponseSchema = z.object({
  data: artifactRecordSchema,
});
export const handoffResponseSchema = z.object({
  data: handoffRecordSchema,
});
export const workstreamResponseSchema = z.object({
  data: workstreamRecordSchema.nullable().optional(),
});

export const launcherAgentStateSchema = z.object({
  next_run_sequence: z.number().int().nonnegative().default(0),
  active_run: z
    .object({
      request_fingerprint: z.string(),
      run_id: z.string(),
      run_sequence: z.number().int().positive(),
      route: z.string(),
    })
    .optional(),
  last_run_id: z.string().optional(),
});

export type LauncherAgentState = z.infer<typeof launcherAgentStateSchema>;
export type WorkflowRun = z.infer<typeof workflowRunSchema>;
export type WorkstreamRecord = z.infer<typeof workstreamRecordSchema>;

export function readLauncherAgentState(value: unknown): LauncherAgentState {
  const parsed = launcherAgentStateSchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : { next_run_sequence: 0 };
}

export function allocateRunIdentity(
  state: LauncherAgentState,
  sessionId: string,
  route: DelegatedRoute,
  requestText: string,
  contextRevision: string,
): {
  state: LauncherAgentState;
  runId: string;
  requestFingerprint: string;
  reused: boolean;
  idempotencyPrefix: string;
} {
  const requestFingerprint = textFingerprint(
    [route, requestText, contextRevision].join("\n"),
  );
  if (
    state.active_run?.request_fingerprint === requestFingerprint &&
    state.active_run.route === route
  ) {
    return {
      state,
      runId: state.active_run.run_id,
      requestFingerprint,
      reused: true,
      idempotencyPrefix: `launcher-${state.active_run.run_id}`,
    };
  }

  const runSequence = state.next_run_sequence + 1;
  const runId = uuidFromSeed(
    `${sessionId}:${runSequence}:${requestFingerprint}`,
  );
  const nextState: LauncherAgentState = {
    ...state,
    next_run_sequence: runSequence,
    active_run: {
      request_fingerprint: requestFingerprint,
      run_id: runId,
      run_sequence: runSequence,
      route,
    },
  };
  return {
    state: nextState,
    runId,
    requestFingerprint,
    reused: false,
    idempotencyPrefix: `launcher-${runId}`,
  };
}

export function completeRunState(
  state: LauncherAgentState,
  runId: string,
): LauncherAgentState {
  return {
    ...state,
    active_run: undefined,
    last_run_id: runId,
  };
}

export function resumeRequested(text: string): boolean {
  return /\b(?:resume|continue|pick up|carry on)\b/i.test(text);
}

export function evidenceModeFromArtifact(
  text: string,
): "source_supplied" | "connected_read_only" | "live_monitoring" {
  const match = text.match(
    /\b(source_supplied|connected_read_only|live_monitoring)\b/,
  );
  return (match?.[1] as
    | "source_supplied"
    | "connected_read_only"
    | "live_monitoring") ?? "source_supplied";
}

export function handoffRationale(text: string): string {
  const match = text.match(
    /## Downstream Handoff\s*([\s\S]*?)(?=\n##\s|\s*$)/i,
  );
  const value = match?.[1]?.trim();
  return value || "Return the completed artifact to Marketing OS for review.";
}

export function renderCockpitStatus(
  workstreams: WorkstreamRecord[],
  runs: WorkflowRun[],
): string {
  const latestBySpecialist = new Map<string, WorkflowRun>();
  for (const run of runs) {
    if (!latestBySpecialist.has(run.specialist)) {
      latestBySpecialist.set(run.specialist, run);
    }
  }

  const rows = suiteInstallOrder.map((entry) => {
    const workstream = workstreams.find(
      (candidate) => candidate.specialist === entry.displayName,
    );
    const run = latestBySpecialist.get(entry.displayName);
    const state = workstream?.status ?? run?.status ?? "not_started";
    const artifact = workstream?.latest_artifact_revision
      ? `r${workstream.latest_artifact_revision}`
      : run?.artifact_revision
        ? `r${run.artifact_revision}`
        : "—";
    const approval =
      state === "approved"
        ? "approved"
        : state === "ready_for_review"
          ? "pending"
          : "—";
    const blocker =
      workstream?.blockers?.[0] ?? run?.blockers?.[0] ?? "—";
    const next =
      workstream?.next_action ?? run?.next_action ?? "Start this workflow.";
    return `| ${entry.displayName} | ${state} | ${artifact} | ${approval} | ${escapeCell(
      blocker,
    )} | ${escapeCell(next)} |`;
  });

  const resumable = runs.filter((run) =>
    ["running", "needs_input"].includes(run.status),
  );
  return [
    "# Marketing OS Cockpit",
    "",
    "| Workstream | State | Artifact | Approval | Blocker | Next action |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    resumable.length
      ? `Resumable work: ${resumable
          .map((run) => `${run.specialist} (${run.run_id})`)
          .join(", ")}.`
      : "No incomplete workflow is waiting to resume.",
    "",
    "Status: cockpit state loaded",
    "No external action was performed.",
  ].join("\n");
}

export function renderArtifactApprovalReceipt({
  artifactId,
  artifactRevision,
  runId,
  specialist,
  approvalText,
}: {
  artifactId: string;
  artifactRevision: number;
  runId: string;
  specialist: string;
  approvalText: string;
}): string {
  return [
    "# Marketing OS Approval",
    "",
    `${specialist} artifact ${artifactId} revision ${artifactRevision} is approved.`,
    "",
    `Workflow run: ${runId}`,
    `Exact approval text: ${approvalText}`,
    "Status: approved",
    "This approval authorizes only the stored draft artifact. No publishing, scheduling, spend, CRM mutation, context publication, or other external action occurred.",
  ].join("\n");
}

export function renderCockpitReceipt({
  artifactId,
  artifactRevision,
  runId,
  packageVersion,
  contextRevision,
}: {
  artifactId: string;
  artifactRevision: number;
  runId: string;
  packageVersion: string;
  contextRevision: string;
}): string {
  return [
    "Cockpit record:",
    `- Artifact: ${artifactId} revision ${artifactRevision}`,
    `- Workflow run: ${runId}`,
    `- Specialist version: ${packageVersion}`,
    `- Context revision: ${contextRevision}`,
  ].join("\n");
}

export function textFingerprint(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  let third = 0x7f4a7c15;
  let fourth = 0x94d049bb;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
    third = Math.imul(third ^ (code + first), 0xc2b2ae35);
    fourth = Math.imul(fourth ^ (code + second), 0x27d4eb2f);
  }
  return [first, second, third, fourth]
    .map((valuePart) =>
      (valuePart >>> 0).toString(16).padStart(8, "0"),
    )
    .join("");
}

function uuidFromSeed(seed: string): string {
  const value = textFingerprint(seed).split("");
  value[12] = "4";
  const variant = Number.parseInt(value[16], 16);
  value[16] = ((variant & 0x3) | 0x8).toString(16);
  const hex = value.join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}
