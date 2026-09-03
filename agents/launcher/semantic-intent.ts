import { z } from "zod";

export const launcherSemanticIntentSchema = z.enum([
  "read_artifact",
  "approve_artifact",
  "answer_pending_workflow",
  "new_workflow_request",
  "unclear",
]);

export const approvalCommitmentSchema = z.enum([
  "explicit",
  "implicit",
  "none",
]);

export const launcherSemanticActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("read_artifact"),
    candidate_refs: z.array(z.string()).max(1).default([]),
    approval_commitment: z.literal("none").default("none"),
  }),
  z.object({
    intent: z.literal("approve_artifact"),
    candidate_refs: z.array(z.string()).max(1).default([]),
    approval_commitment: approvalCommitmentSchema,
  }),
  z.object({
    intent: z.literal("answer_pending_workflow"),
    candidate_refs: z.array(z.string()).length(1),
    approval_commitment: z.literal("none").default("none"),
  }),
  z.object({
    intent: z.literal("new_workflow_request"),
    candidate_refs: z.array(z.string()).length(0).default([]),
    approval_commitment: z.literal("none").default("none"),
  }),
  z.object({
    intent: z.literal("unclear"),
    candidate_refs: z.array(z.string()).length(0).default([]),
    approval_commitment: z.literal("none").default("none"),
  }),
]);

export type LauncherSemanticAction = z.infer<
  typeof launcherSemanticActionSchema
>;

export type LauncherSemanticCandidate = {
  ref: string;
  kind: "artifact" | "workflow";
  workstream: string;
  revision?: number;
  status: string;
  is_last_run?: boolean;
  blockers?: string[];
  next_action?: string | null;
  outstanding_questions?: string[];
};

type LlmTask = {
  llm: {
    generateText(input: { prompt: string }): Promise<{ text: string }>;
  };
};

export async function resolveLauncherSemanticAction(
  text: string,
  candidates: LauncherSemanticCandidate[],
  task: LlmTask,
): Promise<LauncherSemanticAction | undefined> {
  try {
    const result = await task.llm.generateText({
      prompt: launcherSemanticPrompt(text, candidates),
    });
    const parsed = parseJsonObject(result.text);
    const action = launcherSemanticActionSchema.safeParse(parsed);
    if (!action.success) return undefined;
    if (
      action.data.candidate_refs.some(
        (candidateRef) =>
          !candidates.some((candidate) => candidate.ref === candidateRef),
      )
    ) {
      return undefined;
    }
    return action.data;
  } catch {
    return undefined;
  }
}

function launcherSemanticPrompt(
  text: string,
  candidates: LauncherSemanticCandidate[],
): string {
  return [
    "Interpret one Marketing OS chat turn. Return exactly one JSON object and no prose.",
    'Shape: {"intent":"read_artifact|approve_artifact|answer_pending_workflow|new_workflow_request|unclear","candidate_refs":["candidate_ref"],"approval_commitment":"explicit|implicit|none"}',
    "Select only candidate refs listed below. Never invent an artifact id, revision, run id, or candidate ref.",
    "Use read_artifact when the user asks to see, show, open, retrieve, or recap a stored draft or artifact.",
    "Use approve_artifact only for approval or positive-review language about a stored artifact.",
    "Approval commitment is explicit only when the user directly instructs approval or declares the artifact approved. Positive sentiment such as 'looks good' or 'I am happy with it' is implicit.",
    "Use answer_pending_workflow when the message answers or supplements one waiting workflow. Select exactly one workflow candidate.",
    "Use new_workflow_request when the user clearly asks to start different work rather than answer waiting questions.",
    "Use unclear when the intent or target cannot be resolved safely. For unclear, return no candidate refs.",
    `Candidates: ${JSON.stringify(candidates)}`,
    `User message: ${JSON.stringify(text)}`,
  ].join("\n");
}

function parseJsonObject(text: string): unknown | undefined {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  for (const value of [
    trimmed,
    fenced,
    start >= 0 && end > start ? trimmed.slice(start, end + 1) : undefined,
  ]) {
    if (!value) continue;
    try {
      return JSON.parse(value);
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}
