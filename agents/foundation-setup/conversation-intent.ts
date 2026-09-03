import { z } from "zod";

export const builderContextFieldSchema = z.enum([
  "company_name",
  "description",
  "audiences",
  "goals",
  "channels",
  "constraints",
  "approved_claims",
  "do_not_use_claims",
]);

const fieldUpdateSchema = z.object({
  field: builderContextFieldSchema,
  operation: z.enum(["append", "replace", "remove"]),
  supporting_span: z.string().min(1),
});

const builderApprovalCommitmentSchema = z.enum([
  "explicit",
  "implicit",
  "none",
]);

export const builderSemanticActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("provide_or_answer_context"),
    candidate_refs: z.array(z.string()).length(1),
    approval_commitment: z.literal("none").default("none"),
    field_updates: z.array(fieldUpdateSchema).min(1).max(8),
  }),
  z.object({
    intent: z.literal("edit_context"),
    candidate_refs: z.array(z.string()).length(1),
    approval_commitment: z.literal("none").default("none"),
    field_updates: z.array(fieldUpdateSchema).min(1).max(8),
  }),
  z.object({
    intent: z.literal("approve_draft"),
    candidate_refs: z.array(z.string()).length(1),
    approval_commitment: builderApprovalCommitmentSchema,
    field_updates: z.array(fieldUpdateSchema).length(0).default([]),
  }),
  z.object({
    intent: z.literal("persistence_status"),
    candidate_refs: z.array(z.string()).max(1).default([]),
    approval_commitment: z.literal("none").default("none"),
    field_updates: z.array(fieldUpdateSchema).length(0).default([]),
  }),
  z.object({
    intent: z.literal("downstream_request"),
    candidate_refs: z.array(z.string()).length(0).default([]),
    approval_commitment: z.literal("none").default("none"),
    field_updates: z.array(fieldUpdateSchema).length(0).default([]),
  }),
  z.object({
    intent: z.literal("unclear"),
    candidate_refs: z.array(z.string()).length(0).default([]),
    approval_commitment: z.literal("none").default("none"),
    field_updates: z.array(fieldUpdateSchema).length(0).default([]),
  }),
]);

export type BuilderSemanticAction = z.infer<
  typeof builderSemanticActionSchema
>;

type LlmTask = {
  llm: {
    generateText(input: { prompt: string }): Promise<{ text: string }>;
  };
};

export async function resolveBuilderSemanticAction(
  text: string,
  stateSummary: {
    hasDraft: boolean;
    draftStatus?: string;
    missingFields: string[];
    openQuestions: string[];
    companyName?: string;
  },
  task: LlmTask,
): Promise<BuilderSemanticAction | undefined> {
  try {
    const result = await task.llm.generateText({
      prompt: builderSemanticPrompt(text, stateSummary),
    });
    const parsed = parseJsonObject(result.text);
    const action = builderSemanticActionSchema.safeParse(parsed);
    if (!action.success) return undefined;
    const allowedRefs = stateSummary.hasDraft ? ["draft_1"] : [];
    if (
      action.data.candidate_refs.some(
        (candidateRef) => !allowedRefs.includes(candidateRef),
      )
    ) {
      return undefined;
    }
    const normalizedText = text.toLocaleLowerCase();
    if (
      action.data.field_updates.some(
        (update) =>
          !normalizedText.includes(update.supporting_span.toLocaleLowerCase()),
      )
    ) {
      return undefined;
    }
    return action.data;
  } catch {
    return undefined;
  }
}

function builderSemanticPrompt(
  text: string,
  stateSummary: {
    hasDraft: boolean;
    draftStatus?: string;
    missingFields: string[];
    openQuestions: string[];
    companyName?: string;
  },
): string {
  return [
    "Interpret one stateful Company Context Builder turn. Return exactly one JSON object and no prose.",
    'Shape: {"intent":"provide_or_answer_context|edit_context|approve_draft|persistence_status|downstream_request|unclear","candidate_refs":["draft_1"],"approval_commitment":"explicit|implicit|none","field_updates":[{"field":"company_name|description|audiences|goals|channels|constraints|approved_claims|do_not_use_claims","operation":"append|replace|remove","supporting_span":"exact words copied from the user message"}]}',
    "Use only draft_1 when the current draft is the target. Never invent another candidate reference.",
    "Use provide_or_answer_context for facts that answer an open question or add company context.",
    "Use edit_context when the user asks to change, replace, correct, or remove existing context.",
    "Use persistence_status when the user asks or directs you to report whether the draft was saved, approved, or published, even without a question mark.",
    "Use approve_draft only when the user approves or positively reviews the current draft. Commitment is explicit only for a direct approval instruction or declaration; 'looks good' and 'I am happy with it' are implicit.",
    "For context or edit intents, return field updates whose supporting_span is copied exactly from the user message. Use append for additional values, replace only for an explicit replacement/correction, and remove only for an explicit removal.",
    "Use downstream_request for a request to create specialist marketing work rather than context.",
    "Use unclear if the message cannot be tied safely to the draft or one field.",
    `Current state: ${JSON.stringify(stateSummary)}`,
    `Available candidate refs: ${stateSummary.hasDraft ? "draft_1" : "none"}`,
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
