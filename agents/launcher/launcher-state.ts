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
    markdown_body: z.string(),
    consumed_context_revision: z.string().nullable().optional(),
    consumed_source_revisions: z.array(z.string()).default([]),
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
      .default([]),
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
            actor: z.string().default("workspace_user"),
            approved_at: z.string(),
          })
          .passthrough(),
      )
      .default([]),
    safety: z
      .object({
        action_mode: z.literal("draft_only"),
        external_mutation_requested: z.literal(false),
        blocked_actions: z.array(z.string()).default([]),
        unsupported_claims: z.array(z.string()).default([]),
        evidence_gaps: z.array(z.string()).default([]),
      })
      .optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const handoffRecordSchema = z
  .object({
    handoff_id: z.string(),
    revision: z.number().int().positive(),
    source_agent: z.string(),
    target_agent: z.string(),
    artifact_references: z.array(z.record(z.string(), z.unknown())).default([]),
    context_revision: z.string().nullable().optional(),
    rationale: z.string(),
    completion_state: z.enum(["pending", "completed", "blocked", "failed"]),
    created_at: z.string(),
    updated_at: z.string(),
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
    created_at: z.string(),
    updated_at: z.string(),
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

export const cockpitAuditEventSchema = z.object({
  sequence: z.number().int().positive(),
  occurred_at: z.string(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  revision: z.number().int().nonnegative(),
  status: z.string(),
  details: z.record(z.string(), z.unknown()).default({}),
});

export const launcherAgentStateSchema = z.object({
  schema_version: z.literal(1).default(1),
  canonical_session_id: z.string().optional(),
  canonical_session_created_at: z.string().optional(),
  next_run_sequence: z.number().int().nonnegative().default(0),
  next_audit_sequence: z.number().int().nonnegative().default(0),
  active_run: z
    .object({
      request_fingerprint: z.string(),
      run_id: z.string(),
      run_sequence: z.number().int().positive(),
      route: z.string(),
    })
    .optional(),
  last_run_id: z.string().optional(),
  runs: z.array(workflowRunSchema).default([]),
  artifacts: z.array(artifactRecordSchema).default([]),
  handoffs: z.array(handoffRecordSchema).default([]),
  workstreams: z.array(workstreamRecordSchema).default([]),
  audit_trail: z.array(cockpitAuditEventSchema).default([]),
  idempotency: z.record(z.string(), z.string()).default({}),
  published_context_id: z.string().optional(),
  published_context_revision: z.string().optional(),
  deleted_at: z.string().optional(),
});

export type LauncherAgentState = z.infer<typeof launcherAgentStateSchema>;
export type WorkflowRun = z.infer<typeof workflowRunSchema>;
export type WorkstreamRecord = z.infer<typeof workstreamRecordSchema>;
export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;
export type HandoffRecord = z.infer<typeof handoffRecordSchema>;
export type SessionCockpit = ReturnType<typeof createSessionCockpit>;

export function readLauncherAgentState(
  value: unknown,
  sessionId?: string,
): LauncherAgentState {
  const parsed = launcherAgentStateSchema.safeParse(value);
  const now = new Date().toISOString();
  const state = parsed.success
    ? parsed.data
    : launcherAgentStateSchema.parse({});
  return launcherAgentStateSchema.parse({
    ...state,
    canonical_session_id: state.canonical_session_id ?? sessionId,
    canonical_session_created_at:
      state.canonical_session_created_at ?? (sessionId ? now : undefined),
  });
}

const cockpitStateSoftLimitBytes = 6 * 1024 * 1024;

export function cockpitStateSizeBytes(state: LauncherAgentState): number {
  const text = JSON.stringify(state);
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

export function createSessionCockpit(
  initialState: LauncherAgentState,
  stateStore: {
    save(state: LauncherAgentState): Promise<void>;
  },
) {
  let state = launcherAgentStateSchema.parse(initialState);

  const current = (): LauncherAgentState => state;

  const commit = async (
    nextState: LauncherAgentState,
    event?: {
      action: string;
      entityType: string;
      entityId: string;
      revision: number;
      status: string;
      details?: Record<string, unknown>;
    },
  ): Promise<LauncherAgentState> => {
    let candidate = launcherAgentStateSchema.parse(nextState);
    if (event) {
      const sequence = candidate.next_audit_sequence + 1;
      candidate = launcherAgentStateSchema.parse({
        ...candidate,
        next_audit_sequence: sequence,
        audit_trail: [
          ...candidate.audit_trail,
          {
            sequence,
            occurred_at: new Date().toISOString(),
            action: event.action,
            entity_type: event.entityType,
            entity_id: event.entityId,
            revision: event.revision,
            status: event.status,
            details: event.details ?? {},
          },
        ],
      });
    }
    const size = cockpitStateSizeBytes(candidate);
    if (size > cockpitStateSoftLimitBytes) {
      throw new Error(
        `Canonical cockpit state reached ${size} bytes, above the 6 MiB safety ceiling. Export or delete older work before adding another artifact.`,
      );
    }
    await stateStore.save(candidate);
    state = candidate;
    return state;
  };

  const setState = async (
    nextState: LauncherAgentState,
  ): Promise<LauncherAgentState> => commit(nextState);

  const runsList = async (): Promise<z.infer<typeof workflowRunsResponseSchema>> => ({
    data: [...state.runs].sort((left, right) =>
      (right.updated_at ?? "").localeCompare(left.updated_at ?? ""),
    ),
  });

  const runGet = async (
    input: z.infer<typeof readWorkflowRunRequestSchema>,
  ): Promise<z.infer<typeof workflowRunResponseSchema>> => {
    const run = state.runs.find((candidate) => candidate.run_id === input.runId);
    if (!run) throw new Error(`Workflow run ${input.runId} was not found in this cockpit Chat.`);
    return { data: run };
  };

  const runCreate = async (
    input: z.infer<typeof createWorkflowRunRequestSchema>,
  ): Promise<z.infer<typeof workflowRunResponseSchema>> => {
    const existing = state.runs.find((candidate) => candidate.run_id === input.run_id);
    if (state.idempotency[input.idempotency_key] && existing) return { data: existing };
    if (existing) throw new Error(`Workflow run ${input.run_id} already exists.`);
    const now = new Date().toISOString();
    const run = workflowRunSchema.parse({
      run_id: input.run_id,
      revision: 1,
      route: input.route,
      specialist: input.specialist,
      context_revision: input.context_revision,
      package_name: input.package_name,
      package_version: input.package_version,
      input_envelope: input.input_envelope,
      status: input.status ?? "running",
      blockers: input.blockers ?? [],
      next_action: input.next_action,
      attempts: [],
      created_at: now,
      updated_at: now,
    });
    await commit(
      {
        ...state,
        runs: [run, ...state.runs],
        idempotency: {
          ...state.idempotency,
          [input.idempotency_key]: `run:${run.run_id}`,
        },
      },
      {
        action: "workflow_run_created",
        entityType: "workflow_run",
        entityId: run.run_id,
        revision: run.revision,
        status: run.status,
        details: { route: run.route, specialist: run.specialist },
      },
    );
    return { data: run };
  };

  const attemptRecord = async (
    input: z.infer<typeof recordWorkflowAttemptRequestSchema>,
  ): Promise<z.infer<typeof workflowAttemptResponseSchema>> => {
    const runIndex = state.runs.findIndex((candidate) => candidate.run_id === input.runId);
    if (runIndex < 0) throw new Error(`Workflow run ${input.runId} was not found.`);
    const existing = state.runs[runIndex]?.attempts.find(
      (attempt) => attempt.attempt_number === input.attempt_number,
    );
    if (state.idempotency[input.idempotency_key] && existing) return { data: existing };
    if (existing) throw new Error(`Attempt ${input.attempt_number} already exists for ${input.runId}.`);
    const attempt = workflowAttemptSchema.parse({
      run_id: input.runId,
      attempt_number: input.attempt_number,
      attempt_kind: input.attempt_kind,
      package_name: input.package_name,
      package_version: input.package_version,
      context_revision: input.context_revision,
      input_envelope: input.input_envelope,
      output_body: input.output_body,
      validation_errors: input.validation_errors ?? [],
      status: input.status,
      error_code: input.error_code,
      error_message: input.error_message,
      created_at: new Date().toISOString(),
    });
    const run = state.runs[runIndex]!;
    const updatedRun = workflowRunSchema.parse({
      ...run,
      attempts: [...run.attempts, attempt],
      updated_at: new Date().toISOString(),
    });
    const runs = [...state.runs];
    runs[runIndex] = updatedRun;
    await commit(
      {
        ...state,
        runs,
        idempotency: {
          ...state.idempotency,
          [input.idempotency_key]: `attempt:${input.runId}:${input.attempt_number}`,
        },
      },
      {
        action: "workflow_attempt_recorded",
        entityType: "workflow_attempt",
        entityId: `${input.runId}:${input.attempt_number}`,
        revision: input.attempt_number,
        status: attempt.status,
        details: {
          attempt_kind: attempt.attempt_kind,
          validation_error_count: attempt.validation_errors.length,
        },
      },
    );
    return { data: attempt };
  };

  const runUpdate = async (
    input: z.infer<typeof updateWorkflowRunRequestSchema>,
  ): Promise<z.infer<typeof workflowRunResponseSchema>> => {
    const index = state.runs.findIndex((candidate) => candidate.run_id === input.runId);
    if (index < 0) throw new Error(`Workflow run ${input.runId} was not found.`);
    const currentRun = state.runs[index]!;
    if (state.idempotency[input.idempotency_key]) return { data: currentRun };
    if (currentRun.revision !== input.expected_revision) {
      throw new Error(
        `Workflow run revision conflict: expected ${input.expected_revision}, found ${currentRun.revision}.`,
      );
    }
    const updated = workflowRunSchema.parse({
      ...currentRun,
      revision: currentRun.revision + 1,
      status: input.status,
      artifact_id: input.artifact_id ?? currentRun.artifact_id,
      artifact_revision: input.artifact_revision ?? currentRun.artifact_revision,
      handoff_id: input.handoff_id ?? currentRun.handoff_id,
      blockers: input.blockers ?? currentRun.blockers,
      next_action: input.next_action ?? currentRun.next_action,
      error_summary: input.error_summary ?? currentRun.error_summary,
      updated_at: new Date().toISOString(),
    });
    const runs = [...state.runs];
    runs[index] = updated;
    await commit(
      {
        ...state,
        runs,
        idempotency: {
          ...state.idempotency,
          [input.idempotency_key]: `run:${updated.run_id}`,
        },
      },
      {
        action: "workflow_run_updated",
        entityType: "workflow_run",
        entityId: updated.run_id,
        revision: updated.revision,
        status: updated.status,
      },
    );
    return { data: updated };
  };

  const artifactStore = async (
    input: z.infer<typeof storeArtifactRequestSchema>,
  ): Promise<z.infer<typeof artifactResponseSchema>> => {
    const existingRef = state.idempotency[input.idempotency_key];
    if (existingRef?.startsWith("artifact:")) {
      const existing = state.artifacts.find(
        (candidate) => `artifact:${candidate.artifact_id}:${candidate.revision}` === existingRef,
      );
      if (existing) return { data: existing };
    }
    const artifactId = uuidFromSeed(`${state.canonical_session_id ?? "session"}:${input.idempotency_key}`);
    const prior = state.artifacts.filter((candidate) => candidate.artifact_id === artifactId);
    const revision = prior.length + 1;
    const now = new Date().toISOString();
    const artifact = artifactRecordSchema.parse({
      artifact_id: artifactId,
      revision,
      artifact_type: input.artifact_type,
      markdown_body: input.markdown_body,
      consumed_context_revision: input.consumed_context_revision,
      consumed_source_revisions: input.consumed_source_revisions ?? [],
      evidence: input.evidence ?? [],
      status: input.status ?? "draft",
      approvals: [],
      safety: input.safety,
      metadata: input.metadata ?? {},
      created_at: now,
      updated_at: now,
    });
    await commit(
      {
        ...state,
        artifacts: [...state.artifacts, artifact],
        idempotency: {
          ...state.idempotency,
          [input.idempotency_key]: `artifact:${artifact.artifact_id}:${artifact.revision}`,
        },
      },
      {
        action: "artifact_revision_stored",
        entityType: "artifact",
        entityId: artifact.artifact_id,
        revision: artifact.revision,
        status: artifact.status,
        details: { artifact_type: artifact.artifact_type },
      },
    );
    return { data: artifact };
  };

  const artifactGet = async (
    input: z.infer<typeof readArtifactRequestSchema>,
  ): Promise<z.infer<typeof artifactResponseSchema>> => {
    const candidates = state.artifacts.filter(
      (candidate) =>
        candidate.artifact_id === input.artifactId &&
        (input.revision === undefined || candidate.revision === input.revision),
    );
    const artifact = [...candidates].sort((left, right) => right.revision - left.revision)[0];
    if (!artifact) throw new Error(`Artifact ${input.artifactId} was not found in this cockpit Chat.`);
    return { data: artifact };
  };

  const artifactApprove = async (
    input: z.infer<typeof approveArtifactRequestSchema>,
  ): Promise<z.infer<typeof artifactResponseSchema>> => {
    const index = state.artifacts.findIndex(
      (candidate) =>
        candidate.artifact_id === input.artifactId &&
        candidate.revision === input.revision,
    );
    if (index < 0) throw new Error(`Artifact ${input.artifactId} revision ${input.revision} was not found.`);
    const currentArtifact = state.artifacts[index]!;
    if (state.idempotency[input.idempotency_key]) return { data: currentArtifact };
    if (currentArtifact.revision !== input.expected_revision) {
      throw new Error(
        `Artifact revision conflict: expected ${input.expected_revision}, found ${currentArtifact.revision}.`,
      );
    }
    if (currentArtifact.status !== "ready_for_review") {
      throw new Error(`Artifact is ${currentArtifact.status}, not ready_for_review.`);
    }
    const updated = artifactRecordSchema.parse({
      ...currentArtifact,
      status: "approved",
      approvals: [
        ...currentArtifact.approvals,
        {
          exact_approval_text: input.approval_text,
          actor: "workspace_user",
          approved_at: new Date().toISOString(),
        },
      ],
      updated_at: new Date().toISOString(),
    });
    const artifacts = [...state.artifacts];
    artifacts[index] = updated;
    await commit(
      {
        ...state,
        artifacts,
        idempotency: {
          ...state.idempotency,
          [input.idempotency_key]: `artifact:${updated.artifact_id}:${updated.revision}`,
        },
      },
      {
        action: "artifact_revision_approved",
        entityType: "artifact",
        entityId: updated.artifact_id,
        revision: updated.revision,
        status: updated.status,
        details: { exact_approval_text: input.approval_text },
      },
    );
    return { data: updated };
  };

  const handoffCreate = async (
    input: z.infer<typeof createHandoffRequestSchema>,
  ): Promise<z.infer<typeof handoffResponseSchema>> => {
    const existingRef = state.idempotency[input.idempotency_key];
    if (existingRef?.startsWith("handoff:")) {
      const existing = state.handoffs.find(
        (candidate) => `handoff:${candidate.handoff_id}` === existingRef,
      );
      if (existing) return { data: existing };
    }
    const now = new Date().toISOString();
    const handoff = handoffRecordSchema.parse({
      handoff_id: uuidFromSeed(`${state.canonical_session_id ?? "session"}:${input.idempotency_key}`),
      revision: 1,
      source_agent: input.source_agent,
      target_agent: input.target_agent,
      artifact_references: input.artifact_references ?? [],
      context_revision: input.context_revision,
      rationale: input.rationale,
      completion_state: input.completion_state ?? "pending",
      created_at: now,
      updated_at: now,
    });
    await commit(
      {
        ...state,
        handoffs: [...state.handoffs, handoff],
        idempotency: {
          ...state.idempotency,
          [input.idempotency_key]: `handoff:${handoff.handoff_id}`,
        },
      },
      {
        action: "handoff_created",
        entityType: "handoff",
        entityId: handoff.handoff_id,
        revision: handoff.revision,
        status: handoff.completion_state,
      },
    );
    return { data: handoff };
  };

  const handoffUpdate = async (
    input: z.infer<typeof updateHandoffRequestSchema>,
  ): Promise<z.infer<typeof handoffResponseSchema>> => {
    const index = state.handoffs.findIndex(
      (candidate) => candidate.handoff_id === input.handoffId,
    );
    if (index < 0) throw new Error(`Handoff ${input.handoffId} was not found.`);
    const currentHandoff = state.handoffs[index]!;
    if (state.idempotency[input.idempotency_key]) return { data: currentHandoff };
    if (currentHandoff.revision !== input.expected_revision) {
      throw new Error(
        `Handoff revision conflict: expected ${input.expected_revision}, found ${currentHandoff.revision}.`,
      );
    }
    const updated = handoffRecordSchema.parse({
      ...currentHandoff,
      revision: currentHandoff.revision + 1,
      completion_state: input.completion_state,
      updated_at: new Date().toISOString(),
    });
    const handoffs = [...state.handoffs];
    handoffs[index] = updated;
    await commit(
      {
        ...state,
        handoffs,
        idempotency: {
          ...state.idempotency,
          [input.idempotency_key]: `handoff:${updated.handoff_id}`,
        },
      },
      {
        action: "handoff_updated",
        entityType: "handoff",
        entityId: updated.handoff_id,
        revision: updated.revision,
        status: updated.completion_state,
      },
    );
    return { data: updated };
  };

  const workstreamRead = async (
    input: z.infer<typeof readWorkstreamRequestSchema>,
  ): Promise<z.infer<typeof workstreamResponseSchema>> => ({
    data:
      state.workstreams.find(
        (candidate) => candidate.specialist === input.specialist,
      ) ?? null,
  });

  const workstreamUpdate = async (
    input: z.infer<typeof updateWorkstreamRequestSchema>,
  ): Promise<z.infer<typeof workstreamResponseSchema>> => {
    const index = state.workstreams.findIndex(
      (candidate) => candidate.specialist === input.specialist,
    );
    const currentWorkstream = index >= 0 ? state.workstreams[index] : undefined;
    if (state.idempotency[input.idempotency_key] && currentWorkstream) {
      return { data: currentWorkstream };
    }
    const currentRevision = currentWorkstream?.revision ?? 0;
    if (currentRevision !== input.expected_revision) {
      throw new Error(
        `Workstream revision conflict: expected ${input.expected_revision}, found ${currentRevision}.`,
      );
    }
    const now = new Date().toISOString();
    const updated = workstreamRecordSchema.parse({
      specialist: input.specialist,
      revision: currentRevision + 1,
      status: input.status,
      latest_artifact_id:
        input.latest_artifact_id ?? currentWorkstream?.latest_artifact_id,
      latest_artifact_revision:
        input.latest_artifact_revision ??
        currentWorkstream?.latest_artifact_revision,
      blockers: input.blockers ?? currentWorkstream?.blockers ?? [],
      next_action: input.next_action ?? currentWorkstream?.next_action,
      handoff_id: input.handoff_id ?? currentWorkstream?.handoff_id,
      created_at: currentWorkstream?.created_at ?? now,
      updated_at: now,
    });
    const workstreams = [...state.workstreams];
    if (index >= 0) workstreams[index] = updated;
    else workstreams.push(updated);
    await commit(
      {
        ...state,
        workstreams,
        idempotency: {
          ...state.idempotency,
          [input.idempotency_key]: `workstream:${updated.specialist}`,
        },
      },
      {
        action: "workstream_updated",
        entityType: "workstream",
        entityId: updated.specialist,
        revision: updated.revision,
        status: updated.status,
      },
    );
    return { data: updated };
  };

  const recordContextPublication = async ({
    contextId,
    contextRevision,
    artifactId,
    artifactRevision,
  }: {
    contextId: string;
    contextRevision: string;
    artifactId: string;
    artifactRevision: number;
  }): Promise<void> => {
    await commit(
      {
        ...state,
        published_context_id: contextId,
        published_context_revision: contextRevision,
      },
      {
        action: "workspace_context_published",
        entityType: "workspace_context",
        entityId: contextId,
        revision: artifactRevision,
        status: "published",
        details: { artifact_id: artifactId, artifact_revision: artifactRevision },
      },
    );
  };

  const deleteCockpit = async (): Promise<void> => {
    const now = new Date().toISOString();
    const cleared = readLauncherAgentState(
      {
        schema_version: 1,
        canonical_session_id: state.canonical_session_id,
        canonical_session_created_at: state.canonical_session_created_at,
        deleted_at: now,
      },
      state.canonical_session_id,
    );
    await commit(cleared, {
      action: "cockpit_state_deleted",
      entityType: "cockpit",
      entityId: state.canonical_session_id ?? "current-session",
      revision: 1,
      status: "deleted",
    });
  };

  return {
    current,
    setState,
    runsList,
    runGet,
    runCreate,
    attemptRecord,
    runUpdate,
    artifactStore,
    artifactGet,
    artifactApprove,
    handoffCreate,
    handoffUpdate,
    workstreamRead,
    workstreamUpdate,
    recordContextPublication,
    deleteCockpit,
  };
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
    latestBySpecialist.set(run.specialist, run);
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
        ? "Approved"
        : state === "ready_for_review"
          ? "Pending"
          : "—";
    const blocker =
      workstream?.blockers?.[0] ?? run?.blockers?.[0] ?? "—";
    const next =
      workstream?.next_action ?? run?.next_action ?? "Start this workflow.";
    return `| ${entry.displayName} | ${displayWorkstreamState(state)} | ${artifact} | ${approval} | ${escapeCell(
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
    "This Chat is the canonical Marketing OS cockpit. Resume this Chat to keep using these artifacts, approvals, workstreams, and handoffs.",
    "Status: canonical cockpit state loaded",
    "No external action was performed.",
  ].join("\n");
}

function displayWorkstreamState(value: string): string {
  const labels: Record<string, string> = {
    not_started: "Not started",
    running: "In progress",
    needs_input: "Needs input",
    ready_for_review: "Ready for review",
    approved: "Approved",
    blocked: "Blocked",
    failed: "Failed",
  };
  return labels[value] ?? value.replace(/_/g, " ");
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
