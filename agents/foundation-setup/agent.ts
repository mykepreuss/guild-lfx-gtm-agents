import {
  agent,
  guildTools,
  output as agentOutput,
  pick,
  type GuildService,
  type Task,
} from "@guildai/agents-sdk";
import { z } from "zod";

const artifactValues = [
  "company-context",
  "messaging-source",
  "brand-kit",
  "audience-segments",
  "channel-registry",
  "proof-and-constraints",
  "dashboard-signals",
] as const;

const agentValues = [
  "Company Context Builder",
  "Market Signal",
  "ICP",
  "Audience Segmentation",
  "Messaging",
  "Branding And Pitch Deck",
  "Social Monitoring And Content",
  "Campaigns And Paid Media",
] as const;

const artifactSchema = z.enum(artifactValues);
const knownAgentSchema = z.enum(agentValues);
const evidenceStatusSchema = z.enum(["approved", "user_supplied", "assumption", "missing", "blocked", "do_not_use"]);
const packetStatusSchema = z.enum(["ready_for_review", "needs_input", "blocked"]);
const artifactStatusSchema = z.enum(["draft", "needs_input", "blocked"]);
const readinessSchema = z.enum(["blocked", "draft", "review_ready"]);
const conversationIntentSchema = z.enum([
  "source_available",
  "attachment_unreadable",
  "save_state_question",
  "missing_context",
  "downstream_request",
  "downstream_request_without_context",
  "approval_or_edit",
]);

const defaultRequestedArtifacts = [...artifactValues];
const defaultConstraints = [
  "No live publishing.",
  "No scheduling.",
  "No paid media spend.",
  "No CRM activation.",
  "No credential setup.",
  "No workspace install.",
  "No workspace context publish except through the exact approved Company Context Builder publish confirmation.",
  "No context artifact persistence outside the canonical Launcher Chat or this direct Builder session.",
  "No trigger setup.",
  "No visibility changes.",
  "No legal, compliance, pricing, security, performance, or production-readiness approval is implied.",
];

const inputSchema = z
  .object({
    type: z.literal("text").describe("Guild canonical text input type."),
    text: z.string().describe("Guild canonical text input body."),
  });

const claimSchema = z.object({
  claim: z.string(),
  status: evidenceStatusSchema,
  source: z.string().optional(),
  notes: z.string().optional(),
});

const approvalGateSchema = z.object({
  ownerRole: z.string(),
  decision: z.string(),
  requiredBefore: z.string(),
  status: z.enum(["needed", "approved", "blocked"]),
});

const structuredOutputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  status: packetStatusSchema,
  conversationIntent: conversationIntentSchema,
  persistenceState: z.object({
    drafted_in_session: z.boolean(),
    approved_in_session: z.boolean(),
    saved_to_workspace_context: z.boolean(),
    saved_to_context_artifacts: z.boolean(),
    workspace_context_id: z.string().optional(),
    workspace_context_draft_id: z.string().optional(),
    workspace_context_previous_id: z.string().nullable().optional(),
    workspace_context_status: z.enum(["not_requested", "approved_pending_publish", "published", "blocked"]).optional(),
    workspace_context_summary: z.string().optional(),
    workspace_context_publish_path: z.enum(["host_bridge", "official_guild_tools"]).optional(),
    workspace_context_rollback_note: z.string().optional(),
    source_references: z.array(z.string()).optional(),
    context_artifact_references: z.array(z.string()).optional(),
    persistence_note: z.string(),
  }),
  consumedContext: z.object({
    used: z.array(z.string()),
    missing: z.array(z.string()),
    sourceLabels: z.array(z.string()),
  }),
  contextArtifacts: z.object({
    companyContext: z.object({
      status: artifactStatusSchema,
      companyName: z.string(),
      category: z.string(),
      primaryAudiences: z.array(z.string()),
      goals: z.array(z.string()),
      missingContext: z.array(z.string()),
    }),
    messagingSource: z.object({
      status: artifactStatusSchema,
      overview: z.string(),
      positioning: z.string(),
      proofNeeds: z.array(z.string()),
      answerReadyLanguage: z.array(z.string()),
    }),
    brandKit: z.object({
      status: artifactStatusSchema,
      voice: z.string(),
      visualDirection: z.string(),
      constraints: z.array(z.string()),
    }),
    audienceSegments: z.array(
      z.object({
        status: artifactStatusSchema,
        name: z.string(),
        description: z.string(),
        evidenceStatus: evidenceStatusSchema,
        missingEvidence: z.array(z.string()),
      }),
    ),
    channelRegistry: z.object({
      status: artifactStatusSchema,
      approvedChannels: z.array(z.string()),
      channelsTbd: z.array(z.string()),
      blockedActions: z.array(z.string()),
    }),
    proofAndConstraints: z.object({
      status: artifactStatusSchema,
      approvedClaims: z.array(claimSchema),
      blockedClaims: z.array(claimSchema),
      constraints: z.array(z.string()),
    }),
    dashboardSignals: z.object({
      status: artifactStatusSchema,
      readiness: readinessSchema,
      blockers: z.array(z.string()),
      nextReviewSignals: z.array(z.string()),
    }),
  }),
  workspaceContextDraft: z.string(),
  approvedFacts: z.array(claimSchema),
  extractedClaims: z.array(claimSchema),
  proofBackedClaims: z.array(claimSchema),
  claimsNeedingApproval: z.array(claimSchema),
  assumptionsAndMissingEvidence: z.array(claimSchema),
  openQuestions: z.array(z.string()),
  approvalGates: z.array(approvalGateSchema),
  aeoReadiness: z.object({
    status: readinessSchema,
    entityClarity: z.string(),
    answerReadyOpportunities: z.array(z.string()),
    missingProof: z.array(z.string()),
    recommendedWebInputs: z.array(z.string()),
  }),
  statusPayload: z.object({
    companyName: z.string(),
    readiness: readinessSchema,
    nextAgents: z.array(knownAgentSchema),
    blockers: z.array(z.string()),
    requiredArtifacts: z.array(artifactSchema),
    evidence_mode: z.literal("source_supplied"),
    observed_at: z.string().nullable(),
    source_coverage: z.array(z.string()),
    coverage_limitations: z.array(z.string()),
    safety: z.object({
      action_mode: z.literal("draft_only"),
      external_mutation_requested: z.literal(false),
      blocked_actions: z.array(z.string()),
      unsupported_claims: z.array(z.string()),
      evidence_gaps: z.array(z.string()),
    }),
  }),
  downstreamHandoff: z.array(
    z.object({
      agent: knownAgentSchema,
      receives: z.array(artifactSchema),
      reason: z.string(),
    }),
  ),
  markdownPacket: z.string(),
});

const outputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const llmOutputSchema = structuredOutputSchema.omit({ type: true, text: true, markdownPacket: true }).extend({
  type: z.literal("text").optional(),
  text: z.string().optional(),
  markdownPacket: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof structuredOutputSchema>;
type Claim = z.infer<typeof claimSchema>;
type ConversationIntent = z.infer<typeof conversationIntentSchema>;
type AudienceSegment = Output["contextArtifacts"]["audienceSegments"][number];
type MarketerContextPacket = {
  companyName: string;
  description: string;
  audiences: string[];
  goals: string[];
  approvedClaims: string[];
  channels: string[];
  constraints: string[];
};
type WorkspaceContextAudit = z.infer<typeof workspaceContextAuditSchema>;
type WorkspaceContextCompaction = z.infer<typeof workspaceContextCompactionSchema>;
type CompactedWorkspaceContext = {
  brief: string;
  sourceCorpusSummary: string;
  audit: WorkspaceContextAudit;
  estimatedSourceTokens: number;
  estimatedBriefTokens: number;
  regeneratedAfterAudit: boolean;
};
type WorkspaceContextCompactionResult =
  | { status: "ready"; context: CompactedWorkspaceContext }
  | { status: "blocked"; reason: string; audit?: WorkspaceContextAudit; cleanedSourceText?: string };
const agentStateSchema = z.object({
  lastOutput: structuredOutputSchema.optional(),
  approvedOutput: structuredOutputSchema.optional(),
  lastSourceText: z.string().optional(),
  approvedSourceText: z.string().optional(),
  approvedAt: z.string().optional(),
  workspaceContextId: z.string().optional(),
  workspaceContextStatus: z.enum(["not_requested", "approved_pending_publish", "published", "blocked"]).optional(),
  workspaceContextSummary: z.string().optional(),
  workspaceContextDraftId: z.string().optional(),
  workspaceContextPreviousId: z.string().nullable().optional(),
  workspaceContextPublishPath: z.enum(["host_bridge", "official_guild_tools"]).optional(),
  workspaceId: z.string().optional(),
  durableSourceId: z.string().optional(),
  durableSourceRevision: z.number().int().positive().optional(),
  durableContextArtifactId: z.string().optional(),
  durableContextArtifactRevision: z.number().int().positive().optional(),
  durableContextArtifactStatus: z.enum(["draft", "ready_for_review", "approved", "blocked"]).optional(),
  durableContextFingerprint: z.string().optional(),
  durablePublishedContextRevision: z.number().int().positive().optional(),
});
type AgentState = z.infer<typeof agentStateSchema>;
type PublishedWorkspaceContext = {
  ready: boolean;
  workspaceId: string;
  workspaceFullName: string;
  contextId?: string;
  compiled: string;
  companyName?: string;
};

const evidenceEntrySchema = z.object({
  mode: z.literal("source_supplied"),
  observed_at: z.string().optional(),
  source_coverage: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  source_revision_ids: z.array(z.string()).optional(),
});

const sourceRecordSchema = z.object({
  source_id: z.string(),
  revision: z.number().int().positive(),
  deletion_state: z.enum(["retained", "deleted"]),
  raw_source: z.string().optional(),
}).passthrough();

const sourceStoreRequestSchema = z.object({
  idempotency_key: z.string(),
  source_id: z.string(),
  raw_source: z.string().min(1),
  evidence: evidenceEntrySchema,
  provenance: z.record(z.string(), z.unknown()).optional(),
});

const sourceResponseSchema = z.object({ data: sourceRecordSchema });

const sourceReadRequestSchema = z.object({
  sourceId: z.string(),
  revision: z.number().int().positive(),
});

const contextArtifactRecordSchema = z.object({
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
      z.object({ exact_approval_text: z.string() }).passthrough(),
    )
    .default([]),
}).passthrough();

const contextArtifactStoreRequestSchema = z.object({
  idempotency_key: z.string(),
  artifact_id: z.string(),
  artifact_type: z.literal("company-context"),
  markdown_body: z.string().min(1),
  consumed_context_revision: z.string().optional(),
  consumed_source_revisions: z.array(z.string()),
  evidence: z.array(evidenceEntrySchema),
  status: z.enum(["ready_for_review", "blocked"]),
  safety: z.object({
    action_mode: z.literal("draft_only"),
    external_mutation_requested: z.literal(false),
    blocked_actions: z.array(z.string()),
    unsupported_claims: z.array(z.string()),
    evidence_gaps: z.array(z.string()),
  }),
  metadata: z.record(z.string(), z.unknown()),
});

const contextArtifactReadRequestSchema = z.object({
  artifactId: z.string(),
  revision: z.number().int().positive(),
});

const contextArtifactApproveRequestSchema = z.object({
  artifactId: z.string(),
  idempotency_key: z.string(),
  revision: z.number().int().positive(),
  expected_revision: z.number().int().positive(),
  approval_text: z.string().min(1),
});

const contextArtifactResponseSchema = z.object({
  data: contextArtifactRecordSchema,
});

const contextSnapshotSchema = z.object({
  workspace: z.record(z.string(), z.unknown()),
  published_context_revision: z.number().int().positive(),
  guild_context_id: z.string().nullable().optional(),
  rollback_context_id: z.string().nullable().optional(),
  compiled_brief: z.string(),
  readiness: z.string(),
  source_references: z.array(z.string()),
  artifact_id: z.string(),
  artifact_revision: z.number().int().positive(),
}).passthrough();

const contextSnapshotResponseSchema = z.object({
  data: contextSnapshotSchema.nullable(),
});

const contextPublishRequestSchema = z.object({
  idempotency_key: z.string(),
  artifact_id: z.string(),
  artifact_revision: z.number().int().positive(),
  expected_current_revision: z.number().int().positive().nullable(),
  approval_text: z.literal("publish approved context to workspace context"),
  compiled_brief: z.string().min(1),
  readiness: z.literal("ready"),
  source_references: z.array(z.string()),
  freshness: z.record(z.string(), z.unknown()),
});

const workspaceContextCompactionSchema = z.object({
  workspace_context_brief: z.string(),
  source_corpus_summary: z.string(),
  estimated_token_reduction: z.string().optional(),
});

const workspaceContextAuditSchema = z.object({
  lost_material_facts: z.array(z.string()),
  unsupported_new_claims: z.array(z.string()),
  overcompressed_nuance: z.array(z.string()),
  recommended_fixes: z.array(z.string()),
});

const tools = {
  ...pick(guildTools, ["guild_get_session", "guild_get_workspace"]),
};
type Tools = typeof tools;
type AgentTask = Task<Tools, AgentState>;

const requiredHeadings = [
  "## Consumed Context",
  "## Produced Artifact",
  "## Assumptions And Missing Evidence",
  "## Approval Gate",
  "## AEO / AI-Readiness Contribution",
  "## Status Payload",
  "## Downstream Handoff",
];

const managedContextStart = "<!-- guild-marketing-os-context:start -->";
const managedContextEnd = "<!-- guild-marketing-os-context:end -->";
const targetWorkspaceContextTokenMin = 2500;
const targetWorkspaceContextTokenMax = 4000;
const requiredWorkspaceBriefSections = [
  "Company Identity",
  "Positioning And Strategy",
  "Products And Platform",
  "Audiences And Buying Motion",
  "Pricing And Commercial Model",
  "Proof Points",
  "Compliance And Constraints",
  "Competitive Landscape",
  "Open Questions And Unknowns",
  "Downstream Operating Rules",
] as const;

const forbiddenLiveActionClaims = [
  "successfully published",
  "successfully scheduled",
  "live monitoring is connected and active",
  "spend increased",
  "successfully increased",
  "successfully activated",
  "crm activated",
  "credentials configured",
  "workspace installed",
  "trigger created",
  "performance improved",
];

const sparseMarkers = [
  "project: tbd",
  "project name: tbd",
  "project tbd",
  "build the full marketing strategy anyway",
  "confident claims",
];
const sourcePacketFieldLabels = [
  "Company name",
  "Brand name",
  "Organization name",
  "Org name",
  "Product name",
  "Company",
  "Brand",
  "Organization",
  "Org",
  "Product",
  "Approved company description",
  "Approved description",
  "Company description",
  "Product description",
  "Description",
  "Primary audiences",
  "Primary audience",
  "Audiences",
  "Audience",
  "Current marketing goal",
  "Marketing goal",
  "Current goals",
  "Goals",
  "Approved claims",
  "Approved facts",
  "Claims approved for reuse",
  "Channels in scope",
  "Approved channels",
  "Channel scope",
  "Channels",
  "Important constraints",
  "Constraints",
  "Proof-backed claims or source excerpts",
  "Proof-backed claims",
  "Approved proof",
  "Proof points",
  "Evidence",
  "Anything not approved for reuse",
].sort((a, b) => b.length - a.length);

export default agent({
  identifier: "guild_marketing_os_company_context_builder",
  description:
    "Turns supplied company information into a reviewable Marketing OS context foundation in Guild Chat without publishing Workspace Context or executing marketing actions.",
  inputSchema,
  outputSchema,
  tools,
  stateSchema: agentStateSchema,
  async start(input: Input, task: AgentTask) {
    const state = await restoreState(task);
    const result = await runFoundationTurn(input, task, state);
    await task.save(result.state);
    return agentOutput(result.output);
  },
});

async function runFoundationTurn(
  input: Input,
  task: AgentTask,
  state: AgentState,
): Promise<{ output: z.infer<typeof outputSchema>; state: AgentState }> {
  const rawContext = getRawContext(input);
  const focusedContextResume = isFocusedContextResume(rawContext);
  const conversationIntent = inputUsesInjectedManagedContext(input) ||
      focusedContextResume
    ? "source_available"
    : classifyConversationIntent(rawContext);
  const requestedDownstreamAgent = !focusedContextResume &&
      isExplicitDownstreamRequest(rawContext)
    ? detectRequestedDownstreamAgent(rawContext)
    : undefined;

  if (isWorkspaceContextPublishConfirmation(rawContext)) {
    const publishResult = await buildWorkspaceContextPublishOutput(input, task, state);
    return finalizeTurn(publishResult.output, publishResult.state);
  }

  if (requestedDownstreamAgent) {
    const publishedContext = await readPublishedWorkspaceContext(task);
    if (publishedContext?.ready) {
      return finalizeTurn(buildDownstreamWithContextOutput(input, requestedDownstreamAgent, publishedContext), state);
    }
    return finalizeTurn(buildDownstreamWithoutContextOutput(input, requestedDownstreamAgent), state);
  }

  if (conversationIntent === "save_state_question") {
    return finalizeTurn(buildSaveStateQuestionOutput(input, state), state);
  }

  if (conversationIntent === "approval_or_edit") {
    const approved = buildApprovalOrEditOutput(input, state);
    const persisted = await persistContextApproval(
      approved.output,
      approved.state,
      rawContext,
      task,
    );
    return finalizeTurn(persisted.output, persisted.state);
  }

  if (conversationIntent === "attachment_unreadable") {
    return finalizeTurn(buildReadableSourceNeededOutput(input, conversationIntent), state);
  }

  if (conversationIntent === "downstream_request_without_context") {
    return finalizeTurn(buildDownstreamWithoutContextOutput(input), state);
  }

  if (conversationIntent === "missing_context") {
    return finalizeTurn(buildMissingContextOutput(input), state);
  }

  const fallback = buildFallbackOutput(input, [], conversationIntent);

  const { text } = await task.llm.generateText({
    prompt: buildExtractionPrompt(input, rawContext, conversationIntent),
  });

  const parsed = parseJsonObject(text);
  const parseWarnings: string[] = [];
  let candidate = fallback;

  if (parsed === undefined) {
    parseWarnings.push("The LLM response was not valid JSON.");
  } else {
    const parsedOutput = llmOutputSchema.safeParse(cleanParsedOutput(parsed));
    if (parsedOutput.success) {
      candidate = {
        ...parsedOutput.data,
        type: "text",
        text: parsedOutput.data.text ?? "",
        markdownPacket: parsedOutput.data.markdownPacket ?? "",
      };
    } else {
      parseWarnings.push(`The LLM response did not match the structured output schema: ${formatSchemaIssues(parsedOutput.error.issues)}.`);
    }
  }

  const guarded = enforceDeterministicGuards(candidate, input, parseWarnings, conversationIntent);
  const draftState = {
    ...state,
    lastOutput: guarded,
    lastSourceText: undefined,
    approvedOutput: undefined,
    approvedSourceText: undefined,
    approvedAt: undefined,
    workspaceContextStatus: state.workspaceContextStatus ?? "not_requested",
  };
  const persisted = await persistContextDraft(
    guarded,
    draftState,
    getSourceTextForPersistence(input),
    task,
  );
  return finalizeTurn(persisted.output, persisted.state);
}

async function persistContextDraft(
  output: Output,
  state: AgentState,
  sourceText: string,
  task: AgentTask,
): Promise<{ output: Output; state: AgentState }> {
  if (!sourceText.trim()) {
    return { output, state };
  }

  const fingerprint = foundationFingerprint(sourceText);
  const sourceId = uuidFromFoundationSeed(
    `${task.sessionId}:${fingerprint}:source`,
  );
  const artifactId = uuidFromFoundationSeed(
    `${task.sessionId}:${fingerprint}:company-context`,
  );
  const sourceReference = `${sourceId}:1`;
  const artifactReference = `${artifactId}:1`;
  const persistedOutput = structuredOutputSchema.parse({
    ...output,
    persistenceState: {
      ...output.persistenceState,
      saved_to_context_artifacts: true,
      source_references: [sourceReference],
      context_artifact_references: [artifactReference],
      persistence_note:
        output.status === "ready_for_review"
          ? "The supplied source and review-ready Company Context artifact revision are retained in this Guild Chat. When used through Launcher, Launcher imports the completed artifact into the canonical cockpit. Workspace Context is still unchanged."
          : "The supplied source and draft Company Context artifact revision are retained in this Guild Chat. When used through Launcher, Launcher imports the draft into the canonical cockpit for focused follow-up. Workspace Context is still unchanged.",
    },
  });

  return {
    output: persistedOutput,
    state: {
      ...state,
      lastOutput: persistedOutput,
      lastSourceText: sourceText,
      approvedSourceText: undefined,
      durableSourceId: sourceId,
      durableSourceRevision: 1,
      durableContextArtifactId: artifactId,
      durableContextArtifactRevision: 1,
      durableContextArtifactStatus:
        output.status === "blocked"
          ? "blocked"
          : output.status === "ready_for_review"
            ? "ready_for_review"
            : "draft",
      durableContextFingerprint: fingerprint,
    },
  };
}

async function persistContextApproval(
  output: Output,
  state: AgentState,
  exactApprovalText: string,
  _task: AgentTask,
): Promise<{ output: Output; state: AgentState }> {
  if (!output.persistenceState.approved_in_session) {
    return { output, state };
  }
  const artifactId = state.durableContextArtifactId;
  const artifactRevision = state.durableContextArtifactRevision;
  if (!artifactId || !artifactRevision) {
    const blockedOutput = markDurableContextApprovalBlocked(
      output,
      "No durable Company Context artifact revision is available. Recreate the draft from readable source before approving it.",
    );
    return {
      output: blockedOutput,
      state: {
        ...state,
        approvedOutput: undefined,
        durableContextArtifactStatus: undefined,
      },
    };
  }

  if (
    state.durableContextArtifactStatus !== "ready_for_review" &&
    state.durableContextArtifactStatus !== "approved"
  ) {
    const blockedOutput = markDurableContextApprovalBlocked(
      output,
      state.durableContextArtifactStatus === "blocked"
        ? "The Company Context artifact is blocked and cannot be approved until its evidence gaps are resolved."
        : "The Company Context artifact is still a draft and cannot be approved until its required inputs and evidence gaps are resolved.",
    );
    return {
      output: blockedOutput,
      state: {
        ...state,
        lastOutput: blockedOutput,
        approvedOutput: undefined,
      },
    };
  }

  const storedApprovalText = exactApprovalText.trim();
  const approvedOutput = structuredOutputSchema.parse({
    ...output,
    persistenceState: {
      ...output.persistenceState,
      saved_to_context_artifacts: true,
      source_references:
        output.persistenceState.source_references ??
        (state.durableSourceId && state.durableSourceRevision
          ? [`${state.durableSourceId}:${state.durableSourceRevision}`]
          : []),
      context_artifact_references: [`${artifactId}:${artifactRevision}`],
      persistence_note: `Company Context artifact ${artifactId} revision ${artifactRevision} is approved in this Guild Chat. Exact approval text retained: ${storedApprovalText}. Workspace Context remains unchanged until Launcher receives the exact publication phrase.`,
    },
    statusPayload: {
      ...output.statusPayload,
      blockers: output.statusPayload.blockers.filter(
        (blocker) =>
          !/not saved to Context Hub|artifacts were not persisted/i.test(
            blocker,
          ),
      ),
    },
  });
  return {
    output: approvedOutput,
    state: {
      ...state,
      lastOutput: approvedOutput,
      approvedOutput,
      approvedSourceText: state.lastSourceText,
      durableContextArtifactStatus: "approved",
    },
  };
}

function markDurableContextApprovalBlocked(
  output: Output,
  reason: string,
): Output {
  return structuredOutputSchema.parse({
    ...output,
    status: "needs_input",
    persistenceState: {
      ...output.persistenceState,
      approved_in_session: false,
      persistence_note: reason,
    },
    statusPayload: {
      ...output.statusPayload,
      blockers: [...new Set([...output.statusPayload.blockers, reason])],
    },
  });
}

async function restoreState(task: AgentTask): Promise<AgentState> {
  const restored = await task.restore();
  const parsed = agentStateSchema.safeParse(restored ?? {});
  return parsed.success ? parsed.data : {};
}

function finalizeTurn(output: Output, state: AgentState): { output: z.infer<typeof outputSchema>; state: AgentState } {
  return {
    output: finalizeOutput(output),
    state,
  };
}

function finalizeOutput(output: Output): z.infer<typeof outputSchema> {
  const markdownPacket = renderMarkdownPacket(output);
  const parsedOutput = structuredOutputSchema.parse({
    ...output,
    type: "text",
    text: markdownPacket,
    markdownPacket,
  });
  return outputSchema.parse({ type: "text", text: parsedOutput.markdownPacket });
}

function getRawContext(input: Input): string {
  const unwrappedText = unwrapCanonicalTextInput(input.text);
  const managedContext = extractInjectedManagedWorkspaceContext(unwrappedText);
  const rawText = stripGuildRuntimePreamble(unwrappedText).trim();
  const embeddedText = extractEmbeddedTextInput(rawText, { trim: true }) ?? rawText;
  const userSource = extractSourceDocumentFromContext(embeddedText, { trim: true }) ?? embeddedText;
  return managedContext && shouldUseInjectedManagedContext(userSource)
    ? managedContext
    : userSource;
}

function getSourceTextForPersistence(input: Input): string {
  const unwrappedText = unwrapCanonicalTextInput(input.text);
  const managedContext = extractInjectedManagedWorkspaceContext(unwrappedText);
  const rawText = stripGuildRuntimePreamble(unwrappedText);
  const embeddedText = extractEmbeddedTextInput(rawText, { trim: false }) ?? rawText;
  const userSource = extractSourceDocumentFromContext(embeddedText, { trim: false }) ?? embeddedText;
  return managedContext && shouldUseInjectedManagedContext(userSource)
    ? managedContext
    : userSource;
}

function getSourceLabels(_input: Input): string[] {
  return [];
}

function unwrapCanonicalTextInput(value: string): string {
  for (const candidate of [value, fencedJson(value), firstJsonObject(value)]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (isRecord(parsed) && parsed.type === "text" && typeof parsed.text === "string") {
        return parsed.text;
      }
    } catch {
      // Try the next candidate.
    }
  }
  return value;
}

function extractInjectedManagedWorkspaceContext(value: string): string | undefined {
  const startIndex = value.indexOf(managedContextStart);
  const endIndex = value.indexOf(managedContextEnd, startIndex + managedContextStart.length);
  if (startIndex === -1 || endIndex <= startIndex) return undefined;
  return value
    .slice(startIndex, endIndex + managedContextEnd.length)
    .replace(/\\n/g, "\n")
    .trim();
}

function shouldUseInjectedManagedContext(userSource: string): boolean {
  return /\b(?:refresh|review|check|assess|summarize|read)\b[^\n.!?]{0,80}\b(?:company|workspace|marketing os)\s+context\b/i.test(
    userSource,
  ) ||
    /\b(?:approved|published|current)\s+workspace\s+context\b/i.test(userSource) ||
    /\bcontext\s+readiness\b/i.test(userSource);
}

function inputUsesInjectedManagedContext(input: Input): boolean {
  const unwrappedText = unwrapCanonicalTextInput(input.text);
  if (!extractInjectedManagedWorkspaceContext(unwrappedText)) return false;
  const userSource = stripGuildRuntimePreamble(unwrappedText).trim();
  return shouldUseInjectedManagedContext(userSource);
}

function extractEmbeddedTextInput(value: string, options: { trim: boolean } = { trim: true }): string | undefined {
  for (const candidate of [value, fencedJson(value), firstJsonObject(value)]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (isRecord(parsed) && parsed.type === "text" && typeof parsed.text === "string") {
        const text = stripGuildRuntimePreamble(parsed.text);
        return options.trim ? text.trim() : text;
      }
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

function stripGuildRuntimePreamble(value: string): string {
  const withoutLeadingSpace = value.replace(/^\s+/, "");
  if (!withoutLeadingSpace.startsWith("* This session was started at")) {
    return stripGuildCliChatCommandArtifact(stripLeadingManagedWorkspaceContext(value));
  }
  const withoutRuntimePreamble = withoutLeadingSpace.replace(
    /^\* This session was started at[\s\S]*?```json\n[\s\S]*?\n```\n\n?/,
    "",
  );
  return stripGuildCliChatCommandArtifact(stripLeadingManagedWorkspaceContext(withoutRuntimePreamble));
}

function stripLeadingManagedWorkspaceContext(value: string): string {
  let current = value;
  while (current.replace(/^\s+/, "").startsWith(managedContextStart)) {
    const leadingTrimmed = current.replace(/^\s+/, "");
    const endIndex = leadingTrimmed.indexOf(managedContextEnd);
    if (endIndex === -1) return current;
    current = leadingTrimmed.slice(endIndex + managedContextEnd.length).replace(/^\s+/, "");
  }
  return current;
}

function stripGuildCliChatCommandArtifact(value: string): string {
  const withoutLeadingSpace = value.replace(/^\s+/, "");
  if (/^chat\s+#{1,6}\s+/i.test(withoutLeadingSpace)) {
    return withoutLeadingSpace.replace(/^chat\s+/i, "");
  }
  return value;
}

function extractSourceDocumentFromContext(value: string, options: { trim: boolean }): string | undefined {
  const match = sourceDocumentHeadingMatch(value);
  if (!match || match.index === undefined) return undefined;
  const headingStart = match.index + (match[0].startsWith("\n") ? 1 : 0);
  const sourceDocument = value.slice(headingStart);
  return options.trim ? sourceDocument.trim() : sourceDocument.replace(/^\s+/, "");
}

function getRequestedArtifacts(_input: Input): Array<(typeof artifactValues)[number]> {
  return normalizeArtifacts(defaultRequestedArtifacts);
}

function getOperatingConstraints(_input: Input): string[] {
  return defaultConstraints;
}

function classifyConversationIntent(rawContext: string): ConversationIntent {
  if (isFocusedContextResume(rawContext)) return "source_available";
  if (isApprovalOrEdit(rawContext)) return "approval_or_edit";
  if (isSaveStateQuestion(rawContext)) return "save_state_question";
  if (isAttachmentUnreadableTurn(rawContext)) return "attachment_unreadable";
  if (isSparseSetupRequest(rawContext) || hasUrlOnlySource(rawContext)) return "missing_context";
  if (detectRequestedDownstreamAgent(rawContext) && !hasUsableSourceContent(rawContext)) {
    return "downstream_request_without_context";
  }
  if (!hasUsableSourceContent(rawContext)) return "missing_context";
  return "source_available";
}

function isFocusedContextResume(rawContext: string): boolean {
  return /\bresume\s+company context(?:\s+artifact)?\s+revision\s+\d+\b/i.test(
    rawContext,
  ) || /(?:^|\n)\s*##\s+Focused resume input\s*$/im.test(rawContext);
}

function isSaveStateQuestion(rawContext: string): boolean {
  return /\b(is|was|did|has|have|now)\b[\s\S]{0,80}\b(saved|persisted|approved|installed|published|in workspace context|workspace context|context hub|artifact|artifacts)\b/i.test(rawContext) ||
    /\b(saved|persisted|approved|installed|published)\b[\s\S]{0,80}\?/i.test(rawContext);
}

function isApprovalOrEdit(rawContext: string): boolean {
  return /\bapprove\s+(?:this|it|the draft|the\s+company context|company context)\b/i.test(rawContext) ||
    /^\s*(?:approved|looks good|ship it|confirm)(?:\s+(?:this|it|the draft|the\s+company context|company context))?\s*[.!]?$/i.test(rawContext.trim()) ||
    /\b(?:looks good|ship it|confirm)\s+(?:this|it|the draft|the\s+company context|company context)\b/i.test(rawContext) ||
    isContextPersistenceRequest(rawContext) ||
    /\bedit\s+company context\s*:/i.test(rawContext) ||
    /\b(remove|delete)\s+.+\b(company context|claim|claims)\b/i.test(rawContext);
}

function isContextPersistenceRequest(rawContext: string): boolean {
  return /\bthis\s+is\s+correct\b[\s\S]{0,160}\b(?:add|save|persist|store|publish|put|use)\b[\s\S]{0,160}\b(?:context|workspace context|other agents?|downstream agents?|agents)\b/i.test(rawContext) ||
    /\bcontext\s+approved\b[\s\S]{0,80}\b(?:save|persist|store|publish|put|use)\b[\s\S]{0,80}\b(?:workspace context|context)\b/i.test(rawContext) ||
    /\b(?:add|save|persist|store|publish|put|use|make)\b[\s\S]{0,120}\b(?:company context|workspace context|context)\b[\s\S]{0,120}\b(?:other agents?|downstream agents?|agents|workspace|context hub|reference|reuse)\b/i.test(rawContext) ||
    /\b(?:make|use)\s+this\s+(?:the\s+)?(?:approved\s+)?(?:company|workspace)\s+context\b/i.test(rawContext) ||
    /\bshow\s+ready-to-(?:save|publish)\s+company context block\b/i.test(rawContext);
}

function isWorkspaceContextPublishConfirmation(rawContext: string): boolean {
  const normalized = rawContext.trim().toLowerCase();
  return normalized === "publish approved context to workspace context" ||
    /(?:^|\n)publish approved context to workspace context\s*$/i.test(rawContext);
}

function isAttachmentUnreadableTurn(rawContext: string): boolean {
  return !hasUsableSourceContent(rawContext) && (
    isPlaceholderSourceIntro(rawContext) ||
    /\b(attached|attachment|uploaded|file|pdf|docx?|slides?|deck|spreadsheet)\b/i.test(rawContext)
  );
}

function hasUsableSourceContent(rawContext: string): boolean {
  const wordCount = rawContext.split(/\s+/).filter(Boolean).length;
  const fieldCount = [
    "Approved company description",
    "Approved description",
    "Company description",
    "Primary audiences",
    "Current goals",
    "Proof-backed claims",
    "Proof points",
    "Evidence",
    "Channels in scope",
    "Anything not approved",
  ].filter((label) => new RegExp(`^\\s*(?:[-*]\\s*)?${escapeRegExp(label)}\\s*:`, "im").test(rawContext)).length;

  if (fieldCount >= 2) return true;
  if (sourceDocumentHeadingPattern(rawContext) && wordCount >= 30) return true;
  return wordCount >= 60 && /\b(company|product|platform|audience|customer|market|website|brand|proof|claim|goal|channel)\b/i.test(rawContext);
}

function isSparseSetupRequest(rawContext: string): boolean {
  return /\b(help\s+set\s+this\s+up|set\s+this\s+up|set\s+up\s+the\s+marketing\s+os|set\s+up\s+marketing\s+os|build context for my company)\b/i.test(rawContext) &&
    !hasFieldedSourcePacket(rawContext) &&
    !sourceDocumentHeadingPattern(rawContext);
}

function hasFieldedSourcePacket(rawContext: string): boolean {
  const fieldCount = [
    "Approved company description",
    "Approved description",
    "Company description",
    "Primary audiences",
    "Current goals",
    "Proof-backed claims",
    "Proof points",
    "Evidence",
    "Channels in scope",
    "Anything not approved",
  ].filter((label) => new RegExp(`^\\s*(?:[-*]\\s*)?${escapeRegExp(label)}\\s*:`, "im").test(rawContext)).length;
  return fieldCount >= 2;
}

function sourceDocumentHeadingPattern(rawContext: string): boolean {
  return sourceDocumentHeadingMatch(rawContext) !== null;
}

function sourceDocumentHeadingMatch(rawContext: string): RegExpMatchArray | null {
  return rawContext.match(/(?:^|\n)\s*#{1,3}\s+[A-Z][A-Za-z0-9&.\- ]{1,80}\s+(?:company|product|brand)\s+(?:profile|overview|context|brief)\b/im);
}

function hasUrlOnlySource(rawContext: string): boolean {
  const normalizedContext = rawContext.replace(/\\\//g, "/");
  const sourceUrlMatch = normalizedContext.match(/\b(?:from|use|using|at|source|url)\s*:?\s*(https?:\/\/[^\s)"']+)/i);
  const sourceUrl = sourceUrlMatch?.[1] ?? "";
  return Boolean(sourceUrl) &&
    !/https?:\/\/(?:app\.)?guild\.ai\b/i.test(sourceUrl) &&
    !/attachments\.app\.guild\.ai\b/i.test(sourceUrl) &&
    !hasFieldedSourcePacket(rawContext) &&
    !sourceDocumentHeadingPattern(rawContext);
}

function detectRequestedDownstreamAgent(
  rawContext: string,
): Exclude<(typeof agentValues)[number], "Company Context Builder"> | undefined {
  const normalized = rawContext.toLowerCase();
  if (/\b(campaign|paid|ads?|budget|landing page|performance|retargeting)\b/i.test(normalized)) return "Campaigns And Paid Media";
  if (/\b(social|content|post|reply|monitoring|digest|linkedin|twitter|x\b|reddit)\b/i.test(normalized)) return "Social Monitoring And Content";
  if (/\b(brand|branding|pitch|deck|website|web direction|visual|aeo|ai-readiness)\b/i.test(normalized)) return "Branding And Pitch Deck";
  if (/\b(positioning|messaging|message|claims|boilerplate|objection|answer-ready|copy)\b/i.test(normalized)) return "Messaging";
  if (/\b(segment|segmentation|list|suppression|consent|targeting rules)\b/i.test(normalized)) return "Audience Segmentation";
  if (/\b(icp|persona|target audience|who to target|buyer|user role)\b/i.test(normalized)) return "ICP";
  if (/\b(market|competitor|competition|community|search|answer engine|signal)\b/i.test(normalized)) return "Market Signal";
  return undefined;
}

function isExplicitDownstreamRequest(rawContext: string): boolean {
  if (hasFieldedSourcePacket(rawContext) || sourceDocumentHeadingPattern(rawContext)) return false;
  return /\b(?:create|draft|build|write|develop|prepare|review|revise|produce|make|help with|need|want)\b[\s\S]{0,180}\b(?:campaign|paid media|ads?|social|content|post|monitoring|brand|branding|pitch|deck|positioning|messaging|message|boilerplate|copy|segment|segmentation|icp|persona|target audience|market signal|competitor|competition)\b/i.test(rawContext) ||
    /\b(?:campaign|paid media|social monitoring|content plan|brand brief|pitch deck|messaging framework|message pillars|audience segmentation|icp|market signal)\b[\s\S]{0,120}\b(?:please|for us|for our|from approved context|using approved context)\b/i.test(rawContext);
}

async function readPublishedWorkspaceContext(task: AgentTask): Promise<PublishedWorkspaceContext | undefined> {
  try {
    const guild = task.guild as GuildService | undefined;
    const session = guild
      ? await guild.get_session({ session_id: task.sessionId })
      : await task.tools.guild_get_session({ session_id: task.sessionId });
    const workspace = guild
      ? await guild.get_workspace({ workspace_id: session.workspace.id })
      : await task.tools.guild_get_workspace({ workspace_id: session.workspace.id });
    const compiled = workspace.context.compiled ?? "";
    const managedStart = compiled.indexOf(managedContextStart);
    const managedEnd = compiled.indexOf(managedContextEnd);
    const managedBlock =
      managedStart !== -1 && managedEnd > managedStart
        ? compiled.slice(managedStart, managedEnd + managedContextEnd.length)
        : "";
    const ready = Boolean(
      workspace.context.id &&
        managedBlock &&
        /\bStatus:\s*(?:published|approved)\b/i.test(managedBlock) &&
        /##\s+Workspace Context Brief\b/i.test(managedBlock),
    );
    const companyName = managedBlock.match(/^\s*(?:Company|Company name):\s*(.+)$/im)?.[1]?.trim();

    return {
      ready,
      workspaceId: workspace.id,
      workspaceFullName: workspace.full_name,
      contextId: workspace.context.id ?? session.context_id ?? undefined,
      compiled,
      companyName,
    };
  } catch {
    return undefined;
  }
}

function buildExtractionPrompt(input: Input, rawContext: string, conversationIntent: ConversationIntent): string {
  const sourceLabels = getSourceLabels(input);

  return `
You are the structured Guild Marketing OS Company Context Builder.

Return only valid JSON. Do not use markdown fences.

Your JSON must match this TypeScript-style shape:
{
  "status": "ready_for_review" | "needs_input" | "blocked",
  "conversationIntent": "${conversationIntent}",
  "persistenceState": {
    "drafted_in_session": boolean,
    "approved_in_session": boolean,
    "saved_to_workspace_context": false,
    "saved_to_context_artifacts": false,
    "persistence_note": string
  },
  "consumedContext": { "used": string[], "missing": string[], "sourceLabels": string[] },
  "contextArtifacts": {
    "companyContext": { "status": "draft" | "needs_input" | "blocked", "companyName": string, "category": string, "primaryAudiences": string[], "goals": string[], "missingContext": string[] },
    "messagingSource": { "status": "draft" | "needs_input" | "blocked", "overview": string, "positioning": string, "proofNeeds": string[], "answerReadyLanguage": string[] },
    "brandKit": { "status": "draft" | "needs_input" | "blocked", "voice": string, "visualDirection": string, "constraints": string[] },
    "audienceSegments": [{ "status": "draft" | "needs_input" | "blocked", "name": string, "description": string, "evidenceStatus": "approved" | "user_supplied" | "assumption" | "missing" | "blocked" | "do_not_use", "missingEvidence": string[] }],
    "channelRegistry": { "status": "draft" | "needs_input" | "blocked", "approvedChannels": string[], "channelsTbd": string[], "blockedActions": string[] },
    "proofAndConstraints": { "status": "draft" | "needs_input" | "blocked", "approvedClaims": claim[], "blockedClaims": claim[], "constraints": string[] },
    "dashboardSignals": { "status": "draft" | "needs_input" | "blocked", "readiness": "blocked" | "draft" | "review_ready", "blockers": string[], "nextReviewSignals": string[] }
  },
  "workspaceContextDraft": string,
  "approvedFacts": claim[],
  "extractedClaims": claim[],
  "proofBackedClaims": claim[],
  "claimsNeedingApproval": claim[],
  "assumptionsAndMissingEvidence": claim[],
  "openQuestions": string[],
  "approvalGates": [{ "ownerRole": string, "decision": string, "requiredBefore": string, "status": "needed" | "approved" | "blocked" }],
  "aeoReadiness": { "status": "blocked" | "draft" | "review_ready", "entityClarity": string, "answerReadyOpportunities": string[], "missingProof": string[], "recommendedWebInputs": string[] },
  "statusPayload": {
    "companyName": string,
    "readiness": "blocked" | "draft" | "review_ready",
    "nextAgents": string[],
    "blockers": string[],
    "requiredArtifacts": string[],
    "evidence_mode": "source_supplied",
    "observed_at": string | null,
    "source_coverage": string[],
    "coverage_limitations": string[],
    "safety": {
      "action_mode": "draft_only",
      "external_mutation_requested": false,
      "blocked_actions": string[],
      "unsupported_claims": string[],
      "evidence_gaps": string[]
    }
  },
  "downstreamHandoff": [{ "agent": string, "receives": string[], "reason": string }],
  "markdownPacket": string
}

Valid downstream agent names are: ${agentValues.join(", ")}.
Valid artifact names are: ${artifactValues.join(", ")}.
Valid claim statuses are: approved, user_supplied, assumption, missing, blocked, do_not_use.

Rules:
- Do not invent customer-specific facts, metrics, audience counts, connected systems, legal constraints, or performance results.
- Use only the Raw context below as company evidence. Do not use workspace metadata, connected integration names, user profile data, attachment filenames, or attachment metadata as company context.
- Classify this turn as ${conversationIntent}; preserve that exact conversationIntent in JSON.
- Always set saved_to_workspace_context and saved_to_context_artifacts to false in the model-generated JSON. The deterministic agent layer changes saved_to_context_artifacts only after it has retained the draft in Guild Chat state.
- Set drafted_in_session true when a draft artifact block is produced. Set approved_in_session true only when the user explicitly approves the draft in the current turn.
- If the Raw context only says a file or context is attached/provided but does not include readable source text, return status "blocked" and ask the user to paste the source text.
- If context is sparse, return status "blocked" or "needs_input" and mark unsupported artifacts as "blocked" or "needs_input".
- Do not draft substantive public copy, headlines, campaign messages, benefit claims, channel plans, or audience rules from sparse context.
- Do not claim publishing, scheduling, spend, CRM activation, credential setup, workspace install, trigger setup, visibility change, or external system updates happened.
- Do not claim that Guild workspace context or durable artifacts were saved, updated, published, installed, or persisted; only the deterministic service response may make that claim.
- Keep legal, trademark, privacy, security, compliance, pricing, guarantee, and performance claims behind approved evidence and human review.
- Use review verbs such as draft, recommend, plan, prepare, or propose.
- Separate approved facts, user-supplied facts, extracted claims, proof-backed claims, claims needing approval, assumptions, missing evidence, blocked claims, and do-not-use claims.
- Generate substantive draft content for every required artifact: company-context, messaging-source, brand-kit, audience-segments, channel-registry, proof-and-constraints, and dashboard-signals. Use TBD only for fields that are genuinely missing.
- AEO outputs must distinguish answer-ready recommendations from deployed web/schema/metadata changes.
- Recommend downstream agents with reasons after a usable draft. Do not route as if downstream execution happened.
- The runtime renders markdownPacket deterministically, so markdownPacket may be an empty string if the structured fields are complete.

Company name hint:
${extractCompanyName(rawContext) ?? "TBD"}

Requested artifacts:
${getRequestedArtifacts(input).join(", ")}

Source labels:
${sourceLabels.length ? sourceLabels.join(", ") : "None supplied"}

Operating constraints:
${getOperatingConstraints(input).join("\n")}

Raw context:
${rawContext}
`.trim();
}

function parseJsonObject(text: string): unknown | undefined {
  const trimmed = text.trim();
  for (const candidate of [
    trimmed,
    fencedJson(trimmed),
    firstJsonObject(trimmed),
  ]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

function cleanParsedOutput(value: unknown): unknown {
  if (!isRecord(value)) return value;

  const output = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  const contextArtifacts = isRecord(output.contextArtifacts) ? output.contextArtifacts : undefined;
  const proofAndConstraints =
    contextArtifacts && isRecord(contextArtifacts.proofAndConstraints) ? contextArtifacts.proofAndConstraints : undefined;

  cleanClaimArray(output, "approvedFacts");
  cleanClaimArray(output, "extractedClaims");
  cleanClaimArray(output, "proofBackedClaims");
  cleanClaimArray(output, "claimsNeedingApproval");
  cleanClaimArray(output, "assumptionsAndMissingEvidence");
  cleanClaimArray(proofAndConstraints, "approvedClaims");
  cleanClaimArray(proofAndConstraints, "blockedClaims");
  cleanArtifactArray(output, "statusPayload", "requiredArtifacts");
  cleanHandoffArray(output);
  return output;
}

function cleanClaimArray(container: unknown, key: string): void {
  if (!isRecord(container)) return;
  const claims = container[key];
  if (!Array.isArray(claims)) return;
  container[key] = claims.filter((claim: unknown) => isRecord(claim) && typeof claim.claim === "string" && claim.claim.trim());
}

function cleanArtifactArray(container: unknown, nestedKey: string, arrayKey: string): void {
  if (!isRecord(container)) return;
  const nested = container[nestedKey];
  if (!isRecord(nested)) return;
  const values = nested[arrayKey];
  if (!Array.isArray(values)) return;
  nested[arrayKey] = values.map((value) => normalizeArtifactName(String(value))).filter(Boolean);
}

function cleanHandoffArray(container: unknown): void {
  if (!isRecord(container) || !Array.isArray(container.downstreamHandoff)) return;
  container.downstreamHandoff = container.downstreamHandoff.map((handoff: unknown) => {
    if (!isRecord(handoff) || !Array.isArray(handoff.receives)) return handoff;
    return {
      ...handoff,
      receives: handoff.receives.map((value) => normalizeArtifactName(String(value))).filter(Boolean),
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fencedJson(text: string): string | undefined {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match?.[1]?.trim();
}

function firstJsonObject(text: string): string | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;
  return text.slice(start, end + 1);
}

function enforceDeterministicGuards(output: Output, input: Input, parseWarnings: string[], conversationIntent: ConversationIntent): Output {
  const rawContext = getRawContext(input);
  const sourceTextNeeded = shouldRequestReadableSourceText(rawContext);
  const explicitCompanyName = extractCompanyName(rawContext);
  const explicitDescription = extractLineAfterLabels(rawContext, [
    "Approved company description",
    "Approved description",
    "Company description",
    "Product description",
    "Description",
  ]) ?? extractCompanyDescriptionFromProse(rawContext, explicitCompanyName);
  const explicitAudiences = extractListAfterLabels(rawContext, ["Primary audiences", "Primary audience", "Audiences", "Audience"]);
  const explicitGoals = extractBlockAfterLabels(rawContext, [
    "Current marketing goal",
    "Marketing goal",
    "Current goals",
    "Goals",
  ]);
  const explicitApprovedClaims = extractBlockAfterLabels(rawContext, [
    "Approved claims",
    "Approved facts",
    "Claims approved for reuse",
  ]);
  const explicitConstraints = extractBlockAfterLabels(rawContext, [
    "Important constraints",
    "Constraints",
    "Anything not approved for reuse",
  ]);
  const explicitChannels = extractListAfterLabels(rawContext, ["Channels in scope", "Approved channels", "Channel scope", "Channels"]);
  const blockers = new Set(output.statusPayload.blockers);
  let missing = new Set(output.consumedContext.missing);
  let blockedClaims = [...output.contextArtifacts.proofAndConstraints.blockedClaims];
  let assumptionsAndMissingEvidence = [...output.assumptionsAndMissingEvidence];
  let claimsNeedingApproval = [...output.claimsNeedingApproval];

  output.conversationIntent = conversationIntent;
  output.persistenceState = normalizePersistenceState(output.persistenceState, conversationIntent);

  if (parseWarnings.length > 0 && isSparse(rawContext)) {
    blockers.add("Structured extraction needs more source context.");
  }

  if (sourceTextNeeded || hasNoUsableOutputContext(output)) {
    blockers.add("No readable source text was provided to the agent. If a file was attached, paste the relevant text or excerpts into chat.");
    output = applyReadableSourceNeededState(output);
    missing = new Set(output.consumedContext.missing);
    blockedClaims = [...output.contextArtifacts.proofAndConstraints.blockedClaims];
    assumptionsAndMissingEvidence = [...output.assumptionsAndMissingEvidence];
    for (const blocker of output.statusPayload.blockers) blockers.add(blocker);
  }

  const preservesSourceHipaaNuance = (claim: Claim): boolean =>
    preservesQualifiedHipaaNuance(claim.claim, rawContext);
  blockedClaims = blockedClaims.filter(preservesSourceHipaaNuance);
  assumptionsAndMissingEvidence =
    assumptionsAndMissingEvidence.filter(preservesSourceHipaaNuance);
  claimsNeedingApproval =
    claimsNeedingApproval.filter(preservesSourceHipaaNuance);
  output.approvedFacts =
    output.approvedFacts.filter(preservesSourceHipaaNuance);
  output.extractedClaims =
    output.extractedClaims.filter(preservesSourceHipaaNuance);
  output.proofBackedClaims =
    output.proofBackedClaims.filter(preservesSourceHipaaNuance);
  output.contextArtifacts.proofAndConstraints.approvedClaims =
    output.contextArtifacts.proofAndConstraints.approvedClaims.filter(
      preservesSourceHipaaNuance,
    );

  if (explicitCompanyName) {
    output.contextArtifacts.companyContext.companyName = explicitCompanyName;
    output.statusPayload.companyName = explicitCompanyName;
    missing.delete("Company name");
    addUserSuppliedClaim(output.approvedFacts, `Company name: ${explicitCompanyName}`);
    addUserSuppliedClaim(output.contextArtifacts.proofAndConstraints.approvedClaims, `Company name: ${explicitCompanyName}`);
  }

  if (explicitDescription) {
    output.contextArtifacts.messagingSource.overview = explicitDescription;
    missing.delete("Approved description");
    addUserSuppliedClaim(output.approvedFacts, explicitDescription);
    addUserSuppliedClaim(output.contextArtifacts.proofAndConstraints.approvedClaims, explicitDescription);
  }

  if (explicitAudiences.length > 0) {
    output.contextArtifacts.companyContext.primaryAudiences = explicitAudiences;
    missing.delete("Primary audience");
    missing.delete("Primary audiences");
  }

  if (explicitGoals.length > 0) {
    output.contextArtifacts.companyContext.goals = explicitGoals;
    missing.delete("Current goals");
  }

  if (explicitChannels.length > 0 && hasExplicitApprovedChannelScope(rawContext)) {
    output.contextArtifacts.channelRegistry.approvedChannels = explicitChannels;
    output.contextArtifacts.channelRegistry.channelsTbd = output.contextArtifacts.channelRegistry.channelsTbd.filter(
      (channel) => !explicitChannels.some((explicitChannel) => explicitChannel.toLowerCase() === channel.toLowerCase()),
    );
    missing.delete("Approved channel scope");
    missing.delete("Channel scope");
  }

  for (const fact of explicitApprovedClaims) {
    if (isSensitiveClaim(fact)) {
      blockedClaims.push(sensitiveClaimGuardrail(fact));
      claimsNeedingApproval.push(sensitiveClaimNeedsApproval(fact));
      continue;
    }
    addUserSuppliedClaim(output.approvedFacts, fact);
    addUserSuppliedClaim(
      output.contextArtifacts.proofAndConstraints.approvedClaims,
      fact,
    );
  }
  if (explicitConstraints.length > 0) {
    output.contextArtifacts.proofAndConstraints.constraints =
      mergeDefaultConstraints([
        ...explicitConstraints,
        ...output.contextArtifacts.proofAndConstraints.constraints,
      ]);
  }

  for (const fact of extractProofFacts(rawContext)) {
    if (isSensitiveClaim(fact)) {
      blockedClaims.push({
        claim: fact,
        status: "blocked",
        source: "sensitive_claim_guardrail",
        notes: "Pricing, legal, compliance, security, guarantee, production-readiness, and performance claims require separate human approval and evidence.",
      });
      claimsNeedingApproval.push({
        claim: fact,
        status: "blocked",
        source: "sensitive_claim_guardrail",
        notes: "Do not reuse until approved evidence and an owner approval are supplied.",
      });
      continue;
    }
    addUserSuppliedClaim(output.approvedFacts, fact);
    addUserSuppliedClaim(output.contextArtifacts.proofAndConstraints.approvedClaims, fact);
    addUserSuppliedClaim(output.proofBackedClaims, fact);
  }

  for (const fact of extractSensitiveClaimMentions(rawContext)) {
    blockedClaims.push(sensitiveClaimGuardrail(fact));
    claimsNeedingApproval.push(sensitiveClaimNeedsApproval(fact));
  }

  if (explicitCompanyName && output.workspaceContextDraft.includes("Company: TBD")) {
    output.workspaceContextDraft = renderWorkspaceContextDraft(explicitCompanyName, output.statusPayload.readiness);
  }

  if (isSparse(rawContext)) {
    blockers.add("Business context is too sparse for substantive public marketing strategy.");
    if (!explicitCompanyName) missing.add("Company name");
    missing.add("Approved description");
    missing.add("Primary audience");
    missing.add("Proof-backed claims");
    output.status = "blocked";
    output.contextArtifacts.companyContext.status = "blocked";
    output.contextArtifacts.messagingSource.status = "blocked";
    output.contextArtifacts.channelRegistry.status = "blocked";
    output.contextArtifacts.proofAndConstraints.status = "blocked";
    output.contextArtifacts.dashboardSignals.status = "blocked";
    output.contextArtifacts.dashboardSignals.readiness = "blocked";
    output.aeoReadiness.status = "blocked";
    output.statusPayload.readiness = "blocked";
  }

  const factNormalization = normalizeApprovedClaims(output.approvedFacts, rawContext);
  const proofNormalization = normalizeApprovedClaims(output.contextArtifacts.proofAndConstraints.approvedClaims, rawContext);
  const proofBackedNormalization = normalizeApprovedClaims(output.proofBackedClaims, rawContext);
  output.approvedFacts = factNormalization.approved;
  output.contextArtifacts.proofAndConstraints.approvedClaims = proofNormalization.approved;
  output.proofBackedClaims = proofBackedNormalization.approved;
  assumptionsAndMissingEvidence.push(...factNormalization.downgraded, ...proofNormalization.downgraded, ...proofBackedNormalization.downgraded);
  claimsNeedingApproval.push(...factNormalization.sensitive, ...proofNormalization.sensitive, ...proofBackedNormalization.sensitive);
  blockedClaims.push(...factNormalization.sensitive, ...proofNormalization.sensitive, ...proofBackedNormalization.sensitive);

  if (!hasExplicitApprovedChannelScope(rawContext)) {
    output.contextArtifacts.channelRegistry.approvedChannels = [];
    output.contextArtifacts.channelRegistry.channelsTbd = ["TBD"];
    missing.add("Approved channel scope");
  }

  if (!hasApprovedProofEvidence(rawContext)) {
    missing.add("Proof-backed claims");
    if (!needsReadableSourceText(output)) {
      output.contextArtifacts.messagingSource.status = "needs_input";
      output.contextArtifacts.messagingSource.overview = "TBD. Requires an approved company description and proof-backed claims.";
      output.contextArtifacts.messagingSource.positioning = "TBD. Requires approved category, audience, problem, promise, differentiation, and proof.";
      output.contextArtifacts.messagingSource.answerReadyLanguage = [];
      output.contextArtifacts.messagingSource.proofNeeds = [
        ...new Set([
          ...output.contextArtifacts.messagingSource.proofNeeds,
          "Approved company description",
          "Approved proof points",
          "Do-not-use claims",
        ]),
      ];
    }
    output.aeoReadiness.status = output.aeoReadiness.status === "blocked" ? "blocked" : "draft";
    output.aeoReadiness.answerReadyOpportunities = [
      "What the company is",
      "Who it serves",
      "Why it matters",
      "What proof supports claims",
    ];
    output.aeoReadiness.missingProof = [
      ...new Set([
        ...output.aeoReadiness.missingProof,
        "Approved description",
        "Canonical URLs",
        "Proof-backed claims",
        "Source-backed FAQ inputs",
      ]),
    ];
  }

  output.aeoReadiness.recommendedWebInputs = sanitizeRecommendedWebInputs(output.aeoReadiness.recommendedWebInputs, rawContext);

  const serialized = JSON.stringify(output).toLowerCase();
  for (const phrase of forbiddenLiveActionClaims) {
    if (serialized.includes(phrase)) {
      blockers.add(`Forbidden live-action or unsupported performance claim detected: ${phrase}`);
      blockedClaims.push({
        claim: phrase,
        status: "blocked",
        source: "deterministic_guardrail",
        notes: "V1 can draft review packets only; live execution claims require approved external evidence.",
      });
      claimsNeedingApproval.push({
        claim: phrase,
        status: "blocked",
        source: "deterministic_guardrail",
        notes: "Blocked until a human approves evidence and a separate live action is explicitly authorized.",
      });
      output.status = "blocked";
      output.statusPayload.readiness = "blocked";
    }
  }

  output.approvalGates = mergeApprovalGates(
    output.approvalGates.filter((gate) =>
      [gate.decision, gate.requiredBefore].every((value) =>
        preservesQualifiedHipaaNuance(value, rawContext)
      )
    ),
  );
  for (const claim of collectSensitiveOutputClaims(output)) {
    blockedClaims.push(sensitiveClaimGuardrail(claim));
    claimsNeedingApproval.push(sensitiveClaimNeedsApproval(claim));
  }
  output.contextArtifacts.proofAndConstraints.constraints = mergeDefaultConstraints(output.contextArtifacts.proofAndConstraints.constraints);
  output.contextArtifacts.channelRegistry.blockedActions = mergeDefaultConstraints(output.contextArtifacts.channelRegistry.blockedActions);
  output.assumptionsAndMissingEvidence = dedupeClaims(assumptionsAndMissingEvidence);
  output.extractedClaims = dedupeClaims([...output.extractedClaims, ...output.approvedFacts, ...output.assumptionsAndMissingEvidence])
    .filter((claim) => !isGuardedReusableClaim(claim.claim));
  output.proofBackedClaims = dedupeClaims(output.proofBackedClaims.filter(isReusableProofClaim));
  output.contextArtifacts.proofAndConstraints.blockedClaims =
    normalizeBlockedClaims(blockedClaims.filter(preservesSourceHipaaNuance));
  output.claimsNeedingApproval = normalizeClaimsNeedingApproval([
    ...claimsNeedingApproval.filter(preservesSourceHipaaNuance),
    ...output.contextArtifacts.proofAndConstraints.blockedClaims,
    ...output.assumptionsAndMissingEvidence.filter((claim) => claim.status === "assumption" || claim.status === "missing"),
  ]);
  if (output.claimsNeedingApproval.some((claim) => claim.source === "sensitive_claim_guardrail")) {
    blockers.add("Sensitive or proof-dependent claims need approval before review-ready reuse.");
  }
  if (isSensitiveClaim(output.workspaceContextDraft)) {
    output.workspaceContextDraft = [
      renderWorkspaceContextDraft(output.statusPayload.companyName, output.statusPayload.readiness),
      "Sensitive claims are withheld from this workspace-context draft until approved evidence and owner review are supplied.",
    ].join("\n");
  }
  output.consumedContext.missing = [...missing];
  output.contextArtifacts.companyContext.missingContext = [...missing];
  output.openQuestions = normalizeOpenQuestions(output.openQuestions, output.consumedContext.missing, output.conversationIntent);
  output.statusPayload.blockers = [...blockers];
  output.contextArtifacts.dashboardSignals.blockers = [...new Set([...output.contextArtifacts.dashboardSignals.blockers, ...blockers])];
  output.statusPayload.requiredArtifacts = normalizeArtifacts([...output.statusPayload.requiredArtifacts, ...getRequestedArtifacts(input)]);
  output.statusPayload.nextAgents = normalizeAgents(output.statusPayload.nextAgents);
  output.downstreamHandoff = output.downstreamHandoff
    .filter((handoff) => agentValues.includes(handoff.agent))
    .map((handoff) => ({
      ...handoff,
      receives: normalizeArtifacts(handoff.receives),
    }));

  if (output.downstreamHandoff.length === 0) {
    output.downstreamHandoff = defaultDownstreamHandoff();
  } else if (output.status !== "blocked") {
    output.downstreamHandoff = mergeHandoffs(output.downstreamHandoff, defaultDownstreamHandoff());
  }

  if (output.status !== "blocked" && hasOpenContextGaps(output)) {
    output.status = "needs_input";
    if (output.statusPayload.readiness === "review_ready") output.statusPayload.readiness = "draft";
    if (output.aeoReadiness.status === "review_ready") output.aeoReadiness.status = "draft";
    if (output.contextArtifacts.dashboardSignals.readiness === "review_ready") output.contextArtifacts.dashboardSignals.readiness = "draft";
  }

  if (output.statusPayload.readiness === "review_ready" && hasSensitiveOrMissingProofGaps(output)) {
    output.statusPayload.readiness = "draft";
    output.aeoReadiness.status = output.aeoReadiness.status === "blocked" ? "blocked" : "draft";
    output.contextArtifacts.dashboardSignals.readiness = output.contextArtifacts.dashboardSignals.readiness === "blocked" ? "blocked" : "draft";
    output.contextArtifacts.dashboardSignals.blockers = [
      ...new Set([
        ...output.contextArtifacts.dashboardSignals.blockers,
        "Sensitive or proof-dependent claims need approval before review-ready reuse.",
      ]),
    ];
    output.statusPayload.blockers = [
      ...new Set([
        ...output.statusPayload.blockers,
        "Sensitive or proof-dependent claims need approval before review-ready reuse.",
      ]),
    ];
  }

  scrubReusableGuardedClaims(output);

  if (output.workspaceContextDraft.includes("Sensitive claims are withheld from this workspace-context draft")) {
    output.workspaceContextDraft = [
      renderWorkspaceContextDraft(output.statusPayload.companyName, output.statusPayload.readiness),
      "Sensitive claims are withheld from this workspace-context draft until approved evidence and owner review are supplied.",
    ].join("\n");
  }

  return finalizeCompleteMarketerContextPacket(output, rawContext);
}

function finalizeCompleteMarketerContextPacket(
  output: Output,
  rawContext: string,
): Output {
  const packet = extractMarketerContextPacket(rawContext);
  if (!packet) return output;

  const sensitiveReusableFacts = [
    packet.description,
    ...packet.approvedClaims,
  ].filter(isGuardedReusableClaim);
  if (sensitiveReusableFacts.length > 0) {
    return output;
  }

  const approvedFacts = [
    userSuppliedClaim(`Company name: ${packet.companyName}`),
    userSuppliedClaim(packet.description),
    ...packet.approvedClaims.map(userSuppliedClaim),
  ];
  const optionalEvidenceGaps = packet.approvedClaims.length > 0
    ? [
        "Customer results, pricing, security, compliance, and quantified performance proof remain TBD unless separately supplied and approved.",
      ]
    : [
        "Proof points and public claims remain TBD; planning drafts may proceed without inventing them.",
      ];
  const operatingConstraints = mergeDefaultConstraints(packet.constraints);

  output.status = "ready_for_review";
  output.conversationIntent = "source_available";
  output.consumedContext = {
    used: [
      "Company description",
      "Primary audiences",
      "Current marketing goal",
      packet.approvedClaims.length > 0
        ? "Approved claims"
        : "Company description as the only currently reusable factual claim",
      "Channels in scope",
      packet.constraints.length > 0
        ? "Important constraints"
        : "Default draft-only Marketing OS constraints",
    ],
    missing: [],
    sourceLabels: ["User-provided text input"],
  };
  output.contextArtifacts.companyContext = {
    status: "draft",
    companyName: packet.companyName,
    category: "TBD — refine when useful; not required to begin.",
    primaryAudiences: packet.audiences,
    goals: packet.goals,
    missingContext: [],
  };
  output.contextArtifacts.messagingSource = {
    status: "draft",
    overview: packet.description,
    positioning:
      "TBD — develop in Messaging from the approved company description, audiences, goal, and claims.",
    proofNeeds: optionalEvidenceGaps,
    answerReadyLanguage: packet.approvedClaims,
  };
  output.contextArtifacts.brandKit = {
    status: "draft",
    voice:
      "TBD — add approved brand voice guidance when available; this does not block marketing drafts.",
    visualDirection:
      "TBD — add approved visual guidance when available; this does not block presentation outlines or design briefs.",
    constraints: [
      "Keep brand recommendations draft-only until approved brand guidance is supplied.",
    ],
  };
  output.contextArtifacts.audienceSegments = packet.audiences.map(
    (audience) => ({
      status: "draft",
      name: audience,
      description:
        "User-supplied audience. ICP and Audience Segmentation may add pains, fit, buying roles, and exclusions as reviewable hypotheses.",
      evidenceStatus: "user_supplied",
      missingEvidence: [],
    }),
  );
  output.contextArtifacts.channelRegistry = {
    status: "draft",
    approvedChannels: packet.channels,
    channelsTbd: [],
    blockedActions: operatingConstraints,
  };
  output.contextArtifacts.proofAndConstraints = {
    status: "draft",
    approvedClaims: approvedFacts,
    blockedClaims: [],
    constraints: operatingConstraints,
  };
  output.contextArtifacts.dashboardSignals = {
    status: "draft",
    readiness: "review_ready",
    blockers: [],
    nextReviewSignals: [
      "Approve this baseline company context.",
      "Add proof, brand guidance, or more detail later when it improves a specific workflow.",
    ],
  };
  output.workspaceContextDraft = renderMarketerWorkspaceContextDraft(packet);
  output.approvedFacts = approvedFacts;
  output.extractedClaims = approvedFacts;
  output.proofBackedClaims = [];
  output.claimsNeedingApproval = [];
  output.assumptionsAndMissingEvidence = [];
  output.openQuestions = [];
  output.approvalGates = [
    {
      ownerRole: "Company Context Owner",
      decision:
        "Approve this baseline company description, audiences, goal, reusable claims, channels, and constraints.",
      requiredBefore: "Publishing the compact brief for specialist reuse.",
      status: "needed",
    },
  ];
  output.aeoReadiness = {
    status: "draft",
    entityClarity:
      "The approved company description can serve as the baseline entity summary.",
    answerReadyOpportunities: [
      "What the company is",
      "Who it serves",
      "What the current marketing goal is",
    ],
    missingProof: optionalEvidenceGaps,
    recommendedWebInputs: [],
  };
  output.statusPayload = {
    ...output.statusPayload,
    companyName: packet.companyName,
    readiness: "review_ready",
    nextAgents: [
      "Market Signal",
      "ICP",
      "Audience Segmentation",
      "Messaging",
      "Branding And Pitch Deck",
      "Social Monitoring And Content",
      "Campaigns And Paid Media",
    ],
    blockers: [],
    requiredArtifacts: [...defaultRequestedArtifacts],
    evidence_mode: "source_supplied",
    source_coverage: [
      "Company description",
      "Audiences",
      "Marketing goal",
      "Approved claims",
      "Channel scope",
      "Constraints",
    ],
    coverage_limitations: [
      "Only the user-supplied context was inspected. No live website, connector, or monitoring source was used.",
    ],
    safety: {
      ...output.statusPayload.safety,
      action_mode: "draft_only",
      external_mutation_requested: false,
      blocked_actions: operatingConstraints,
      unsupported_claims: [],
      evidence_gaps: optionalEvidenceGaps,
    },
  };
  output.downstreamHandoff = defaultDownstreamHandoff();

  return output;
}

function extractMarketerContextPacket(
  rawContext: string,
): MarketerContextPacket | undefined {
  if (
    !/\b(?:current marketing goal|approved claims|important constraints)\s*:/i.test(
      rawContext,
    )
  ) {
    return undefined;
  }
  const companyName = extractCompanyName(rawContext);
  const description =
    extractLineAfterLabels(rawContext, [
      "Approved company description",
      "Approved description",
      "Company description",
      "Product description",
      "Description",
    ]) ?? extractCompanyDescriptionFromProse(rawContext, companyName);
  const audiences = extractListAfterLabels(rawContext, [
    "Primary audiences",
    "Primary audience",
    "Audiences",
    "Audience",
  ]);
  const goals = extractBlockAfterLabels(rawContext, [
    "Current marketing goal",
    "Marketing goal",
    "Current goals",
    "Goals",
  ]);
  const approvedClaims = extractBlockAfterLabels(rawContext, [
    "Approved claims",
    "Approved facts",
    "Claims approved for reuse",
  ]);
  const channels = extractListAfterLabels(rawContext, [
    "Channels in scope",
    "Approved channels",
    "Channel scope",
    "Channels",
  ]);
  const constraints = extractBlockAfterLabels(rawContext, [
    "Important constraints",
    "Constraints",
    "Anything not approved for reuse",
  ]);

  if (
    !companyName ||
    !description ||
    audiences.length === 0 ||
    goals.length === 0 ||
    channels.length === 0
  ) {
    return undefined;
  }

  return {
    companyName,
    description,
    audiences,
    goals,
    approvedClaims,
    channels,
    constraints,
  };
}

function renderMarketerWorkspaceContextDraft(
  packet: MarketerContextPacket,
): string {
  return [
    `Company: ${packet.companyName}`,
    "Readiness: review_ready",
    `Company description: ${packet.description}`,
    `Primary audiences: ${packet.audiences.join(", ")}`,
    `Current marketing goal: ${packet.goals.join(" ")}`,
    `Approved claims: ${packet.approvedClaims.length > 0 ? packet.approvedClaims.join(" ") : "None yet; do not invent proof."}`,
    `Channels in scope: ${packet.channels.join(", ")}`,
    `Important constraints: ${packet.constraints.length > 0 ? packet.constraints.join(" ") : "Keep unknown facts as TBD."}`,
    "Operating rule: create reviewable drafts, distinguish facts from assumptions, and take no external action.",
  ].join("\n");
}

function isSparse(rawContext: string): boolean {
  const normalized = rawContext.toLowerCase();
  const wordCount = rawContext.split(/\s+/).filter(Boolean).length;
  return wordCount < 12 || sparseMarkers.some((marker) => normalized.includes(marker));
}

function isPlaceholderSourceIntro(rawContext: string): boolean {
  const normalized = rawContext.toLowerCase().trim();
  if (!normalized || hasExplicitContextDetails(rawContext)) return false;

  return (
    /^here(?:'s| is)\b.*\b(context|information|info|profile|source|sources|material|company)\b/.test(normalized) ||
    /\b(i attached|i uploaded|attached|uploaded|see attached|see the attached|see file|see pdf)\b/.test(normalized) ||
    /\b(context|information|info|profile|source|sources|material|company profile)\b.*\b(attached|uploaded|in the file|in the pdf)\b/.test(normalized)
  );
}

function shouldRequestReadableSourceText(rawContext: string): boolean {
  const wordCount = rawContext.split(/\s+/).filter(Boolean).length;
  return isPlaceholderSourceIntro(rawContext) || (!hasExplicitContextDetails(rawContext) && wordCount < 20);
}

function hasExplicitContextDetails(rawContext: string): boolean {
  return Boolean(
    extractCompanyName(rawContext) ||
      extractLineAfterLabels(rawContext, [
        "Approved company description",
        "Approved description",
        "Company description",
        "Product description",
        "Description",
        "Primary audiences",
        "Primary audience",
        "Current marketing goal",
        "Marketing goal",
        "Current goals",
        "Goals",
        "Approved claims",
        "Approved facts",
        "Claims approved for reuse",
        "Proof-backed claims or source excerpts",
        "Proof-backed claims",
        "Approved proof",
        "Proof points",
        "Evidence",
        "Channels in scope",
        "Approved channels",
        "Channel scope",
        "Channels",
        "Important constraints",
        "Constraints",
      ]),
  );
}

function normalizeArtifacts(values: readonly string[]): Array<(typeof artifactValues)[number]> {
  const normalized = values
    .map(normalizeArtifactName)
    .filter((value): value is (typeof artifactValues)[number] => value !== undefined);
  return normalized.length ? [...new Set(normalized)] : [...defaultRequestedArtifacts];
}

function normalizeArtifactName(value: string): (typeof artifactValues)[number] | undefined {
  const normalized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();

  const aliases: Record<string, (typeof artifactValues)[number]> = {
    "company": "company-context",
    "company-context": "company-context",
    "companycontext": "company-context",
    "context": "company-context",
    "messaging": "messaging-source",
    "messaging-source": "messaging-source",
    "messagingsource": "messaging-source",
    "brand": "brand-kit",
    "brand-kit": "brand-kit",
    "brandkit": "brand-kit",
    "audience": "audience-segments",
    "audience-segments": "audience-segments",
    "audiencesegments": "audience-segments",
    "channel": "channel-registry",
    "channel-registry": "channel-registry",
    "channelregistry": "channel-registry",
    "proof": "proof-and-constraints",
    "proof-constraints": "proof-and-constraints",
    "proof-and-constraints": "proof-and-constraints",
    "proofandconstraints": "proof-and-constraints",
    "dashboard": "dashboard-signals",
    "dashboard-signals": "dashboard-signals",
    "dashboardsignals": "dashboard-signals",
  };

  return aliases[normalized] ?? (artifactValues.includes(normalized as (typeof artifactValues)[number]) ? normalized as (typeof artifactValues)[number] : undefined);
}

function normalizeAgents(values: readonly string[]): Array<(typeof agentValues)[number]> {
  const normalized = values.filter((value): value is (typeof agentValues)[number] => agentValues.includes(value as (typeof agentValues)[number]));
  return normalized.length ? [...new Set(normalized)] : ["Market Signal", "ICP", "Messaging"];
}

function dedupeClaims(claims: Claim[]): Claim[] {
  const seen = new Set<string>();
  return claims.filter((claim) => {
    const key = `${claim.claim}|${claim.status}|${claim.source ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeApprovedClaims(claims: Claim[], rawContext: string): { approved: Claim[]; downgraded: Claim[]; sensitive: Claim[] } {
  const approved: Claim[] = [];
  const downgraded: Claim[] = [];
  const sensitive: Claim[] = [];

  for (const claim of claims) {
    if (claim.status !== "approved" && claim.status !== "user_supplied") {
      downgraded.push(claim);
      continue;
    }

    if (!sourceEvidenceLabelsAllowReuse(claim.claim, rawContext)) {
      sensitive.push({
        ...sensitiveClaimGuardrail(claim.claim),
        notes:
          "The supplied source labels this material as review-required, secondary, blocked, or unknown. Only explicitly approved_reusable material may enter reusable context.",
      });
      continue;
    }

    if (isGuardedReusableClaim(claim.claim)) {
      sensitive.push(sensitiveClaimGuardrail(claim.claim));
      continue;
    }

    if (isCompanyNameClaimGrounded(claim.claim, rawContext) || isGroundedInInput(claim.claim, rawContext)) {
      approved.push({
        ...claim,
        status: "user_supplied",
        source: claim.source ?? "user_input",
      });
    } else {
      downgraded.push({
        ...claim,
        status: "assumption",
        source: claim.source ?? "model_inference",
        notes: appendNote(claim.notes, "Downgraded because the claim was not directly grounded in supplied context."),
      });
    }
  }

  return { approved: dedupeClaims(approved), downgraded: dedupeClaims(downgraded), sensitive: dedupeClaims(sensitive) };
}

export function sourceEvidenceLabelsAllowReuse(
  claim: string,
  rawContext: string,
): boolean {
  if (
    !/\[(?:approved_reusable|source_supplied_review_required|secondary_estimate|blocked_action|unknown)\]/i.test(
      rawContext,
    )
  ) {
    return true;
  }
  const approvedReusableContext =
    extractApprovedReusableContext(rawContext);
  return (
    isCompanyNameClaimGrounded(claim, approvedReusableContext) ||
    isGroundedInInput(claim, approvedReusableContext)
  );
}

function extractApprovedReusableContext(rawContext: string): string {
  const approvedLines: string[] = [];
  let collecting = false;
  for (const rawLine of rawContext.split(/\r?\n/)) {
    const line = rawLine.trim();
    const approvedMarker = line.match(
      /\[approved_reusable\]\s*`?\s*(.*)$/i,
    );
    if (approvedMarker) {
      collecting = true;
      if (approvedMarker[1]?.trim()) {
        approvedLines.push(approvedMarker[1].trim());
      }
      continue;
    }
    if (
      /^#{1,6}\s/.test(line) ||
      /^[-*]\s+/.test(line) ||
      /\[(?:source_supplied_review_required|secondary_estimate|blocked_action|unknown)\]/i.test(
        line,
      )
    ) {
      collecting = false;
      continue;
    }
    if (collecting && line) {
      approvedLines.push(line);
    }
  }
  return approvedLines.join(" ");
}

function isCompanyNameClaimGrounded(claim: string, rawContext: string): boolean {
  const match = claim.match(/^Company name:\s*(.+)$/i);
  const name = match?.[1]?.trim();
  return Boolean(name && normalizeForGrounding(rawContext).includes(normalizeForGrounding(name)));
}

function isGroundedInInput(claim: string, rawContext: string): boolean {
  const normalizedClaim = normalizeForGrounding(claim);
  const normalizedContext = normalizeForGrounding(rawContext);
  if (!normalizedClaim || !normalizedContext) return false;
  if (normalizedContext.includes(normalizedClaim)) return true;

  const claimTokens = significantTokens(normalizedClaim);
  if (claimTokens.length < 3) return false;

  const contextTokens = new Set(significantTokens(normalizedContext));
  const matched = claimTokens.filter((token) => contextTokens.has(token));
  return matched.length / claimTokens.length >= 0.7;
}

function normalizeForGrounding(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(value: string): string[] {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "into",
    "from",
    "include",
    "includes",
    "project",
  ]);
  return value
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function appendNote(existing: string | undefined, note: string): string {
  return existing ? `${withoutTrailingPeriod(existing)}. ${note}` : note;
}

function hasExplicitApprovedChannelScope(rawContext: string): boolean {
  if (/(?:channels?|channel scope|channels in scope)\s*:\s*/i.test(rawContext) || /approved channels?\s*:/i.test(rawContext)) {
    return !/channels?.{0,120}\bTBD\b/i.test(rawContext);
  }
  return false;
}

function hasApprovedProofEvidence(rawContext: string): boolean {
  return /(?:approved proof|proof-backed claims?|proof points?\s*:|evidence\s*:|source-backed|case stud(?:y|ies)|benchmark|adoption metric|customer evidence)/i.test(rawContext);
}

function sanitizeRecommendedWebInputs(inputs: string[], rawContext: string): string[] {
  const sanitized = inputs
    .filter((input) => !/https?:\/\//i.test(input) || rawContext.includes(input))
    .map((input) => input.replace(/\brank(?:ing)?\b/gi, "answer"))
    .filter(Boolean);

  return sanitized.length
    ? [...new Set(sanitized)]
    : ["Entity summary", "FAQ candidates", "Canonical URL TBD", "Schema.org inputs", "llms.txt inputs"];
}

function mergeApprovalGates(gates: z.infer<typeof approvalGateSchema>[]): z.infer<typeof approvalGateSchema>[] {
  const merged = [...gates];
  const existingRoles = new Set(merged.map((gate) => gate.ownerRole.toLowerCase()));

  for (const gate of defaultApprovalGates()) {
    if (!existingRoles.has(gate.ownerRole.toLowerCase())) {
      merged.push(gate);
    }
  }

  return merged;
}

function defaultApprovalGates(): z.infer<typeof approvalGateSchema>[] {
  return [
    {
      ownerRole: "Company Context Owner",
      decision: "Approve company identity, goals, and primary audiences.",
      requiredBefore: "Downstream agents reuse context artifacts.",
      status: "needed",
    },
    {
      ownerRole: "Legal Reviewer",
      decision: "Approve legal, trademark, privacy, security, compliance, pricing, guarantee, and performance claims.",
      requiredBefore: "Public messaging or campaign use.",
      status: "needed",
    },
    {
      ownerRole: "Marketing Owner",
      decision: "Approve channel scope and any live execution plan.",
      requiredBefore: "Publishing, scheduling, spend, CRM activation, or external system changes.",
      status: "blocked",
    },
  ];
}

function hasOpenContextGaps(output: Output): boolean {
  return (
    output.consumedContext.missing.length > 0 ||
    output.assumptionsAndMissingEvidence.some((claim) => claim.status === "assumption" || claim.status === "missing") ||
    output.contextArtifacts.companyContext.missingContext.length > 0 ||
    output.contextArtifacts.channelRegistry.approvedChannels.length === 0
  );
}

function buildReadableSourceNeededOutput(input: Input, conversationIntent: ConversationIntent = "attachment_unreadable"): Output {
  return applyReadableSourceNeededState(
    buildFallbackOutput(input, [
      "No readable source text was provided to the agent. If a file was attached, paste the relevant text or excerpts into chat.",
    ], conversationIntent),
  );
}

function applyReadableSourceNeededState(output: Output): Output {
  const missing = [
    "Readable company/source text",
    "Company",
    "Approved description",
    "Primary audiences",
    "Current goals",
    "Proof-backed claims or source excerpts",
    "Channels in scope",
    "Anything not approved for reuse",
  ];
  const blocker = "No readable source text was provided to the agent. If a file was attached, paste the relevant text or excerpts into chat.";

  output.status = "blocked";
  output.conversationIntent = "attachment_unreadable";
  output.persistenceState = normalizePersistenceState(undefined, "attachment_unreadable");
  output.consumedContext.used = ["User message did not include readable company source text"];
  output.consumedContext.missing = missing;
  output.contextArtifacts.companyContext.status = "blocked";
  output.contextArtifacts.companyContext.companyName = "TBD";
  output.contextArtifacts.companyContext.category = "TBD";
  output.contextArtifacts.companyContext.primaryAudiences = ["TBD"];
  output.contextArtifacts.companyContext.goals = ["TBD"];
  output.contextArtifacts.companyContext.missingContext = missing;
  output.contextArtifacts.messagingSource.status = "blocked";
  output.contextArtifacts.messagingSource.overview = "TBD. Paste readable company/source text before the Marketing OS drafts context artifacts.";
  output.contextArtifacts.messagingSource.positioning = "TBD. Requires approved source text, audiences, goals, proof, and constraints.";
  output.contextArtifacts.messagingSource.answerReadyLanguage = [];
  output.contextArtifacts.messagingSource.proofNeeds = ["Readable source text", "Approved description", "Proof-backed claims"];
  output.contextArtifacts.brandKit.status = "blocked";
  output.contextArtifacts.audienceSegments = [
    {
      status: "blocked",
      name: "Primary audience TBD",
      description: "Audience segments require readable source text before drafting.",
      evidenceStatus: "missing",
      missingEvidence: ["Readable company/source text", "Approved audience definitions"],
    },
  ];
  output.contextArtifacts.channelRegistry.status = "blocked";
  output.contextArtifacts.channelRegistry.approvedChannels = [];
  output.contextArtifacts.channelRegistry.channelsTbd = ["TBD"];
  output.contextArtifacts.proofAndConstraints.status = "blocked";
  output.contextArtifacts.proofAndConstraints.approvedClaims = [];
  output.contextArtifacts.proofAndConstraints.constraints = defaultConstraints;
  output.contextArtifacts.dashboardSignals.status = "blocked";
  output.contextArtifacts.dashboardSignals.readiness = "blocked";
  output.contextArtifacts.dashboardSignals.blockers = [blocker];
  output.workspaceContextDraft = "Readable company context has not been provided yet. Paste source text before drafting reusable Marketing OS context.";
  output.approvedFacts = [];
  output.extractedClaims = [];
  output.proofBackedClaims = [];
  output.assumptionsAndMissingEvidence = missing.map((item) => ({
    claim: item,
    status: "missing",
    source: "context_gap",
  }));
  output.claimsNeedingApproval = output.assumptionsAndMissingEvidence;
  output.openQuestions = normalizeOpenQuestions([], missing, "attachment_unreadable");
  output.approvalGates = [
    {
      ownerRole: "Company Context Owner",
      decision: "Provide readable company/source text.",
      requiredBefore: "Company Context Builder drafts reusable context artifacts.",
      status: "needed",
    },
    {
      ownerRole: "Legal Reviewer",
      decision: "Approve legal, trademark, privacy, security, compliance, pricing, guarantee, and performance claims.",
      requiredBefore: "Public messaging or campaign use.",
      status: "needed",
    },
    {
      ownerRole: "Marketing Owner",
      decision: "Approve channel scope and any live execution plan.",
      requiredBefore: "Publishing, scheduling, spend, CRM activation, or external system changes.",
      status: "blocked",
    },
  ];
  output.aeoReadiness.status = "blocked";
  output.aeoReadiness.entityClarity = "Blocked until readable company/source text is provided.";
  output.aeoReadiness.answerReadyOpportunities = ["What the company is", "Who it serves", "Why it matters", "What proof supports claims"];
  output.aeoReadiness.missingProof = ["Readable source text", "Approved description", "Canonical URLs", "Proof-backed claims"];
  output.aeoReadiness.recommendedWebInputs = ["Entity summary", "FAQ candidates", "Canonical URL TBD", "Schema.org inputs", "llms.txt inputs"];
  output.statusPayload.companyName = "TBD";
  output.statusPayload.readiness = "blocked";
  output.statusPayload.nextAgents = ["Company Context Builder"];
  output.statusPayload.blockers = [blocker];
  output.downstreamHandoff = [
    {
      agent: "Company Context Builder",
      receives: ["company-context"],
      reason: "Needs readable source text before creating reusable company context artifacts.",
    },
  ];

  return output;
}

function buildSaveStateQuestionOutput(input: Input, state: AgentState = {}): Output {
  const output = buildFallbackOutput(input, ["No persistence operation has been run in this agent."], "save_state_question");
  const savedToWorkspace = state.workspaceContextStatus === "published" && Boolean(state.workspaceContextId);
  const savedArtifacts = Boolean(
    state.durableContextArtifactId &&
      state.durableContextArtifactRevision,
  );
  const approvedOnly = !savedToWorkspace && Boolean(state.approvedOutput);
  const draftedOnly = !savedToWorkspace && !approvedOnly && Boolean(state.lastOutput);
  output.status = "needs_input";
  output.persistenceState = {
    drafted_in_session: Boolean(state.lastOutput ?? state.approvedOutput) || true,
    approved_in_session: Boolean(state.approvedOutput),
    saved_to_workspace_context: savedToWorkspace,
    saved_to_context_artifacts: savedArtifacts,
    workspace_context_id: state.workspaceContextId,
    workspace_context_draft_id: state.workspaceContextDraftId,
    workspace_context_previous_id: state.workspaceContextPreviousId,
    workspace_context_status: state.workspaceContextStatus ?? "not_requested",
    workspace_context_summary: state.workspaceContextSummary,
    workspace_context_publish_path: state.workspaceContextPublishPath,
    source_references:
      state.durableSourceId && state.durableSourceRevision
        ? [`${state.durableSourceId}:${state.durableSourceRevision}`]
        : [],
    context_artifact_references:
      state.durableContextArtifactId &&
      state.durableContextArtifactRevision
        ? [
            `${state.durableContextArtifactId}:${state.durableContextArtifactRevision}`,
          ]
        : [],
    workspace_context_rollback_note: state.workspaceContextPreviousId
      ? `Re-publish previous workspace context ${state.workspaceContextPreviousId} to roll back.`
      : undefined,
    persistence_note: savedToWorkspace
      ? `Yes. The approved Company Context artifact is retained in Guild Chat state, and its compact brief has been published to Guild Workspace Context${state.workspaceContextId ? ` as ${state.workspaceContextId}` : ""}${state.workspaceContextPublishPath ? ` through ${state.workspaceContextPublishPath}` : ""}.`
      : approvedOnly
        ? "The latest Company Context artifact is durably approved and waiting for the exact workspace-context publish confirmation. Guild workspace context has not changed."
        : draftedOnly
          ? savedArtifacts
            ? "The encrypted source and review-ready Company Context artifact are durably stored, but the artifact is not approved and Guild workspace context has not changed."
            : "The latest company context is a session draft and durable persistence did not complete."
          : "No durable Company Context draft is available.",
  };
  output.consumedContext.used = ["User asked whether company context is saved or approved."];
  output.consumedContext.missing = savedToWorkspace
    ? []
    : approvedOnly
      ? ["Exact publish confirmation: publish approved context to workspace context"]
      : ["Explicit approval", "Exact publish confirmation: publish approved context to workspace context"];
  output.contextArtifacts.companyContext.status = "needs_input";
  output.contextArtifacts.companyContext.missingContext = output.consumedContext.missing;
  output.contextArtifacts.dashboardSignals.status = "needs_input";
  output.contextArtifacts.dashboardSignals.readiness = "draft";
  output.contextArtifacts.dashboardSignals.blockers = savedArtifacts
    ? approvedOnly
      ? ["Awaiting exact workspace context publish confirmation."]
      : ["Durable Company Context artifact is awaiting approval."]
    : ["Durable Company Context persistence is unavailable."];
  output.workspaceContextDraft = savedToWorkspace
    ? `Guild workspace context published. Context id: ${state.workspaceContextId ?? "TBD"}.`
    : approvedOnly
      ? "Approved Company Context artifact is staged durably. Reply exactly `publish approved context to workspace context` to publish its compact brief."
      : savedArtifacts
        ? "Review-ready Company Context artifact is stored durably. Guild workspace context has not changed."
        : "No Guild workspace context update has been saved, and no durable Company Context artifact is available.";
  output.openQuestions = [
    savedToWorkspace ? "Should a new Company Context revision be drafted?" : "Should the current durable artifact revision be approved?",
    "Do any claims need to be removed before a future persistence step?",
    approvedOnly ? "Should I publish the approved company context after the exact confirmation phrase?" : "Which approved source should be used if a separate save/publish workflow is later authorized?",
  ];
  output.statusPayload.readiness = "draft";
  output.statusPayload.blockers = savedToWorkspace
    ? []
    : approvedOnly
      ? ["Awaiting exact workspace context publish confirmation."]
      : savedArtifacts
        ? ["Durable Company Context artifact is awaiting approval."]
        : ["Durable Company Context persistence did not complete."];
  output.downstreamHandoff = [
    {
      agent: "Company Context Builder",
      receives: ["company-context"],
      reason: "Answer save-state questions directly before drafting or routing additional work.",
    },
  ];
  return output;
}

function buildApprovalOrEditOutput(input: Input, state: AgentState = {}): { output: Output; state: AgentState } {
  const rawContext = getRawContext(input);
  const isEdit = /\bedit\s+company context\s*:/i.test(rawContext) || /\b(remove|delete)\b/i.test(rawContext);
  const isPersistenceRequest = isContextPersistenceRequest(rawContext);
  const bareApprovalCommand = isBareApprovalCommand(rawContext);
  const hasVisibleDraftContext = hasVisibleApprovalContext(rawContext);
  const storedDraft = state.lastOutput;

  if (!isEdit && storedDraft) {
    const approvedOutput = approveStoredDraft(storedDraft, isPersistenceRequest);
    return {
      output: approvedOutput,
      state: {
        ...state,
        lastOutput: storedDraft,
        approvedOutput,
        approvedSourceText: state.lastSourceText,
        approvedAt: new Date().toISOString(),
        workspaceContextStatus: "approved_pending_publish",
      },
    };
  }

  const editInstruction = rawContext.match(/\bedit\s+company context\s*:\s*([^\n\r]+)/i)?.[1]?.trim() ?? rawContext.trim();
  const approvalWithoutVisibleDraft = !isEdit && (bareApprovalCommand || !hasVisibleDraftContext);
  const output = buildFallbackOutput(
    input,
    approvalWithoutVisibleDraft ? ["Approval or persistence request received, but no prior draft content is visible to this agent run."] : [],
    "approval_or_edit",
  );
  const editClaim = isEdit
    ? `Requested edit: ${editInstruction}`
    : approvalWithoutVisibleDraft
      ? isPersistenceRequest
        ? "User requested company context approval or workspace-context persistence in this session."
        : "User requested company context approval in this session."
      : isPersistenceRequest
        ? "User approved company context and requested workspace-context persistence in this session."
        : "User approved company context in this session.";

  output.status = isEdit || approvalWithoutVisibleDraft ? "needs_input" : "ready_for_review";
  output.persistenceState = {
    drafted_in_session: hasVisibleDraftContext || isEdit,
    approved_in_session: !isEdit && !approvalWithoutVisibleDraft,
    saved_to_workspace_context: false,
    saved_to_context_artifacts: false,
    persistence_note: approvalWithoutVisibleDraft
      ? "Approval or persistence intent was noted, but this run cannot see the prior draft content. No company context has been approved, saved, or published."
      : isEdit
        ? "The edit is reflected as a session-only draft change. It has not been saved to Guild workspace context or Context Hub artifacts."
        : "Approved in session only. It is ready for a separate workspace context edit/publish lifecycle step, but nothing has been saved to Guild workspace context or Context Hub artifacts.",
  };
  output.consumedContext.used = [editClaim];
  output.consumedContext.missing = approvalWithoutVisibleDraft
    ? ["Visible Ready-To-Publish Workspace Context block", "Separate workspace context edit/publish approval"]
    : isEdit ? ["Review the edited session draft", "Separate persistence step"] : ["Separate persistence step"];
  output.contextArtifacts.companyContext.status = isEdit || approvalWithoutVisibleDraft ? "needs_input" : "draft";
  output.contextArtifacts.companyContext.missingContext = output.consumedContext.missing;
  output.contextArtifacts.proofAndConstraints.blockedClaims = dedupeClaims([
    ...output.contextArtifacts.proofAndConstraints.blockedClaims,
    ...(isPricingOrSensitiveEdit(rawContext)
      ? [{
          claim: "Pricing, compliance, security, performance, or production-readiness claims removed or blocked by user edit.",
          status: "do_not_use" as const,
          source: "user_edit",
          notes: "Do not reuse these claims unless the user supplies approved evidence in a later run.",
        }]
      : []),
  ]);
  output.extractedClaims = approvalWithoutVisibleDraft
    ? [{
        claim: "Approval request cannot be applied because the prior company context draft is not visible in this agent run.",
        status: "blocked",
        source: "approval_context_gap",
        notes: "Paste the Ready-To-Publish Workspace Context block or rerun from visible source text before marking a draft approved.",
      }]
    : [userSuppliedClaim(editClaim)];
  output.claimsNeedingApproval = output.contextArtifacts.proofAndConstraints.blockedClaims;
  output.openQuestions = approvalWithoutVisibleDraft
    ? ["Can you paste the Ready-To-Publish Workspace Context block from the draft turn, or explicitly authorize a separate workspace context edit/publish lifecycle step with that block?"]
    : isEdit
    ? ["Does this edit fully replace the prior draft?", "Should the edited draft be approved in this session?"]
    : ["Should this approved block be handled by a separate workspace context edit/publish lifecycle step?"];
  output.statusPayload.readiness = approvalWithoutVisibleDraft || isEdit ? "draft" : "review_ready";
  output.statusPayload.blockers = approvalWithoutVisibleDraft
    ? ["Prior company context draft is not visible in this run.", "Workspace context publish requires a separate approved lifecycle step."]
    : ["Session approval/edit is not durable persistence."];
  output.contextArtifacts.dashboardSignals.readiness = output.statusPayload.readiness;
  output.contextArtifacts.dashboardSignals.blockers = output.statusPayload.blockers;
  output.downstreamHandoff = approvalWithoutVisibleDraft
    ? [{
        agent: "Company Context Builder",
        receives: ["company-context"],
        reason: "Needs the prior visible draft, pasted Ready-To-Publish Workspace Context block, or explicit lifecycle approval before persistence can be applied.",
      }]
    : defaultDownstreamHandoff();
  return {
    output,
    state: {
      ...state,
      lastOutput: isEdit ? output : state.lastOutput,
      approvedOutput: !isEdit && !approvalWithoutVisibleDraft ? output : state.approvedOutput,
      approvedSourceText: !isEdit && !approvalWithoutVisibleDraft ? state.lastSourceText : state.approvedSourceText,
      approvedAt: !isEdit && !approvalWithoutVisibleDraft ? new Date().toISOString() : state.approvedAt,
      workspaceContextStatus: !isEdit && !approvalWithoutVisibleDraft ? "approved_pending_publish" : state.workspaceContextStatus,
    },
  };
}

function approveStoredDraft(draft: Output, isPersistenceRequest: boolean): Output {
  const output = structuredOutputSchema.parse({
    ...draft,
    conversationIntent: "approval_or_edit",
    status: draft.status === "blocked" ? "needs_input" : "ready_for_review",
    persistenceState: {
      ...draft.persistenceState,
      drafted_in_session: true,
      approved_in_session: true,
      saved_to_workspace_context: false,
      saved_to_context_artifacts:
        draft.persistenceState.saved_to_context_artifacts,
      workspace_context_status: "approved_pending_publish",
      workspace_context_summary: publishSummaryForOutput(draft),
      persistence_note: isPersistenceRequest
        ? "Company context approval is being applied to the durable artifact revision. Workspace context remains unchanged until the exact publication phrase is supplied."
        : "Company context approval is being applied to the durable artifact revision. Reply exactly `publish approved context to workspace context` only after reviewing the retained artifact.",
    },
    consumedContext: {
      ...draft.consumedContext,
      used: [...new Set([...draft.consumedContext.used, "User approved company context in this session."])],
      missing: [
        ...new Set([
          ...draft.consumedContext.missing.filter((item) => !/explicit approval|owner approval/i.test(item)),
          "Exact publish confirmation: publish approved context to workspace context",
        ]),
      ],
    },
    approvalGates: draft.approvalGates.map((gate) => gate.ownerRole === "Company Context Owner" ? { ...gate, status: "approved" as const } : gate),
    statusPayload: {
      ...draft.statusPayload,
      readiness: draft.statusPayload.readiness === "blocked" ? "draft" : "review_ready",
      blockers: [
        ...new Set([
          ...draft.statusPayload.blockers.filter((blocker) => !/owner approval|not saved|session approval/i.test(blocker)),
          "Awaiting exact workspace context publish confirmation.",
        ]),
      ],
    },
    contextArtifacts: {
      ...draft.contextArtifacts,
      dashboardSignals: {
        ...draft.contextArtifacts.dashboardSignals,
        readiness: draft.contextArtifacts.dashboardSignals.readiness === "blocked" ? "draft" : "review_ready",
        blockers: [
          ...new Set([
            ...draft.contextArtifacts.dashboardSignals.blockers.filter((blocker) => !/owner approval|not saved|session approval/i.test(blocker)),
            "Awaiting exact workspace context publish confirmation.",
          ]),
        ],
      },
    },
  });

  return output;
}

async function buildWorkspaceContextPublishOutput(
  input: Input,
  _task: AgentTask,
  state: AgentState,
): Promise<{ output: Output; state: AgentState }> {
  if (!state.approvedOutput) {
    const output = buildFallbackOutput(input, ["Approved company context is required before publishing workspace context."], "approval_or_edit");
    output.status = "needs_input";
    output.persistenceState = {
      ...normalizePersistenceState(undefined, "approval_or_edit"),
      workspace_context_status: "blocked",
      persistence_note: "Publish confirmation received, but no approved company context is available in this session. Nothing has been saved.",
    };
    output.consumedContext.used = ["Exact publish confirmation received without approved session context."];
    output.consumedContext.missing = ["Approved company context"];
    output.statusPayload.blockers = ["Approve a company context draft before publishing workspace context."];
    output.contextArtifacts.dashboardSignals.blockers = output.statusPayload.blockers;
    output.openQuestions = ["Should the current company context draft be approved first?"];
    return { output, state: { ...state, workspaceContextStatus: "blocked" } };
  }

  const approvedOutput = state.approvedOutput;
  if (
    !state.durableContextArtifactId ||
    !state.durableContextArtifactRevision ||
    state.durableContextArtifactStatus !== "approved"
  ) {
    const blockedOutput = markWorkspaceContextPublishBlocked(
      approvedOutput,
      new Error(
        "The exact Company Context artifact revision is not durably approved.",
      ),
    );
    return {
      output: blockedOutput,
      state: {
        ...state,
        lastOutput: blockedOutput,
        workspaceContextStatus: "blocked",
      },
    };
  }

  const routedOutput = structuredOutputSchema.parse({
    ...approvedOutput,
    conversationIntent: "approval_or_edit",
    status: "ready_for_review",
    persistenceState: {
      ...approvedOutput.persistenceState,
      drafted_in_session: true,
      approved_in_session: true,
      saved_to_workspace_context: false,
      saved_to_context_artifacts: true,
      workspace_context_status: "approved_pending_publish",
      workspace_context_summary: publishSummaryForOutput(approvedOutput),
      persistence_note:
        "The Company Context artifact is approved in this direct Builder session, but Workspace Context publication belongs to the canonical Marketing OS Launcher Chat. Return to Launcher and send the exact phrase there. Nothing was published from this direct specialist session.",
    },
    statusPayload: {
      ...approvedOutput.statusPayload,
      blockers: [
        ...new Set([
          ...approvedOutput.statusPayload.blockers.filter(
            (blocker) => !/publish confirmation/i.test(blocker),
          ),
          "Return to the canonical Marketing OS Launcher Chat for Workspace Context publication.",
        ]),
      ],
    },
    openQuestions: [
      ...new Set([
        ...approvedOutput.openQuestions,
        "Open the canonical Marketing OS Launcher Chat and repeat the exact publication phrase.",
      ]),
    ],
  });
  return {
    output: routedOutput,
    state: {
      ...state,
      lastOutput: routedOutput,
      approvedOutput: routedOutput,
      workspaceContextStatus: "approved_pending_publish",
      workspaceContextSummary: publishSummaryForOutput(approvedOutput),
    },
  };
}

function markWorkspaceContextPublished(
  approvedOutput: Output,
  publishResult: {
    contextId: string;
    draftContextId: string;
    previousContextId?: string | null;
    summary: string;
    publishPath: "host_bridge" | "official_guild_tools";
    rollbackReference?: string;
  },
): Output {
  const publishPathLabel = publishResult.publishPath === "host_bridge" ? "host bridge" : "official Guild tools";
  const previousContext = publishResult.previousContextId ?? "none reported";
  const rollbackNote = publishResult.rollbackReference
    ?? (publishResult.previousContextId
      ? `Re-publish previous workspace context ${publishResult.previousContextId} to roll back.`
      : "No previous workspace context id was reported by the publish bridge.");

  return structuredOutputSchema.parse({
    ...approvedOutput,
    conversationIntent: "approval_or_edit",
    status: "ready_for_review",
    persistenceState: {
      ...approvedOutput.persistenceState,
      drafted_in_session: true,
      approved_in_session: true,
      saved_to_workspace_context: true,
      saved_to_context_artifacts: true,
      workspace_context_id: publishResult.contextId,
      workspace_context_draft_id: publishResult.draftContextId,
      workspace_context_previous_id: publishResult.previousContextId ?? null,
      workspace_context_status: "published",
      workspace_context_summary: publishResult.summary,
      workspace_context_publish_path: publishResult.publishPath,
      workspace_context_rollback_note: rollbackNote,
      persistence_note: `Published compacted Workspace Context brief to Guild as ${publishResult.contextId} through the ${publishPathLabel}. Previous published context: ${previousContext}. The approved Company Context artifact remains in Guild Chat state.`,
    },
    consumedContext: {
      ...approvedOutput.consumedContext,
      used: [...new Set([...approvedOutput.consumedContext.used, `Published compacted workspace context brief to Guild workspace context through the ${publishPathLabel}.`])],
      missing: [
        ...new Set(
          approvedOutput.consumedContext.missing.filter(
            (item) =>
              !/publish confirmation|workspace context|Context Hub artifact persistence/i.test(
                item,
              ),
          ),
        ),
      ],
    },
    workspaceContextDraft: [
      "Published compacted workspace context brief to Guild workspace context.",
      `Publish path: ${publishResult.publishPath}.`,
      `Published context id: ${publishResult.contextId}.`,
      `Draft context id: ${publishResult.draftContextId}.`,
      `Previous context id: ${previousContext}.`,
      `Summary: ${publishResult.summary}`,
      `Rollback: ${rollbackNote}`,
    ].join(" "),
    statusPayload: {
      ...approvedOutput.statusPayload,
      blockers: [
        ...new Set([
          ...approvedOutput.statusPayload.blockers.filter(
            (blocker) =>
              !/workspace context|not saved|publish confirmation|Context Hub artifacts were not persisted/i.test(
                blocker,
              ),
          ),
        ]),
      ],
    },
    contextArtifacts: {
      ...approvedOutput.contextArtifacts,
      dashboardSignals: {
        ...approvedOutput.contextArtifacts.dashboardSignals,
        blockers: [
          ...new Set([
            ...approvedOutput.contextArtifacts.dashboardSignals.blockers.filter(
              (blocker) =>
                !/workspace context|not saved|publish confirmation|Context Hub artifacts were not persisted/i.test(
                  blocker,
                ),
            ),
          ]),
        ],
      },
    },
  });
}

function markWorkspaceContextPublishBlocked(approvedOutput: Output, error: unknown): Output {
  const message = error instanceof Error ? error.message : String(error);
  const safeMessage = message.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer <redacted>");

  return structuredOutputSchema.parse({
    ...approvedOutput,
    conversationIntent: "approval_or_edit",
    status: "needs_input",
    persistenceState: {
      ...approvedOutput.persistenceState,
      drafted_in_session: true,
      approved_in_session: true,
      saved_to_workspace_context: false,
      saved_to_context_artifacts:
        approvedOutput.persistenceState.saved_to_context_artifacts,
      workspace_context_status: "blocked",
      workspace_context_summary: publishSummaryForOutput(approvedOutput),
      persistence_note: `Workspace Context publication did not complete. The approved context artifact remains in Guild Chat state for retry from the canonical Launcher Chat. Error: ${safeMessage}`,
    },
    statusPayload: {
      ...approvedOutput.statusPayload,
      blockers: [
        ...new Set([
          ...approvedOutput.statusPayload.blockers,
          "Workspace context publish did not complete.",
        ]),
      ],
    },
    contextArtifacts: {
      ...approvedOutput.contextArtifacts,
      dashboardSignals: {
        ...approvedOutput.contextArtifacts.dashboardSignals,
        blockers: [
          ...new Set([
            ...approvedOutput.contextArtifacts.dashboardSignals.blockers,
            "Workspace context publish did not complete.",
          ]),
        ],
      },
    },
    openQuestions: [
      ...new Set([
        ...approvedOutput.openQuestions,
        "Should I retry Workspace Context publication from the canonical Marketing OS Launcher Chat?",
      ]),
    ],
  });
}

function markWorkspaceContextCompactionBlocked(approvedOutput: Output, result: Extract<WorkspaceContextCompactionResult, { status: "blocked" }>): Output {
  const auditDetails = result.audit
    ? [
      result.audit.unsupported_new_claims.length ? `Unsupported new claims: ${result.audit.unsupported_new_claims.join("; ")}` : "",
      result.audit.lost_material_facts.length ? `Lost material facts: ${result.audit.lost_material_facts.join("; ")}` : "",
      result.audit.overcompressed_nuance.length ? `Over-compressed nuance: ${result.audit.overcompressed_nuance.join("; ")}` : "",
    ].filter(Boolean).join(" ")
    : "";
  const note = [
    `Workspace context compaction blocked publishing before any workspace write. ${result.reason}`,
    auditDetails,
  ].filter(Boolean).join(" ");

  return structuredOutputSchema.parse({
    ...approvedOutput,
    conversationIntent: "approval_or_edit",
    status: "needs_input",
    persistenceState: {
      ...approvedOutput.persistenceState,
      drafted_in_session: true,
      approved_in_session: true,
      saved_to_workspace_context: false,
      saved_to_context_artifacts:
        approvedOutput.persistenceState.saved_to_context_artifacts,
      workspace_context_status: "blocked",
      workspace_context_summary: publishSummaryForOutput(approvedOutput),
      persistence_note: note,
    },
    statusPayload: {
      ...approvedOutput.statusPayload,
      blockers: [
        ...new Set([
          ...approvedOutput.statusPayload.blockers,
          "Workspace context compaction audit did not pass.",
        ]),
      ],
    },
    contextArtifacts: {
      ...approvedOutput.contextArtifacts,
      dashboardSignals: {
        ...approvedOutput.contextArtifacts.dashboardSignals,
        blockers: [
          ...new Set([
            ...approvedOutput.contextArtifacts.dashboardSignals.blockers,
            "Workspace context compaction audit did not pass.",
          ]),
        ],
      },
    },
    openQuestions: [
      ...new Set([
        ...approvedOutput.openQuestions,
        "Should the approved source corpus be refined before retrying compacted workspace context publishing?",
      ]),
    ],
  });
}

function publishSummaryForOutput(output: Output, compactedContext?: CompactedWorkspaceContext): string {
  const companyName = output.statusPayload.companyName === "TBD" ? "company" : output.statusPayload.companyName;
  if (!compactedContext) return `Guild Marketing OS company context for ${companyName}, approved through Company Context Builder.`;
  const reduction = compactedContext.estimatedSourceTokens > 0
    ? Math.max(0, Math.round((1 - compactedContext.estimatedBriefTokens / compactedContext.estimatedSourceTokens) * 100))
    : 0;
  return `Compacted Guild Marketing OS workspace context brief for ${companyName}; source ${compactedContext.estimatedSourceTokens} tokens to brief ${compactedContext.estimatedBriefTokens} tokens; audit passed; ~${reduction}% reduction.`;
}

function renderManagedWorkspaceContextBlock(output: Output, compactedContext: CompactedWorkspaceContext): string {
  return [
    managedContextStart,
    "# Guild Marketing OS Managed Company Context",
    "",
    "Status: published",
    `Company: ${output.statusPayload.companyName}`,
    `Readiness: ${output.statusPayload.readiness}`,
    `Summary: ${publishSummaryForOutput(output)}`,
    "",
    "## Runtime Summary",
    renderReadyToPublishWorkspaceContext(output),
    "",
    "## Downstream Handoff Context",
    renderDownstreamHandoffContext(output),
    "",
    "## Workspace Context Brief",
    compactedContext.brief.trim(),
    "",
    "## Source Corpus Summary",
    compactedContext.sourceCorpusSummary.trim(),
    "",
    "## Compaction Audit",
    renderCompactionAudit(compactedContext),
    managedContextEnd,
  ].join("\n");
}

async function buildCompactedWorkspaceContext(
  approvedOutput: Output,
  task: AgentTask,
): Promise<WorkspaceContextCompactionResult> {
  const cleanedSourceText = buildApprovedWorkspaceContextCorpus(approvedOutput);
  const estimatedSourceTokens = estimateWorkspaceContextTokens(cleanedSourceText);
  let firstCompaction = await requestWorkspaceContextCompaction(approvedOutput, cleanedSourceText, task);
  if (!firstCompaction) {
    firstCompaction = await requestWorkspaceContextCompaction(
      approvedOutput,
      cleanedSourceText,
      task,
      undefined,
      "The previous compaction response was missing or did not match the required JSON shape. Return only the required JSON object with workspace_context_brief and source_corpus_summary strings.",
    );
  }
  if (!firstCompaction) {
    return {
      status: "blocked",
      reason: "The LLM compaction response was missing or did not match the required JSON shape.",
      cleanedSourceText,
    };
  }

  const firstBriefCheck = validateWorkspaceContextBrief(firstCompaction.workspace_context_brief);
  if (firstBriefCheck.length > 0) {
    return {
      status: "blocked",
      reason: `The compacted workspace context brief failed deterministic validation: ${firstBriefCheck.join(", ")}.`,
      cleanedSourceText,
    };
  }

  let firstAudit = await requestWorkspaceContextAudit(cleanedSourceText, firstCompaction, task);
  if (!firstAudit) {
    firstAudit = await requestWorkspaceContextAudit(
      cleanedSourceText,
      firstCompaction,
      task,
      "The previous audit response was missing or did not match the required JSON shape. Return only the required JSON object with array fields.",
    );
  }
  if (!firstAudit) {
    return {
      status: "blocked",
      reason: "The LLM compaction audit response was missing or did not match the required JSON shape.",
      cleanedSourceText,
    };
  }
  if (firstAudit.unsupported_new_claims.length > 0) {
    return {
      status: "blocked",
      reason: "The compacted workspace context brief introduced unsupported new claims.",
      audit: firstAudit,
      cleanedSourceText,
    };
  }

  if (firstAudit.lost_material_facts.length === 0) {
    return {
      status: "ready",
      context: buildCompactedWorkspaceContextPayload(cleanedSourceText, firstCompaction, firstAudit, false),
    };
  }

  let regeneratedCompaction = await requestWorkspaceContextCompaction(approvedOutput, cleanedSourceText, task, firstAudit);
  if (!regeneratedCompaction) {
    regeneratedCompaction = await requestWorkspaceContextCompaction(
      approvedOutput,
      cleanedSourceText,
      task,
      firstAudit,
      "The previous regeneration response was missing or did not match the required JSON shape. Return only the required JSON object with workspace_context_brief and source_corpus_summary strings.",
    );
  }
  if (!regeneratedCompaction) {
    return {
      status: "blocked",
      reason: "The LLM regeneration response was missing or did not match the required JSON shape after the coverage audit found lost material facts.",
      audit: firstAudit,
      cleanedSourceText,
    };
  }
  const regeneratedBriefCheck = validateWorkspaceContextBrief(regeneratedCompaction.workspace_context_brief);
  if (regeneratedBriefCheck.length > 0) {
    return {
      status: "blocked",
      reason: `The regenerated workspace context brief failed deterministic validation: ${regeneratedBriefCheck.join(", ")}.`,
      audit: firstAudit,
      cleanedSourceText,
    };
  }

  let regeneratedAudit = await requestWorkspaceContextAudit(cleanedSourceText, regeneratedCompaction, task);
  if (!regeneratedAudit) {
    regeneratedAudit = await requestWorkspaceContextAudit(
      cleanedSourceText,
      regeneratedCompaction,
      task,
      "The previous regenerated audit response was missing or did not match the required JSON shape. Return only the required JSON object with array fields.",
    );
  }
  if (!regeneratedAudit) {
    return {
      status: "blocked",
      reason: "The regenerated compaction audit response was missing or did not match the required JSON shape.",
      audit: firstAudit,
      cleanedSourceText,
    };
  }
  if (regeneratedAudit.unsupported_new_claims.length > 0) {
    return {
      status: "blocked",
      reason: "The regenerated workspace context brief introduced unsupported new claims.",
      audit: regeneratedAudit,
      cleanedSourceText,
    };
  }
  if (regeneratedAudit.lost_material_facts.length > 0) {
    const repairedCompaction = applyCompactionAuditAddendum(regeneratedCompaction, regeneratedAudit);
    const repairedBriefCheck = validateWorkspaceContextBrief(repairedCompaction.workspace_context_brief);
    if (repairedBriefCheck.length > 0) {
      return {
        status: "blocked",
        reason: `The audit-repaired workspace context brief failed deterministic validation: ${repairedBriefCheck.join(", ")}.`,
        audit: regeneratedAudit,
        cleanedSourceText,
      };
    }

    let repairedAudit = await requestWorkspaceContextAudit(
      cleanedSourceText,
      repairedCompaction,
      task,
      "The regenerated brief now includes a deterministic audit addendum with the prior lost material facts and over-compressed nuance. Return empty lost_material_facts only if those facts are now present in the brief. Return unsupported_new_claims for any addendum fact that is not supported by the cleaned source.",
    );
    if (!repairedAudit) {
      repairedAudit = await requestWorkspaceContextAudit(
        cleanedSourceText,
        repairedCompaction,
        task,
        "The previous audit-repair response was missing or did not match the required JSON shape. Return only the required JSON object with array fields.",
      );
    }
    if (!repairedAudit) {
      return {
        status: "blocked",
        reason: "The audit-repaired compaction audit response was missing or did not match the required JSON shape.",
        audit: regeneratedAudit,
        cleanedSourceText,
      };
    }
    if (repairedAudit.unsupported_new_claims.length > 0) {
      return {
        status: "blocked",
        reason: "The audit-repaired workspace context brief introduced unsupported new claims.",
        audit: repairedAudit,
        cleanedSourceText,
      };
    }
    if (repairedAudit.lost_material_facts.length === 0) {
      return {
        status: "ready",
        context: buildCompactedWorkspaceContextPayload(cleanedSourceText, repairedCompaction, repairedAudit, true),
      };
    }

    return {
      status: "blocked",
      reason: "The regenerated workspace context brief still lost material facts from the approved source corpus.",
      audit: repairedAudit,
      cleanedSourceText,
    };
  }

  return {
    status: "ready",
    context: buildCompactedWorkspaceContextPayload(cleanedSourceText, regeneratedCompaction, regeneratedAudit, true),
  };
}

function buildCompactedWorkspaceContextPayload(
  cleanedSourceText: string,
  compaction: WorkspaceContextCompaction,
  audit: WorkspaceContextAudit,
  regeneratedAfterAudit: boolean,
): CompactedWorkspaceContext {
  return {
    brief: compaction.workspace_context_brief.trim(),
    sourceCorpusSummary: [
      compaction.source_corpus_summary.trim(),
      "",
      "Full approved source corpus is retained in Company Context Builder session state only; it is not injected into always-on workspace context.",
    ].join("\n").trim(),
    audit,
    estimatedSourceTokens: estimateWorkspaceContextTokens(cleanedSourceText),
    estimatedBriefTokens: estimateWorkspaceContextTokens(compaction.workspace_context_brief),
    regeneratedAfterAudit,
  };
}

function applyCompactionAuditAddendum(
  compaction: WorkspaceContextCompaction,
  audit: WorkspaceContextAudit,
): WorkspaceContextCompaction {
  const addendumLines = [
    "### Audit-Preserved Facts And Nuance",
    "These source-backed details are retained because the compaction coverage audit marked them material for downstream Marketing OS agents.",
    ...audit.lost_material_facts.map((fact) => `- Material fact: ${fact}`),
    ...audit.overcompressed_nuance.map((nuance) => `- Nuance to preserve: ${nuance}`),
  ];

  return {
    ...compaction,
    workspace_context_brief: [
      compaction.workspace_context_brief.trim(),
      "",
      addendumLines.join("\n"),
    ].join("\n"),
    source_corpus_summary: [
      compaction.source_corpus_summary.trim(),
      "Audit repair addendum appended material facts and nuance identified by the compaction coverage audit.",
    ].join("\n"),
  };
}

async function requestWorkspaceContextCompaction(
  approvedOutput: Output,
  cleanedSourceText: string,
  task: AgentTask,
  auditFeedback?: WorkspaceContextAudit,
  retryInstruction?: string,
): Promise<WorkspaceContextCompaction | undefined> {
  const { text } = await task.llm.generateText({
    prompt: buildWorkspaceContextCompactionPrompt(approvedOutput, cleanedSourceText, auditFeedback, retryInstruction),
  });
  const parsed = parseJsonObject(text);
  const result = workspaceContextCompactionSchema.safeParse(parsed);
  return result.success ? result.data : undefined;
}

async function requestWorkspaceContextAudit(
  cleanedSourceText: string,
  compaction: WorkspaceContextCompaction,
  task: AgentTask,
  retryInstruction?: string,
): Promise<WorkspaceContextAudit | undefined> {
  const { text } = await task.llm.generateText({
    prompt: buildWorkspaceContextAuditPrompt(cleanedSourceText, compaction, retryInstruction),
  });
  const parsed = parseJsonObject(text);
  const result = workspaceContextAuditSchema.safeParse(parsed);
  return result.success ? result.data : undefined;
}

function buildWorkspaceContextCompactionPrompt(
  approvedOutput: Output,
  cleanedSourceText: string,
  auditFeedback?: WorkspaceContextAudit,
  retryInstruction?: string,
): string {
  const auditInstruction = auditFeedback
    ? [
      "Coverage audit feedback from the previous attempt:",
      `Lost material facts: ${auditFeedback.lost_material_facts.length ? auditFeedback.lost_material_facts.join("; ") : "None"}`,
      `Over-compressed nuance: ${auditFeedback.overcompressed_nuance.length ? auditFeedback.overcompressed_nuance.join("; ") : "None"}`,
      `Recommended fixes: ${auditFeedback.recommended_fixes.length ? auditFeedback.recommended_fixes.join("; ") : "None"}`,
      "Regenerate once and include the missing material facts without adding unsupported new claims.",
    ].join("\n")
    : "This is the first compaction attempt.";

  return `
Workspace Context Compaction

Return only valid JSON. Do not use markdown fences.

Create a concise always-on Guild workspace context brief from the approved reusable context corpus. Target ${targetWorkspaceContextTokenMin}-${targetWorkspaceContextTokenMax} tokens. Preserve material reusable facts, nuance, explicit constraints, evidence labels, and explicit unknowns. Do not add facts that are not present in the source.

Required JSON shape:
{
  "workspace_context_brief": "Markdown string with the required sections",
  "source_corpus_summary": "Short summary of source corpus scope and retention note",
  "estimated_token_reduction": "Short human-readable estimate"
}

The workspace_context_brief must use these exact Markdown section headings:
${requiredWorkspaceBriefSections.map((section) => `### ${section}`).join("\n")}

Only facts in the approved reusable context corpus may be restated as reusable facts. The complete raw source is intentionally absent from always-on Workspace Context.
Any item labeled review-required, blocked, withheld, missing, assumption, or do-not-use must remain a limitation or category-level summary; never turn it into an approved public claim or reintroduce its underlying raw claim.
Must preserve if approved and present: dates, named products, named audiences, named competitors, explicit constraints, and explicit unknowns.
Do not infer appointment dates, causality, guarantees, compliance workarounds, or operational readiness unless the source states them directly.
For private-company financials, distinguish company-disclosed funding from secondary-reported valuation or revenue estimates; never call secondary valuations or ARR estimates company-confirmed.
For pricing and packaging, preserve tier names and included capabilities without strengthening them with words like "full", "complete", "all", or implementation mechanisms not in the source. If the source says "automatic visitor routing", do not rewrite it as "IP routing"; if it says Basic includes unlimited form submissions or Optimize includes audience targeting, keep those details.
For HIPAA/PHI caveats, preserve the source nuance exactly: use "may not be HIPAA compliant" and "do not provide Protected Health Information / PHI" when that is what the source says; do not soften it to "not HIPAA out of the box."
Must strip citation artifacts, raw source markers, long table formatting, diagrams, pseudo-queries, and code scaffolding.

Company: ${approvedOutput.statusPayload.companyName}
Readiness: ${approvedOutput.statusPayload.readiness}
Known next agents: ${approvedOutput.statusPayload.nextAgents.join(", ")}

${auditInstruction}
${retryInstruction ? `\nRetry instruction: ${retryInstruction}\n` : ""}

Approved reusable context corpus:
${cleanedSourceText}
`.trim();
}

function buildWorkspaceContextAuditPrompt(cleanedSourceText: string, compaction: WorkspaceContextCompaction, retryInstruction?: string): string {
  return `
Workspace Context Compaction Audit

Return only valid JSON. Do not use markdown fences.

Compare the approved reusable context corpus against the compacted workspace context brief. Be strict about material facts, evidence labels, named entities, dates, constraints, competitors, and explicit unknowns.
Treat any pricing, proof, scale, funding, revenue, compliance, security, privacy, ranking, guarantee, or performance claim in the brief as unsupported unless that exact reusable fact appears in the approved corpus. Do not request restoration of raw source claims that were intentionally summarized as review-required, blocked, withheld, or do-not-use.

Required JSON shape:
{
  "lost_material_facts": string[],
  "unsupported_new_claims": string[],
  "overcompressed_nuance": string[],
  "recommended_fixes": string[]
}

Use empty arrays when there are no issues. Put only claims that materially affect downstream Marketing OS agents in lost_material_facts. Put any claim in unsupported_new_claims if it appears in the brief but is not supported by the cleaned source.
${retryInstruction ? `\nRetry instruction: ${retryInstruction}\n` : ""}

Approved reusable context corpus:
${cleanedSourceText}

Compacted workspace context brief:
${compaction.workspace_context_brief}

Source corpus summary:
${compaction.source_corpus_summary}
`.trim();
}

function validateWorkspaceContextBrief(brief: string): string[] {
  const errors = requiredWorkspaceBriefSections
    .filter((section) => !new RegExp(`^#{2,4}\\s+${escapeRegExp(section)}\\s*$`, "im").test(brief))
    .map((section) => `missing section: ${section}`);
  const unsafeLines = brief
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || /^#{1,6}\s/.test(line)) return false;
      if (!isWorkspaceSensitiveClaimLine(line)) return false;
      return !/\b(?:review[- ]required|requires (?:separate )?(?:evidence|approval|review)|withheld|blocked|do not (?:use|reuse|claim)|must not (?:use|reuse|claim)|not approved|tbd|missing evidence|source[-_ ]supplied(?: only)?|limitation|unknown|unspecified|remain open|omitted|excluded)\b/i.test(
        line,
      );
    });
  if (unsafeLines.length > 0) {
    errors.push(
      `unqualified review-required claim(s): ${unsafeLines
        .slice(0, 3)
        .map((line) => line.slice(0, 120))
        .join(" | ")}`,
    );
  }
  return errors;
}

function isWorkspaceSensitiveClaimLine(line: string): boolean {
  return /\b(?:pricing|price|privacy|security|secure|compliance|compliant|certified|soc\s*2|hipaa|gdpr|retention|guarantee|guaranteed|performance|faster|conversion|revenue|arr|funding|valuation|production-ready|production readiness|uptime|availability|sla|user base|team members|countries|customer count|ranking|ranked|leading|leader|#1|best-in-class|benchmark|roi)\b|\b[0-9][0-9.,]*\s*(?:m|million|k|thousand)?\s+users\b|\$[0-9]/i.test(
    line,
  );
}

function buildApprovedWorkspaceContextCorpus(output: Output): string {
  const approvedFacts = output.approvedFacts
    .filter(
      (claim) =>
        (claim.status === "approved" || claim.status === "user_supplied") &&
        !isGuardedReusableClaim(claim.claim),
    )
    .map((claim) => `- [${claim.status}] ${claim.claim}`);
  const approvedProof = output.proofBackedClaims
    .filter(isReusableProofClaim)
    .map((claim) => `- [${claim.status}] ${claim.claim}`);
  const reviewRequired = [
    ...output.claimsNeedingApproval,
    ...output.contextArtifacts.proofAndConstraints.blockedClaims,
  ].filter((claim) => claim.claim.trim());
  const reviewCategories = summarizeBlockedClaimCategories(reviewRequired);

  return [
    "# Approved Reusable Marketing OS Context Corpus",
    "",
    "This corpus is derived from the exact approved Company Context artifact. The complete raw source remains in Guild Chat state and is intentionally excluded from always-on Workspace Context.",
    "",
    "## Runtime Summary",
    renderReadyToPublishWorkspaceContext(output),
    "",
    "## Downstream Handoff Context",
    renderDownstreamHandoffContext(output),
    "",
    "## Approved Reusable Facts",
    ...(approvedFacts.length ? approvedFacts : ["- No reusable facts are approved beyond the named company and operating constraints."]),
    "",
    "## Approved Reusable Proof",
    ...(approvedProof.length ? approvedProof : ["- No quantified, pricing, scale, compliance, security, financial, ranking, or performance proof is approved for public reuse."]),
    "",
    "## Review-Required Source Summary",
    `- ${reviewRequired.length} source claim(s) are withheld from reusable context pending separate evidence and owner review.`,
    `- Review-required categories: ${formatList(reviewCategories)}.`,
    "- Do not restore, paraphrase, or imply the underlying withheld claims in the compact brief.",
    "",
    "## Sanitized Context Artifacts",
    `- Company: ${output.contextArtifacts.companyContext.companyName}`,
    `- Category: ${output.contextArtifacts.companyContext.category}`,
    `- Primary audiences: ${formatList(output.contextArtifacts.companyContext.primaryAudiences)}`,
    `- Goals: ${formatList(output.contextArtifacts.companyContext.goals)}`,
    `- Messaging overview: ${output.contextArtifacts.messagingSource.overview}`,
    `- Positioning: ${output.contextArtifacts.messagingSource.positioning}`,
    `- Answer-ready language: ${formatList(output.contextArtifacts.messagingSource.answerReadyLanguage)}`,
    `- Approved channels: ${formatList(output.contextArtifacts.channelRegistry.approvedChannels)}`,
    `- Channels TBD: ${formatList(output.contextArtifacts.channelRegistry.channelsTbd)}`,
    `- AEO entity clarity: ${output.aeoReadiness.entityClarity}`,
    `- AEO missing proof: ${formatList(output.aeoReadiness.missingProof)}`,
    "",
    "## Operating Constraints",
    ...output.contextArtifacts.proofAndConstraints.constraints.map(
      (constraint) => `- ${constraint}`,
    ),
  ]
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderCompactionAudit(compactedContext: CompactedWorkspaceContext): string {
  const reduction = compactedContext.estimatedSourceTokens > 0
    ? Math.max(0, Math.round((1 - compactedContext.estimatedBriefTokens / compactedContext.estimatedSourceTokens) * 100))
    : 0;
  return [
    `Status: passed`,
    `Estimated source tokens after deterministic cleanup: ${compactedContext.estimatedSourceTokens}`,
    `Estimated published brief tokens: ${compactedContext.estimatedBriefTokens}`,
    `Estimated reduction: ${reduction}%`,
    `Regenerated after coverage audit: ${compactedContext.regeneratedAfterAudit ? "yes" : "no"}`,
    `Lost material facts: ${compactedContext.audit.lost_material_facts.length ? compactedContext.audit.lost_material_facts.join("; ") : "none"}`,
    `Unsupported new claims: ${compactedContext.audit.unsupported_new_claims.length ? compactedContext.audit.unsupported_new_claims.join("; ") : "none"}`,
    `Over-compressed nuance: ${compactedContext.audit.overcompressed_nuance.length ? compactedContext.audit.overcompressed_nuance.join("; ") : "none"}`,
    `Recommended fixes: ${compactedContext.audit.recommended_fixes.length ? compactedContext.audit.recommended_fixes.join("; ") : "none"}`,
  ].join("\n");
}

export function cleanApprovedSourceForWorkspaceContext(value: string): string {
  return convertMarkdownTablesToBullets(
    removeFencedBlocks(
      stripCitationMarkers(stripGuildRuntimePreamble(value)),
    ),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripCitationMarkers(value: string): string {
  return value.replace(/cite[^]*/g, "");
}

export function removeFencedBlocks(value: string): string {
  return value.replace(/```[\w-]*\n[\s\S]*?```/g, "");
}

export function convertMarkdownTablesToBullets(value: string): string {
  const lines = value.split(/\r?\n/);
  const output: string[] = [];

  for (let index = 0; index < lines.length;) {
    if (!isMarkdownTableLine(lines[index])) {
      output.push(lines[index]);
      index += 1;
      continue;
    }

    const tableLines: string[] = [];
    while (index < lines.length && isMarkdownTableLine(lines[index])) {
      tableLines.push(lines[index]);
      index += 1;
    }

    const bullets = markdownTableToBullets(tableLines);
    if (bullets.length > 0) {
      output.push(...bullets);
    }
  }

  return output.join("\n");
}

export function estimateWorkspaceContextTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

function isMarkdownTableLine(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function markdownTableToBullets(lines: string[]): string[] {
  if (lines.length < 2) return lines;
  const [headerLine, separatorLine, ...rowLines] = lines;
  if (!/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(separatorLine)) return lines;

  const headers = splitMarkdownTableRow(headerLine);
  const bullets = rowLines
    .map((rowLine) => splitMarkdownTableRow(rowLine))
    .map((cells) => {
      const parts = cells
        .map((cell, index) => ({ header: headers[index]?.trim() ?? `Column ${index + 1}`, cell: cell.trim() }))
        .filter(({ header, cell }) => cell && !/^evidence$/i.test(header))
        .map(({ header, cell }) => `${header}: ${cell}`);
      return parts.length ? `- ${parts.join("; ")}` : "";
    })
    .filter(Boolean);

  return bullets.length ? bullets : [];
}

function splitMarkdownTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

export function replaceManagedWorkspaceContextBlock(currentContext: string, managedBlock: string): string {
  const trimmedBlock = managedBlock.trim();
  const start = currentContext.indexOf(managedContextStart);
  const end = currentContext.indexOf(managedContextEnd);

  if (start !== -1 && end !== -1 && end > start) {
    return [
      currentContext.slice(0, start).trimEnd(),
      trimmedBlock,
      currentContext.slice(end + managedContextEnd.length).trimStart(),
    ].filter(Boolean).join("\n\n").trim() + "\n";
  }

  return [currentContext.trim(), trimmedBlock].filter(Boolean).join("\n\n").trim() + "\n";
}

function hasVisibleApprovalContext(rawContext: string): boolean {
  return /Company Context Draft \(company-context\)|Status Payload|Guild Workspace Context Draft|Ready-To-Publish Workspace Context|Downstream Handoff Context|^Company:\s+\S/im.test(rawContext);
}

function isBareApprovalCommand(rawContext: string): boolean {
  return /^\s*(?:approve|approved|confirm|looks good|ship it)\s+(?:company context|the company context|this|it|the draft)\s*\.?\s*$/i.test(rawContext.trim());
}

function buildDownstreamWithContextOutput(
  input: Input,
  requestedAgent: Exclude<(typeof agentValues)[number], "Company Context Builder">,
  publishedContext: PublishedWorkspaceContext,
): Output {
  const contextRevision = publishedContext.contextId ?? "published revision";
  const companyName = publishedContext.companyName ?? "Published workspace company";
  const output = buildFallbackOutput(input, [], "downstream_request");
  output.status = "ready_for_review";
  output.persistenceState = {
    drafted_in_session: false,
    approved_in_session: true,
    saved_to_workspace_context: true,
    saved_to_context_artifacts: false,
    workspace_context_id: publishedContext.contextId,
    workspace_context_status: "published",
    persistence_note: `Read published Guild workspace context revision ${contextRevision}. No new company context draft was created.`,
  };
  output.consumedContext.used = [`Published Guild workspace context revision ${contextRevision}`];
  output.consumedContext.missing = [];
  output.contextArtifacts.companyContext.companyName = companyName;
  output.contextArtifacts.companyContext.status = "draft";
  output.contextArtifacts.companyContext.missingContext = [];
  output.workspaceContextDraft = "No new workspace context draft was created.";
  output.approvedFacts = [];
  output.extractedClaims = [];
  output.proofBackedClaims = [];
  output.claimsNeedingApproval = [];
  output.assumptionsAndMissingEvidence = [];
  output.openQuestions = [];
  output.approvalGates = [
    {
      ownerRole: "Marketing Owner",
      decision: `Continue through Marketing OS Launcher or select ${requestedAgent}.`,
      requiredBefore: "Specialist artifact generation.",
      status: "needed",
    },
  ];
  output.statusPayload.companyName = companyName;
  output.statusPayload.readiness = "review_ready";
  output.statusPayload.nextAgents = [requestedAgent];
  output.statusPayload.blockers = [];
  output.statusPayload.source_coverage = [`Published workspace context revision ${contextRevision}`];
  output.statusPayload.coverage_limitations = [
    "Company Context Builder is context-only and did not generate the requested specialist artifact.",
  ];
  output.statusPayload.safety.evidence_gaps = [];
  output.downstreamHandoff = [
    {
      agent: requestedAgent,
      receives: downstreamReceivesForAgent(requestedAgent),
      reason: `Published context revision ${contextRevision} is available. Continue through Marketing OS Launcher or @mention ${requestedAgent}; Company Context Builder does not generate specialist artifacts.`,
    },
  ];
  return output;
}

function buildDownstreamWithoutContextOutput(
  input: Input,
  requestedAgent: Exclude<(typeof agentValues)[number], "Company Context Builder"> =
    detectRequestedDownstreamAgent(getRawContext(input)) ?? "Campaigns And Paid Media",
): Output {
  const rawContext = getRawContext(input);
  const companyName = extractCompanyName(rawContext) ?? "TBD";
  const output = buildFallbackOutput(input, ["Approved company context is required before downstream specialist work."], "downstream_request_without_context");
  output.status = "blocked";
  output.contextArtifacts.companyContext.companyName = companyName;
  output.statusPayload.companyName = companyName;
  output.persistenceState = normalizePersistenceState(undefined, "downstream_request_without_context");
  output.consumedContext.used = [`Requested downstream goal: ${requestedAgent}`];
  output.consumedContext.missing = focusedMissingInputsForCompany(companyName);
  output.contextArtifacts.companyContext.status = "blocked";
  output.contextArtifacts.companyContext.missingContext = output.consumedContext.missing;
  output.contextArtifacts.messagingSource.status = "blocked";
  output.contextArtifacts.audienceSegments = [
    {
      status: "blocked",
      name: "Audience pending approved company context",
      description: "Specialist audience work should wait until company context is approved.",
      evidenceStatus: "missing",
      missingEvidence: output.consumedContext.missing,
    },
  ];
  output.openQuestions = normalizeOpenQuestions([], output.consumedContext.missing, "downstream_request_without_context");
  output.statusPayload.readiness = "blocked";
  output.statusPayload.nextAgents = ["Company Context Builder"];
  output.statusPayload.blockers = ["Company context is not approved yet.", `${requestedAgent} should receive a handoff after context approval.`];
  output.statusPayload.coverage_limitations = [
    "No published Marketing OS workspace context revision could be verified.",
    "Company Context Builder is context-only and did not generate the requested specialist artifact.",
  ];
  output.statusPayload.safety.evidence_gaps = ["Approved published company context"];
  output.downstreamHandoff = [
    {
      agent: "Company Context Builder",
      receives: ["company-context", "proof-and-constraints", "dashboard-signals"],
      reason: "Create the approved company context foundation first.",
    },
    {
      agent: requestedAgent,
      receives: downstreamReceivesForAgent(requestedAgent),
      reason: `Preserved requested downstream goal. Run only after company context, proof constraints, and relevant handoff artifacts are approved.`,
    },
  ];
  return output;
}

function buildMissingContextOutput(input: Input): Output {
  const rawContext = getRawContext(input);
  const companyName = extractCompanyName(rawContext) ?? "TBD";
  const blocker = hasUrlOnlySource(rawContext)
    ? "A URL was supplied, but readable page contents were not available to this run."
    : "The message does not include enough company context to draft reusable Marketing OS artifacts.";
  const output = buildFallbackOutput(input, [blocker], "missing_context");
  output.status = "blocked";
  output.persistenceState = normalizePersistenceState(undefined, "missing_context");
  output.contextArtifacts.companyContext.companyName = companyName;
  output.statusPayload.companyName = companyName;
  output.consumedContext.used = hasUrlOnlySource(rawContext)
    ? ["URL supplied without readable page contents"]
    : ["Sparse setup request"];
  output.consumedContext.missing = focusedMissingInputsForCompany(companyName);
  output.contextArtifacts.companyContext.status = "blocked";
  output.contextArtifacts.companyContext.missingContext = output.consumedContext.missing;
  output.contextArtifacts.messagingSource.status = "blocked";
  output.contextArtifacts.proofAndConstraints.status = "blocked";
  output.contextArtifacts.dashboardSignals.status = "blocked";
  output.contextArtifacts.dashboardSignals.readiness = "blocked";
  output.contextArtifacts.dashboardSignals.blockers = [blocker];
  output.openQuestions = normalizeOpenQuestions([], output.consumedContext.missing, "missing_context");
  output.statusPayload.readiness = "blocked";
  output.statusPayload.blockers = [blocker];
  output.downstreamHandoff = [
    {
      agent: "Company Context Builder",
      receives: ["company-context"],
      reason: "Needs a few company facts or readable source text before drafting reusable artifacts.",
    },
  ];
  return output;
}

function needsReadableSourceText(output: Output): boolean {
  return output.statusPayload.blockers.some((blocker) => blocker.toLowerCase().includes("no readable source text"));
}

function hasNoUsableOutputContext(output: Output): boolean {
  return (
    output.statusPayload.companyName === "TBD" &&
    output.approvedFacts.length === 0 &&
    output.contextArtifacts.companyContext.primaryAudiences.every(isTbdish) &&
    output.contextArtifacts.companyContext.goals.every(isTbdish)
  );
}

function isTbdish(value: string): boolean {
  return /^(?:tbd|unknown|none|n\/a|not supplied|not provided)?$/i.test(value.trim());
}

function normalizePersistenceState(value: Output["persistenceState"] | undefined, conversationIntent: ConversationIntent): Output["persistenceState"] {
  return {
    drafted_in_session: value?.drafted_in_session ?? conversationIntent === "source_available",
    approved_in_session: value?.approved_in_session ?? false,
    saved_to_workspace_context: value?.saved_to_workspace_context ?? false,
    saved_to_context_artifacts:
      value?.saved_to_context_artifacts ?? false,
    workspace_context_id: value?.workspace_context_id,
    workspace_context_draft_id: value?.workspace_context_draft_id,
    workspace_context_previous_id: value?.workspace_context_previous_id,
    workspace_context_status: value?.workspace_context_status ?? "not_requested",
    workspace_context_summary: value?.workspace_context_summary,
    workspace_context_publish_path: value?.workspace_context_publish_path,
    workspace_context_rollback_note: value?.workspace_context_rollback_note,
    source_references: value?.source_references,
    context_artifact_references: value?.context_artifact_references,
    persistence_note:
      value?.persistence_note ??
      "Drafted in this session only. Not saved to Guild workspace context or Context Hub artifacts.",
  };
}

function safeFoundationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer <redacted>")
    .slice(0, 500);
}

function foundationFingerprint(value: string): string {
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
    .map((part) => (part >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

function uuidFromFoundationSeed(seed: string): string {
  const value = foundationFingerprint(seed).split("");
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

function isPricingOrSensitiveEdit(rawContext: string): boolean {
  return /\b(pricing|price|compliance|security|privacy|performance|production-ready|production readiness|guarantee|legal)\b/i.test(rawContext);
}

export function isSensitiveClaim(claim: string): boolean {
  return /\b(pricing|price|privacy|security|secure|compliance|compliant|soc\s*2|hipaa|gdpr|retention|guarantee|guaranteed|performance|faster|conversion|revenue|arr|funding|valuation|production-ready|production readiness|uptime|availability|sla|user base|team members|countries|customer count|ranking|ranked|leading|leader|#1|best|benchmark|roi)\b|\b[0-9][0-9.,]*\s*(?:m|million|k|thousand)?\s+users\b|\b[0-9]+(?:\.[0-9]+)?\s*%|\b[0-9]+(?:\.[0-9]+)?\s*x\b|\b[0-9]+(?:[.,][0-9]+)?\+?\s+(?:pages|brands?|teams?|bookings?|mqls?|countries)\b|\$[0-9]/i.test(claim);
}

export function preservesQualifiedHipaaNuance(
  claim: string,
  rawContext: string,
): boolean {
  if (!/\bmay not be HIPAA compliant\b/i.test(rawContext)) {
    return true;
  }
  return !/\b(?:lack(?:s|ing)?(?: of)?|without|no) HIPAA (?:compliance|compatibility|certification)\b|\b(?:is|are|remains?|claims? to be|certified as) HIPAA (?:compliant|compatible|certified)\b|\bnot HIPAA (?:compliant|compatible|certified)\b|\bHIPAA[- ](?:noncompliant|incompatible)\b|\b(?:strict\s+)?non[- ]HIPAA (?:compliance|compatibility|certification)\b/i.test(
    claim,
  );
}

function isGuardedReusableClaim(claim: string): boolean {
  return isSensitiveClaim(claim) ||
    /\b(agentic web marketing|website experience platform|default operating system|revenue-driving|ai search|aeo agents?|mach-certified|enterprise compliance|enterprise security|enterprise production|advanced governance|customer success|cloudflare|user count|audience count|data residency|protected health information|phi|dpf|scc)\b/i.test(claim);
}

function sensitiveClaimGuardrail(claim: string): Claim {
  return {
    claim,
    status: "blocked",
    source: "sensitive_claim_guardrail",
    notes: "Sensitive or proof-dependent pricing, legal, compliance, security, guarantee, funding, revenue, scale, ranking, positioning, production-readiness, and performance claims require separate owner approval and evidence.",
  };
}

function sensitiveClaimNeedsApproval(claim: string): Claim {
  return {
    claim,
    status: "blocked",
    source: "sensitive_claim_guardrail",
    notes: "Do not reuse until approved evidence and an owner approval are supplied.",
  };
}

function mergeDefaultConstraints(values: readonly string[]): string[] {
  const normalized = new Set<string>();
  const merged: string[] = [];
  for (const value of [...defaultConstraints, ...values]) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = operatingConstraintKey(trimmed);
    if (normalized.has(key)) continue;
    normalized.add(key);
    merged.push(trimmed);
  }
  return merged;
}

function operatingConstraintKey(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const categories = [
    ["workspace_context_publish", /\bworkspace context\b.*\bpublish/],
    ["context_artifact_persistence", /\bcontext artifact\b.*\bpersist/],
    ["crm_activation", /\bcrm\b.*\b(?:activat|mutat|updat|writ|sync)/],
    ["scheduling", /\bschedul/],
    ["paid_media_spend", /\b(?:paid media|ad spend|advertising spend)\b|\bspend\b/],
    ["credential_setup", /\bcredentials?\b.*\b(?:setup|configur)/],
    ["workspace_install", /\bworkspace\b.*\binstall/],
    ["trigger_setup", /\btriggers?\b.*\b(?:setup|configur)/],
    ["visibility_changes", /\bvisibility\b.*\b(?:chang|updat|modif)/],
    ["live_publishing", /\b(?:live|external|direct)?\s*publish/],
    [
      "approval_implication",
      /\b(?:legal|compliance|pricing|security|performance|production-readiness)\b.*\b(?:approval|approved|implied)\b/,
    ],
  ] as const;
  for (const [category, pattern] of categories) {
    if (pattern.test(normalized)) return `category:${category}`;
  }
  return `text:${normalized.replace(/^no\s+/, "")}`;
}

function extractSensitiveClaimMentions(rawContext: string): string[] {
  return rawContext
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((line) => line.trim().replace(/^[-*]\s+/, ""))
    .filter((line) => line.length > 8 && isSensitiveClaim(line))
    .slice(0, 20);
}

function collectSensitiveOutputClaims(output: Output): string[] {
  const candidates = [
    output.workspaceContextDraft,
    output.contextArtifacts.companyContext.category,
    ...output.contextArtifacts.companyContext.goals,
    output.contextArtifacts.messagingSource.overview,
    output.contextArtifacts.messagingSource.positioning,
    ...output.contextArtifacts.messagingSource.answerReadyLanguage,
    output.contextArtifacts.brandKit.voice,
    output.contextArtifacts.brandKit.visualDirection,
    ...output.contextArtifacts.brandKit.constraints,
    ...output.contextArtifacts.audienceSegments.flatMap((segment) => [
      segment.name,
      segment.description,
      ...segment.missingEvidence,
    ]),
    ...output.contextArtifacts.channelRegistry.approvedChannels,
    ...output.contextArtifacts.channelRegistry.channelsTbd,
    output.aeoReadiness.entityClarity,
    ...output.aeoReadiness.answerReadyOpportunities,
    ...output.aeoReadiness.missingProof,
    ...output.openQuestions,
    ...output.downstreamHandoff.map((handoff) => handoff.reason),
    ...output.approvedFacts.map((claim) => claim.claim),
    ...output.proofBackedClaims.map((claim) => claim.claim),
    ...output.contextArtifacts.proofAndConstraints.approvedClaims.map((claim) => claim.claim),
  ];

  return [...new Set(candidates.map((candidate) => candidate.trim()).filter((candidate) => candidate.length > 8 && isGuardedReusableClaim(candidate)))].slice(0, 30);
}

function hasSensitiveOrMissingProofGaps(output: Output): boolean {
  return (
    output.claimsNeedingApproval.some((claim) => claim.source === "sensitive_claim_guardrail" || claim.status === "missing" || claim.status === "assumption") ||
    output.contextArtifacts.proofAndConstraints.blockedClaims.some((claim) => claim.source === "sensitive_claim_guardrail") ||
    output.aeoReadiness.missingProof.some((value) => !isTbdish(value)) ||
    output.contextArtifacts.messagingSource.proofNeeds.some((value) => !isTbdish(value)) ||
    output.openQuestions.length > 0
  );
}

function scrubReusableGuardedClaims(output: Output): void {
  const hasGuardrailClaims = hasSensitiveClaimGuardrails(output);
  const reusableProofNeeds = ["Approved company description", "Approved proof points", "Do-not-use claims"];

  output.contextArtifacts.companyContext.category = scrubGuardedString(
    output.contextArtifacts.companyContext.category,
    "TBD. Requires approved company category and proof constraints.",
  );
  output.contextArtifacts.companyContext.goals = scrubGuardedList(
    output.contextArtifacts.companyContext.goals,
    ["TBD. Requires approved company goals and proof constraints."],
  );

  const messagingSource = output.contextArtifacts.messagingSource;
  const originalAnswerReadyLanguageCount = messagingSource.answerReadyLanguage.length;
  messagingSource.overview = scrubGuardedString(
    messagingSource.overview,
    "TBD. Requires approved company description and proof-backed claims.",
  );
  messagingSource.positioning = scrubGuardedString(
    messagingSource.positioning,
    "TBD. Requires approved category, audience, problem, promise, differentiation, and proof.",
  );
  messagingSource.answerReadyLanguage = scrubGuardedList(messagingSource.answerReadyLanguage, []);
  messagingSource.proofNeeds = scrubGuardedList(messagingSource.proofNeeds, reusableProofNeeds);
  if (hasGuardrailClaims) {
    messagingSource.answerReadyLanguage = [];
    messagingSource.proofNeeds = reusableProofNeeds;
  }
  if (
    hasGuardrailClaims ||
    isTbdish(messagingSource.overview) ||
    isTbdish(messagingSource.positioning) ||
    messagingSource.answerReadyLanguage.length < originalAnswerReadyLanguageCount
  ) {
    messagingSource.status = messagingSource.status === "blocked" ? "blocked" : "needs_input";
    messagingSource.proofNeeds = [...new Set([...messagingSource.proofNeeds, ...reusableProofNeeds])];
  }

  output.contextArtifacts.brandKit.voice = scrubGuardedString(output.contextArtifacts.brandKit.voice, "Evidence-led, concise, reviewable.");
  output.contextArtifacts.brandKit.visualDirection = scrubGuardedString(
    output.contextArtifacts.brandKit.visualDirection,
    "Use approved brand guidance when supplied; otherwise keep design recommendations draft-only.",
  );
  output.contextArtifacts.brandKit.constraints = scrubGuardedList(output.contextArtifacts.brandKit.constraints, [
    "No final logo, trademark, legal, or production identity claims without approval.",
  ]);
  output.contextArtifacts.proofAndConstraints.constraints = mergeDefaultConstraints(
    scrubGuardedList(
      output.contextArtifacts.proofAndConstraints.constraints,
      defaultConstraints,
    ),
  );
  output.contextArtifacts.channelRegistry.blockedActions = mergeDefaultConstraints(
    scrubGuardedList(
      output.contextArtifacts.channelRegistry.blockedActions,
      defaultConstraints,
    ),
  );

  output.contextArtifacts.audienceSegments = output.contextArtifacts.audienceSegments.map((segment) => {
    const guardedDescription = isGuardedReusableClaim(segment.description);
    const needsOwnerApproval = !output.persistenceState.approved_in_session || hasGuardrailClaims;
    const missingEvidence = new Set(segment.missingEvidence);
    let evidenceStatus = segment.evidenceStatus;
    let status = segment.status;
    let description = segment.description;

    if (guardedDescription) {
      description = "Audience hypothesis pending approved segment evidence.";
      evidenceStatus = "missing";
      status = status === "blocked" ? "blocked" : "needs_input";
      missingEvidence.add("Approved segment evidence");
    } else if (needsOwnerApproval && evidenceStatus === "approved") {
      evidenceStatus = "user_supplied";
      missingEvidence.add("Owner approval");
    }

    return {
      ...segment,
      status,
      description,
      evidenceStatus,
      missingEvidence: [...missingEvidence],
    };
  });

  if (hasGuardrailClaims || !output.persistenceState.approved_in_session) {
    output.aeoReadiness.entityClarity = "Draft entity clarity pending approved evidence.";
    output.aeoReadiness.answerReadyOpportunities = [
      "What the company is",
      "Who it serves",
      "Why it matters",
      "What proof supports claims",
    ];
  } else {
    output.aeoReadiness.entityClarity = scrubGuardedString(
      output.aeoReadiness.entityClarity,
      "Draft entity clarity pending approved evidence.",
    );
    output.aeoReadiness.answerReadyOpportunities = scrubGuardedList(
      output.aeoReadiness.answerReadyOpportunities,
      ["What the company is", "Who it serves", "Why it matters", "What proof supports claims"],
    );
  }
  output.aeoReadiness.missingProof = scrubGuardedList(output.aeoReadiness.missingProof, [
    "Approved description",
    "Canonical URLs",
    "Proof-backed claims",
    "Source-backed FAQ inputs",
  ]);
  output.openQuestions = scrubGuardedList(output.openQuestions, normalizeOpenQuestions([], output.consumedContext.missing, output.conversationIntent));

  if (hasGuardrailClaims || !output.persistenceState.approved_in_session) {
    const defaultReasons = new Map(defaultDownstreamHandoff().map((handoff) => [handoff.agent, handoff.reason]));
    output.downstreamHandoff = output.downstreamHandoff.map((handoff) => ({
      ...handoff,
      reason: hasGuardrailClaims || isGuardedReusableClaim(handoff.reason)
        ? defaultReasons.get(handoff.agent) ?? "Use only after company context, proof constraints, and relevant artifacts are approved."
        : handoff.reason,
    }));
  }
}

function hasSensitiveClaimGuardrails(output: Output): boolean {
  return [...output.claimsNeedingApproval, ...output.contextArtifacts.proofAndConstraints.blockedClaims]
    .some((claim) => claim.source === "sensitive_claim_guardrail");
}

function normalizeClaimsNeedingApproval(claims: readonly Claim[]): Claim[] {
  return dedupeClaims(claims.map((claim) => isGuardedReusableClaim(claim.claim) ? sensitiveClaimNeedsApproval(claim.claim) : claim));
}

export function normalizeBlockedClaims(claims: readonly Claim[]): Claim[] {
  return dedupeClaims(
    claims.map((claim) => {
      if (claim.status === "blocked" || claim.status === "do_not_use") {
        return claim;
      }
      return {
        ...claim,
        status: "blocked" as const,
        source: claim.source ?? "sensitive_claim_guardrail",
        notes: appendNote(
          claim.notes,
          "The claim is in the blocked-claims collection and cannot be reused without separate evidence and owner approval.",
        ),
      };
    }),
  );
}

function scrubGuardedString(value: string, fallback: string): string {
  if (isTbdish(value)) return value;
  return isGuardedReusableClaim(value) ? fallback : value;
}

function scrubGuardedList(values: readonly string[], fallback: string[]): string[] {
  const scrubbed = values.filter((value) => !isTbdish(value) && !isGuardedReusableClaim(value));
  return scrubbed.length ? [...new Set(scrubbed)] : fallback;
}

function isReusableProofClaim(claim: Claim): boolean {
  return claim.status !== "blocked" &&
    claim.status !== "do_not_use" &&
    claim.status !== "missing" &&
    claim.status !== "assumption" &&
    !isCompanyIdentityClaim(claim.claim) &&
    !isGuardedReusableClaim(claim.claim);
}

function isCompanyIdentityClaim(claim: string): boolean {
  return /^company name\s*:/i.test(claim.trim());
}

function focusedMissingInputsForCompany(companyName: string): string[] {
  const missing = [
    companyName === "TBD" ? "Company name" : "",
    "Approved one-paragraph company description",
    "Primary Marketing OS audience",
    "Current marketing goal",
    "Proof-backed claims or source excerpts",
  ].filter(Boolean);
  return missing.slice(0, 5);
}

function normalizeOpenQuestions(existing: string[], missing: string[], conversationIntent: ConversationIntent): string[] {
  const questions = [...existing];
  if (conversationIntent === "attachment_unreadable") {
    questions.push("Can you paste the readable text from the attachment or provide excerpts?");
  }
  if (conversationIntent === "downstream_request_without_context") {
    questions.push("What should the downstream request accomplish after company context is approved?");
  }
  if (missing.some((item) => /company name/i.test(item))) questions.push("What company should this Marketing OS be set up for?");
  if (missing.some((item) => /description/i.test(item))) questions.push("What is the approved one-paragraph company description?");
  if (missing.some((item) => /audience/i.test(item))) questions.push("Who is the primary Marketing OS audience?");
  if (missing.some((item) => /goal/i.test(item))) questions.push("What is the current marketing goal?");
  if (missing.some((item) => /proof|evidence|claim/i.test(item))) questions.push("Which claims are proof-backed, and which should not be reused?");
  return [...new Set(questions)].slice(0, 5);
}

function downstreamReceivesForAgent(agentName: (typeof agentValues)[number]): Array<(typeof artifactValues)[number]> {
  switch (agentName) {
    case "Market Signal":
      return ["company-context", "proof-and-constraints", "dashboard-signals"];
    case "ICP":
      return ["company-context", "proof-and-constraints", "dashboard-signals"];
    case "Audience Segmentation":
      return ["company-context", "audience-segments", "channel-registry", "proof-and-constraints"];
    case "Messaging":
      return ["company-context", "messaging-source", "audience-segments", "proof-and-constraints", "dashboard-signals"];
    case "Branding And Pitch Deck":
      return ["company-context", "messaging-source", "brand-kit", "audience-segments", "proof-and-constraints"];
    case "Social Monitoring And Content":
      return ["company-context", "messaging-source", "brand-kit", "audience-segments", "channel-registry", "proof-and-constraints"];
    case "Campaigns And Paid Media":
      return ["company-context", "messaging-source", "audience-segments", "channel-registry", "proof-and-constraints", "dashboard-signals"];
    case "Company Context Builder":
      return ["company-context"];
  }
}

function defaultDownstreamHandoff(): Output["downstreamHandoff"] {
  return [
    {
      agent: "Market Signal",
      receives: ["company-context", "proof-and-constraints", "dashboard-signals"],
      reason: "Use when external validation, competitor evidence, search signals, or market language are missing.",
    },
    {
      agent: "ICP",
      receives: ["company-context", "proof-and-constraints", "dashboard-signals"],
      reason: "Use when audience definitions are broad and need target buyer, user, fit, and objection hypotheses.",
    },
    {
      agent: "Audience Segmentation",
      receives: ["company-context", "audience-segments", "channel-registry", "proof-and-constraints"],
      reason: "Use when activation, suppression, consent, or channel-specific audience logic is needed.",
    },
    {
      agent: "Messaging",
      receives: ["company-context", "messaging-source", "audience-segments", "proof-and-constraints", "dashboard-signals"],
      reason: "Use when positioning and proof constraints are ready for reviewable message development.",
    },
    {
      agent: "Branding And Pitch Deck",
      receives: ["company-context", "messaging-source", "brand-kit", "audience-segments", "proof-and-constraints"],
      reason: "Use when story, web, AEO, pitch, or brand direction materials are needed.",
    },
    {
      agent: "Social Monitoring And Content",
      receives: ["company-context", "messaging-source", "brand-kit", "audience-segments", "channel-registry", "proof-and-constraints"],
      reason: "Use when content planning depends on approved messaging and channel constraints.",
    },
    {
      agent: "Campaigns And Paid Media",
      receives: ["company-context", "messaging-source", "audience-segments", "channel-registry", "proof-and-constraints", "dashboard-signals"],
      reason: "Use when campaign planning depends on approved segments, messaging, channel constraints, and proof policy.",
    },
  ];
}

function mergeHandoffs(primary: Output["downstreamHandoff"], secondary: Output["downstreamHandoff"]): Output["downstreamHandoff"] {
  const byAgent = new Map<(typeof agentValues)[number], Output["downstreamHandoff"][number]>();
  for (const handoff of [...primary, ...secondary]) {
    if (!byAgent.has(handoff.agent)) byAgent.set(handoff.agent, handoff);
  }
  return [...byAgent.values()];
}

function buildFallbackOutput(input: Input, blockers: string[], conversationIntent: ConversationIntent = "source_available"): Output {
  const rawContext = getRawContext(input);
  const companyName = extractCompanyName(rawContext) ?? "TBD";
  const approvedDescription = extractLineAfterLabels(rawContext, [
    "Approved company description",
    "Approved description",
    "Company description",
    "Product description",
    "Description",
  ]) ?? extractCompanyDescriptionFromProse(rawContext, companyName);
  const primaryAudiences = extractListAfterLabels(rawContext, ["Primary audiences", "Primary audience", "Audiences", "Audience"]);
  const goals = extractListAfterLabels(rawContext, ["Current goals", "Goals"]);
  const approvedChannels = hasExplicitApprovedChannelScope(rawContext)
    ? extractListAfterLabels(rawContext, ["Channels in scope", "Approved channels", "Channel scope", "Channels"])
    : [];
  const proofFacts = extractProofFacts(rawContext);
  const reusableProofFacts = proofFacts.filter((fact) => !isSensitiveClaim(fact));
  const sensitiveProofFacts = proofFacts.filter(isSensitiveClaim);
  const userSuppliedFacts = dedupeClaims([
    ...(companyName !== "TBD" ? [userSuppliedClaim(`Company name: ${companyName}`)] : []),
    ...(approvedDescription ? [userSuppliedClaim(approvedDescription)] : []),
    ...reusableProofFacts.map(userSuppliedClaim),
  ]);
  const sensitiveClaimsNeedingApproval = sensitiveProofFacts.map((claim) => ({
    claim,
    status: "blocked" as const,
    source: "sensitive_claim_guardrail",
    notes: "Requires separate approval and evidence before reuse.",
  }));
  const missing = inferMissingInputs(rawContext, companyName);
  const missingClaims = missing.map((item) => ({
    claim: item,
    status: "missing" as const,
    source: "context_gap",
  }));
  const sparse = isSparse(rawContext);
  const status = sparse ? "blocked" : "needs_input";
  const readiness = sparse ? "blocked" : "draft";
  const requestedArtifacts = getRequestedArtifacts(input);
  const operatingConstraints = getOperatingConstraints(input);

  const output: Output = {
    status,
    type: "text",
    text: "",
    conversationIntent,
    persistenceState: normalizePersistenceState(undefined, conversationIntent),
    consumedContext: {
      used: rawContext ? ["User-provided raw context"] : [],
      missing,
      sourceLabels: getSourceLabels(input),
    },
    contextArtifacts: {
      companyContext: {
        status,
        companyName,
        category: "TBD",
        primaryAudiences: primaryAudiences.length ? primaryAudiences : ["TBD"],
        goals: goals.length ? goals : ["TBD"],
        missingContext: missing,
      },
      messagingSource: {
        status,
        overview: approvedDescription ?? "TBD. Requires approved company description and proof-backed claims.",
        positioning: "TBD. Requires approved category, audience, problem, promise, and differentiation.",
        proofNeeds: ["Approved entity facts", "Approved proof points", "Do-not-use claims"],
        answerReadyLanguage: [],
      },
      brandKit: {
        status: "needs_input",
        voice: "Evidence-led, concise, reviewable.",
        visualDirection: "Use approved brand guidance when supplied; otherwise keep design recommendations draft-only.",
        constraints: ["No final logo, trademark, legal, or production identity claims without approval."],
      },
      audienceSegments: [
        {
          status,
          name: "Primary audience TBD",
          description: "Audience segments require approved ICP context before activation-ready rules.",
          evidenceStatus: "missing",
          missingEvidence: ["Approved audience definitions", "Source data", "Consent and suppression rules"],
        },
      ],
      channelRegistry: {
        status,
        approvedChannels,
        channelsTbd: ["Website", "Email", "LinkedIn", "X/Twitter", "Reddit", "Forums", "CRM", "Ad platforms"],
        blockedActions: operatingConstraints,
      },
      proofAndConstraints: {
        status,
        approvedClaims: userSuppliedFacts,
        blockedClaims: [
          {
            claim: "Live publishing, scheduling, spend, CRM activation, credential setup, or external system changes are complete.",
            status: "blocked",
            source: "operating_constraints",
            notes: "V1 can draft review packets only.",
          },
          ...sensitiveClaimsNeedingApproval,
        ],
        constraints: operatingConstraints,
      },
      dashboardSignals: {
        status,
        readiness,
        blockers,
        nextReviewSignals: ["Context completeness", "Approved facts", "Approval gates", "Recommended next agent"],
      },
    },
    workspaceContextDraft: renderWorkspaceContextDraft(companyName, readiness),
    approvedFacts: userSuppliedFacts,
    extractedClaims: userSuppliedFacts,
    proofBackedClaims: dedupeClaims(reusableProofFacts.map(userSuppliedClaim)),
    claimsNeedingApproval: [...missingClaims, ...sensitiveClaimsNeedingApproval],
    assumptionsAndMissingEvidence: missingClaims,
    openQuestions: normalizeOpenQuestions([], missing, conversationIntent),
    approvalGates: defaultApprovalGates(),
    aeoReadiness: {
      status: readiness,
      entityClarity: companyName === "TBD" ? "Blocked until the company entity is named and described." : "Draft entity clarity from user-supplied company name only.",
      answerReadyOpportunities: ["What the company is", "Who it serves", "Why it matters", "What proof supports claims"],
      missingProof: ["Approved description", "Canonical URLs", "Proof-backed claims", "Source-backed FAQ inputs"],
      recommendedWebInputs: ["Entity summary", "FAQ candidates", "Schema.org inputs", "llms.txt inputs"],
    },
    statusPayload: {
      companyName,
      readiness,
      nextAgents: ["Market Signal", "ICP", "Messaging"],
      blockers,
      requiredArtifacts: requestedArtifacts,
      evidence_mode: "source_supplied",
      observed_at: null,
      source_coverage: rawContext ? ["Current-session user-supplied source text"] : [],
      coverage_limitations: ["No connected read-only source or live monitor was queried."],
      safety: {
        action_mode: "draft_only",
        external_mutation_requested: false,
        blocked_actions: operatingConstraints,
        unsupported_claims: [],
        evidence_gaps: missing,
      },
    },
    downstreamHandoff: [
      {
        agent: "Market Signal",
        receives: ["company-context", "channel-registry", "proof-and-constraints", "dashboard-signals"],
        reason: "Review external source scope after company identity and proof constraints are approved.",
      },
      {
        agent: "ICP",
        receives: ["company-context", "proof-and-constraints", "dashboard-signals"],
        reason: "Define target audiences once company goals and constraints are approved.",
      },
      {
        agent: "Messaging",
        receives: ["company-context", "audience-segments", "proof-and-constraints", "dashboard-signals"],
        reason: "Draft positioning and answer-ready language only after approved context exists.",
      },
    ],
    markdownPacket: "",
  };

  const markdownPacket = renderMarkdownPacket(output);
  return { ...output, text: markdownPacket, markdownPacket };
}

function inferMissingInputs(rawContext: string, companyName: string): string[] {
  const missing = new Set<string>();
  if (companyName === "TBD") missing.add("Company name");
  if (!/audience/i.test(rawContext)) missing.add("Primary audiences");
  if (!/goal/i.test(rawContext)) missing.add("Current goals");
  if (!/proof|evidence|claim/i.test(rawContext)) missing.add("Proof-backed claims");
  if (!/channel|website|social|email|paid|crm/i.test(rawContext)) missing.add("Channel scope");
  return [...missing];
}

function extractCompanyName(rawContext: string): string | undefined {
  const labeledName = extractLineAfterLabels(rawContext, [
    "Company name",
    "Brand name",
    "Organization name",
    "Org name",
    "Product name",
    "Company",
    "Brand",
    "Organization",
    "Org",
    "Product",
  ]);
  const cleanedLabeledName = labeledName ? cleanExtractedName(labeledName) : undefined;
  if (cleanedLabeledName) return cleanedLabeledName;

  const headingName = extractNameFromSourceHeading(rawContext);
  if (headingName) return headingName;

  const proseName = extractNameFromCompanyProse(rawContext);
  if (proseName) return proseName;

  const namedEntityReference = extractNamedEntityReference(rawContext);
  if (namedEntityReference) return namedEntityReference;

  const patterns = [
    /\b(?:we['’]?re|we are)\s+([A-Z][A-Za-z0-9 .&'-]{1,80})(?:[,.]|$)/i,
    /\b(?:company|brand|organization|org|product)\s+(?:called|named)\s+([A-Z][A-Za-z0-9 .&'-]{1,80})/i,
    /\b(?:company|brand|organization|org|product)\s+is\s+([A-Z][A-Za-z0-9 .&'-]{1,80})(?:[,.]|$)/i,
    /\b(?:context|setup|profile|brief)\s+for\s+([A-Z][A-Za-z0-9 .&'-]{1,80})(?:[,.]|$)/i,
    /\bfor\s+([A-Z][A-Za-z0-9 .&'-]{1,80})(?:[.!?]|$)/,
    /,\s*([A-Z][A-Za-z0-9 .&'-]{1,80})\.?\s*$/,
  ];
  const value = patterns
    .map((pattern) => cleanExtractedName(rawContext.match(pattern)?.[1] ?? ""))
    .find((candidate) => candidate !== undefined);
  return value;
}

function extractNamedEntityReference(rawContext: string): string | undefined {
  const patterns = [
    /\b(?:for|focused on|about|set up for|build context for)\s+(?:my|our|the)\s+(?:company|brand|organization|org|product)\s*,\s*([A-Z][A-Za-z0-9 .&'-]{1,80})(?:[.!?\n\r]|$)/i,
    /\b(?:company|brand|organization|org|product)\s*,\s*([A-Z][A-Za-z0-9 .&'-]{1,80})(?:[.!?\n\r]|$)/i,
  ];
  return patterns
    .map((pattern) => cleanExtractedName(rawContext.match(pattern)?.[1] ?? ""))
    .find((candidate) => candidate !== undefined);
}

function extractNameFromSourceHeading(rawContext: string): string | undefined {
  for (const rawLine of rawContext.split(/\r?\n/)) {
    const line = rawLine.trim();
    const markdownMatch = line.match(
      /^#{1,3}\s+(.+?)\s+(?:company|product|brand)\s+(?:profile|overview|context|brief)\b/i,
    );
    const markdownValue = markdownMatch?.[1]
      ? cleanExtractedName(markdownMatch[1])
      : undefined;
    if (markdownValue) return markdownValue;

    const sourceLabelMatch = line.match(
      /^(?:source|reference|candidate)\s+(?:brief|document|material|profile|text|packet)\s*:\s*(.+)$/i,
    );
    const sourceLabelValue = sourceLabelMatch?.[1]
      ? cleanExtractedName(
          sourceLabelMatch[1].replace(
            /\s+(?:(?:company|product|brand)\s+)?(?:acceptance\s+fixture|profile|overview|context|brief|fixture)\s*$/i,
            "",
          ),
        )
      : undefined;
    if (sourceLabelValue) return sourceLabelValue;
  }
  return undefined;
}

function extractNameFromCompanyProse(rawContext: string): string | undefined {
  const match = rawContext.match(
    /(?:^|\n)\s*([A-Z][A-Za-z0-9 .&'’.-]{1,80}?)(?:,\s*(?:Inc\.?|LLC|Ltd\.?|Limited|Corp\.?|Corporation))?\s+is\s+(?:a|an)\s+/m,
  );
  return match?.[1] ? cleanExtractedName(match[1]) : undefined;
}

function extractCompanyDescriptionFromProse(
  rawContext: string,
  companyName: string | undefined,
): string | undefined {
  if (!companyName || companyName === "TBD") return undefined;
  const normalizedName = companyName.replace(
    /,\s*(?:Inc\.?|LLC|Ltd\.?|Limited|Corp\.?|Corporation)$/i,
    "",
  );
  const companyLinePattern = new RegExp(
    `^${escapeRegExp(normalizedName)}(?:,\\s*(?:Inc\\.?|LLC|Ltd\\.?|Limited|Corp\\.?|Corporation))?\\s+is\\s+(?:a|an)\\s+`,
    "i",
  );
  for (const rawLine of rawContext.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!companyLinePattern.test(line)) continue;
    return line.replace(/[.。]+$/, "").trim() || undefined;
  }
  return undefined;
}

function cleanExtractedName(value: string): string | undefined {
  const cleaned = value
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(?:so|to|because|that|for|and|or)\b.*$/i, "")
    .replace(/\s+(so|to|because|that|for)\b.*$/i, "")
    .replace(/[.。]+$/, "")
    .trim();
  if (!cleaned || /^tbd$/i.test(cleaned) || isGenericExtractedName(cleaned)) return undefined;
  return cleaned;
}

function isGenericExtractedName(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if ([
    "marketing os",
    "guild marketing os",
    "company context",
    "workspace context",
    "context",
    "context for other agents",
    "other agents",
    "other agents to reference",
    "downstream agents",
    "agents",
    "project",
    "company",
    "my company",
    "our company",
    "the company",
    "my project",
    "our project",
    "the project",
    "my brand",
    "our brand",
    "the brand",
    "this test",
    "the test",
    "this request",
    "the request",
    "this source",
    "the source",
    "this fixture",
    "the fixture",
    "teams",
    "leaders",
    "users",
    "customers",
  ].includes(normalized)) return true;

  return /^(?:a|an|the|used by|used for|built for|designed for|helps|serves|targets|focused on)\b/i.test(normalized) ||
    /\b(?:used by|used for|focused on|that|who|which|helps|serves|targets|need to|needs to|should|can)\b/i.test(normalized);
}

function extractLineAfterLabels(rawContext: string, labels: readonly string[]): string | undefined {
  const sortedLabels = [...labels].sort((a, b) => b.length - a.length);
  const lines = rawContext.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const line = rawLine.trim().replace(/^[-*]\s+/, "");
    for (const label of sortedLabels) {
      const match = line.match(new RegExp(`(?:^|[.;。]\\s*)${escapeRegExp(label)}\\s*:\\s*(.+)$`, "i"));
      const value = match?.[1] ? cleanLabeledFieldValue(match[1]) : undefined;
      if (value) return value;

      if (!new RegExp(`^${escapeRegExp(label)}\\s*:\\s*$`, "i").test(line)) {
        continue;
      }
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const next = (lines[cursor] ?? "").trim().replace(/^[-*]\s+/, "");
        if (!next) continue;
        if (isSourcePacketFieldLabel(next)) break;
        const followingValue = cleanLabeledFieldValue(next);
        if (followingValue) return followingValue;
        break;
      }
    }
  }
  return undefined;
}

function extractBlockAfterLabels(
  rawContext: string,
  labels: readonly string[],
): string[] {
  const sortedLabels = [...labels].sort((a, b) => b.length - a.length);
  const lines = rawContext.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] ?? "").trim().replace(/^[-*]\s+/, "");
    const label = sortedLabels.find((candidate) =>
      new RegExp(`^${escapeRegExp(candidate)}\\s*:`, "i").test(line)
    );
    if (!label) continue;

    const values: string[] = [];
    const inline = line.replace(
      new RegExp(`^${escapeRegExp(label)}\\s*:\\s*`, "i"),
      "",
    );
    const cleanedInline = cleanLabeledFieldValue(inline);
    if (cleanedInline) values.push(cleanedInline);

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const rawNext = lines[cursor] ?? "";
      const next = rawNext.trim().replace(/^[-*]\s+/, "");
      if (!next) {
        if (values.length > 0) break;
        continue;
      }
      if (isSourcePacketFieldLabel(next)) break;
      const value = cleanLabeledFieldValue(next);
      if (value) values.push(value);
    }
    return [...new Set(values)];
  }
  return [];
}

function isSourcePacketFieldLabel(value: string): boolean {
  return sourcePacketFieldLabels.some((label) =>
    new RegExp(`^${escapeRegExp(label)}\\s*:`, "i").test(value)
  );
}

function cleanLabeledFieldValue(value: string): string | undefined {
  const nextLabelPattern = new RegExp(`(?:^|[.;。]\\s*)(?:${sourcePacketFieldLabels.map(escapeRegExp).join("|")})\\s*:`, "i");
  const nextLabel = value.match(nextLabelPattern);
  const truncated = nextLabel?.index === undefined ? value : value.slice(0, nextLabel.index);
  const cleaned = truncated.trim().replace(/[.。]+$/, "").trim();
  return cleaned || undefined;
}

function extractListAfterLabels(rawContext: string, labels: readonly string[]): string[] {
  const line = extractLineAfterLabels(rawContext, labels);
  if (!line) return [];
  return line
    .split(/,|;|\s+and\s+/i)
    .map((value) => value.trim())
    .map((value) => value.replace(/^(and|or)\s+/i, "").replace(/[.。]+$/, "").trim())
    .filter(Boolean);
}

function extractProofFacts(rawContext: string): string[] {
  const labels = [
    "Proof-backed claims or source excerpts",
    "Proof-backed claims",
    "Approved proof",
    "Proof points",
    "Evidence",
  ] as const;
  const facts: string[] = [];
  const line = extractLineAfterLabels(rawContext, labels);
  if (line) {
    facts.push(
      ...line
        .split(/;/)
        .map((value) => value.trim().replace(/[.。]+$/, "").trim())
        .filter(Boolean),
    );
  }

  const proofHeader =
    /^\s*(?:#{1,6}\s*)?(?:proof-backed claims?(?:\s+approved\b[^:]*)?|approved proof|proof points?|evidence)\s*:\s*(.*)$/i;
  const lines = rawContext.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index]?.match(proofHeader);
    if (!match) continue;
    const inline = match[1]?.trim();
    if (inline) {
      facts.push(
        ...inline
          .split(/;/)
          .map((value) => value.trim().replace(/[.。]+$/, "").trim())
          .filter(Boolean),
      );
    }
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const next = lines[cursor]?.trim() ?? "";
      if (!next) continue;
      const bullet = next.match(/^[-*]\s+(.+)$/);
      if (!bullet) break;
      const fact = bullet[1]?.trim().replace(/[.。]+$/, "").trim();
      if (fact) facts.push(fact);
    }
  }
  return [...new Set(facts)];
}

function userSuppliedClaim(claim: string): Claim {
  return {
    claim,
    status: "user_supplied",
    source: "user_input",
  };
}

function addUserSuppliedClaim(claims: Claim[], claim: string): void {
  const normalized = normalizeForGrounding(claim);
  if (!normalized) return;
  const exists = claims.some((existingClaim) => normalizeForGrounding(existingClaim.claim) === normalized);
  if (!exists) {
    claims.push(userSuppliedClaim(claim));
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderWorkspaceContextDraft(companyName: string, readiness: string): string {
  return [
    `Company: ${companyName}`,
    `Readiness: ${readiness}`,
    "Operating rule: draft reviewable work, mark missing evidence, and keep live actions behind explicit approval.",
  ].join("\n");
}

function renderReadyToPublishWorkspaceContext(output: Omit<Output, "markdownPacket">): string {
  return [
    output.workspaceContextDraft,
    `Required artifacts: ${formatList(output.statusPayload.requiredArtifacts)}`,
    `Recommended next agents: ${formatList(output.statusPayload.nextAgents)}`,
    `Blocked actions: ${formatList(output.contextArtifacts.channelRegistry.blockedActions)}`,
    output.persistenceState.saved_to_workspace_context
      ? `Persistence state: published to Guild workspace context${output.persistenceState.workspace_context_id ? ` as ${output.persistenceState.workspace_context_id}` : ""}.`
      : "Persistence rule: this block may be published only after approval and the exact confirmation phrase `publish approved context to workspace context`.",
  ].join("\n");
}

function renderDownstreamHandoffContext(output: Omit<Output, "markdownPacket">): string {
  const companyName = output.contextArtifacts.companyContext.companyName || output.statusPayload.companyName || "TBD";
  const proofClaims = output.proofBackedClaims.filter(isReusableProofClaim).map((claim) => claim.claim);
  const blockedClaimCount = output.claimsNeedingApproval.filter((claim) => claim.claim.trim()).length;
  const blockedClaimCategories = summarizeBlockedClaimCategories(output.claimsNeedingApproval);
  const approvedFacts = output.approvedFacts
    .filter((claim) => claim.status === "approved" || claim.status === "user_supplied")
    .map((claim) => claim.claim)
    .slice(0, 8);

  return [
    "Block label: Downstream Handoff Context",
    `Company: ${companyName}`,
    `Readiness: ${output.statusPayload.readiness}`,
    `Primary audiences: ${formatList(output.contextArtifacts.companyContext.primaryAudiences)}`,
    `Goals: ${formatList(output.contextArtifacts.companyContext.goals)}`,
    `Approved or user-supplied facts: ${formatList(approvedFacts)}`,
    `Reusable proof claims: ${formatList(proofClaims)}`,
    `Claims blocked or needing approval: ${blockedClaimCount ? `${blockedClaimCount} withheld claim(s); categories: ${formatList(blockedClaimCategories)}` : "TBD"}`,
    `Channel scope: ${formatList([
      ...output.contextArtifacts.channelRegistry.approvedChannels,
      ...output.contextArtifacts.channelRegistry.channelsTbd.map((channel) => `TBD: ${channel}`),
    ])}`,
    `Operating constraints: ${formatList(output.contextArtifacts.proofAndConstraints.constraints)}`,
    `Recommended next agents: ${formatList(output.statusPayload.nextAgents)}`,
    output.persistenceState.saved_to_workspace_context
      ? `Persistence state: published Guild workspace context${output.persistenceState.workspace_context_id ? ` (${output.persistenceState.workspace_context_id})` : ""}.`
      : "Persistence state: session draft only unless separately published to Guild workspace context.",
  ].join("\n");
}

function summarizeBlockedClaimCategories(claims: readonly Claim[]): string[] {
  const categories = new Set<string>();
  for (const claim of claims) {
    const value = claim.claim;
    if (/\$[0-9]|\bfunding\b|\brevenue\b|\barr\b|\bvaluation\b/i.test(value)) categories.add("financial proof");
    if (/\b[0-9][0-9.,]*\s*(?:m|million|k|thousand)?\s+users\b|\bcustomer count\b|\baudience count\b|\bteam members\b|\bcountries\b/i.test(value)) categories.add("scale proof");
    if (/\buptime\b|\bavailability\b|\bsla\b|\bperformance\b|\bfaster\b|\bconversion\b|\broi\b/i.test(value)) categories.add("performance proof");
    if (/\bsecurity\b|\bsecure\b|\bcompliance\b|\bcompliant\b|\bsoc\s*2\b|\bhipaa\b|\bgdpr\b|\bprivacy\b/i.test(value)) categories.add("legal or trust proof");
    if (/\bleading\b|\bleader\b|\b#1\b|\bbest\b|\bonly\b|\branked\b|\branking\b/i.test(value)) categories.add("positioning proof");
  }
  if (!categories.size && claims.length) categories.add("owner approval required");
  return [...categories];
}

function renderMarkdownPacket(output: Omit<Output, "markdownPacket">): string {
  if (output.conversationIntent === "downstream_request") {
    return renderDownstreamRoutingPacket(output);
  }

  return `${renderPacketSummary(output)}

---

# Company Context Approval Packet

## Consumed Context
- Conversation intent: ${output.conversationIntent}
- Used: ${formatList(output.consumedContext.used)}
- Missing: ${formatList(output.consumedContext.missing)}
- Source labels: ${formatList(output.consumedContext.sourceLabels)}

## Produced Artifact
### Save And Approval State
- drafted_in_session: ${String(output.persistenceState.drafted_in_session)}
- approved_in_session: ${String(output.persistenceState.approved_in_session)}
- saved_to_workspace_context: ${String(output.persistenceState.saved_to_workspace_context)}
- saved_to_context_artifacts: ${String(output.persistenceState.saved_to_context_artifacts)}
- workspace_context_id: ${output.persistenceState.workspace_context_id ?? "TBD"}
- workspace_context_draft_id: ${output.persistenceState.workspace_context_draft_id ?? "TBD"}
- workspace_context_previous_id: ${output.persistenceState.workspace_context_previous_id ?? "TBD"}
- workspace_context_status: ${output.persistenceState.workspace_context_status ?? "not_requested"}
- workspace_context_summary: ${output.persistenceState.workspace_context_summary ?? "TBD"}
- workspace_context_publish_path: ${output.persistenceState.workspace_context_publish_path ?? "TBD"}
- workspace_context_rollback_note: ${output.persistenceState.workspace_context_rollback_note ?? "TBD"}
- source_references: ${formatList(output.persistenceState.source_references ?? [])}
- context_artifact_references: ${formatList(output.persistenceState.context_artifact_references ?? [])}
- Note: ${output.persistenceState.persistence_note}

### Company Context Draft (company-context)
- Company: ${output.contextArtifacts.companyContext.companyName}
- Status: ${output.contextArtifacts.companyContext.status}
- Category: ${output.contextArtifacts.companyContext.category}
- Audiences: ${formatList(output.contextArtifacts.companyContext.primaryAudiences)}
- Goals: ${formatList(output.contextArtifacts.companyContext.goals)}
- Missing context: ${formatList(output.contextArtifacts.companyContext.missingContext)}

### Messaging Source Draft (messaging-source)
- Status: ${output.contextArtifacts.messagingSource.status}
- Overview: ${output.contextArtifacts.messagingSource.overview}
- Positioning: ${output.contextArtifacts.messagingSource.positioning}
- Answer-ready language: ${formatList(output.contextArtifacts.messagingSource.answerReadyLanguage)}
- Proof needs: ${formatList(output.contextArtifacts.messagingSource.proofNeeds)}

### Brand Kit Draft (brand-kit)
- Status: ${output.contextArtifacts.brandKit.status}
- Voice: ${output.contextArtifacts.brandKit.voice}
- Visual direction: ${output.contextArtifacts.brandKit.visualDirection}
- Constraints: ${formatList(output.contextArtifacts.brandKit.constraints)}

### Audience Segments Draft (audience-segments)
${formatAudienceSegments(output.contextArtifacts.audienceSegments)}

### Channel Registry Draft (channel-registry)
- Status: ${output.contextArtifacts.channelRegistry.status}
- Approved channels: ${formatList(output.contextArtifacts.channelRegistry.approvedChannels)}
- Channels TBD: ${formatList(output.contextArtifacts.channelRegistry.channelsTbd)}
- Blocked actions: ${formatList(output.contextArtifacts.channelRegistry.blockedActions)}

### Proof And Constraints Draft (proof-and-constraints)
- Status: ${output.contextArtifacts.proofAndConstraints.status}
- Approved claims:
${formatClaims(output.contextArtifacts.proofAndConstraints.approvedClaims)}
- Blocked or do-not-use claims:
${formatClaims(output.contextArtifacts.proofAndConstraints.blockedClaims)}
- Constraints: ${formatList(output.contextArtifacts.proofAndConstraints.constraints)}

### Dashboard Signals Draft (dashboard-signals)
- Status: ${output.contextArtifacts.dashboardSignals.status}
- Readiness: ${output.contextArtifacts.dashboardSignals.readiness}
- Blockers: ${formatList(output.contextArtifacts.dashboardSignals.blockers)}
- Next review signals: ${formatList(output.contextArtifacts.dashboardSignals.nextReviewSignals)}

### Guild Workspace Context Draft
${output.workspaceContextDraft}

### Ready-To-Publish Workspace Context
\`\`\`text
${renderReadyToPublishWorkspaceContext(output)}
\`\`\`
${output.persistenceState.saved_to_workspace_context
  ? `This block has been published to Guild workspace context as ${output.persistenceState.workspace_context_id ?? "a published context revision"}.`
  : "This block has not been saved. Use it only after explicit approval, then reply exactly `publish approved context to workspace context`."}

### Context For Downstream Agents
\`\`\`text
${renderDownstreamHandoffContext(output)}
\`\`\`
${output.persistenceState.saved_to_workspace_context
  ? "Downstream agents should treat published Guild workspace context as their first source of truth."
  : "Paste this block into a downstream agent if workspace context has not been published yet."}

## Assumptions And Missing Evidence
- Evidence mode: ${output.statusPayload.evidence_mode}

### Approved Or User-Supplied Facts
${formatEvidenceSectionClaims(output.approvedFacts)}

### Extracted Claims
${formatEvidenceSectionClaims(output.extractedClaims)}

### Proof-Backed Claims
${formatEvidenceSectionClaims(output.proofBackedClaims)}

### Claims Needing Approval
${formatEvidenceSectionClaims(output.claimsNeedingApproval)}

### Assumptions And Missing Evidence
${formatEvidenceSectionClaims(output.assumptionsAndMissingEvidence)}

### Open Questions
${formatBulletList(output.openQuestions)}

## Approval Gate
${output.approvalGates
  .map((gate) => `- Review required — ${gate.ownerRole}: ${gate.decision} Required before: ${withoutTrailingPeriod(gate.requiredBefore)}. Status: ${gate.status}.`)
  .join("\n")}

## AEO / AI-Readiness Contribution
- Status: ${output.aeoReadiness.status}
- Entity clarity: ${output.aeoReadiness.entityClarity}
- Answer-ready opportunities: ${formatList(output.aeoReadiness.answerReadyOpportunities)}
- Missing proof: ${formatList(output.aeoReadiness.missingProof)}
- Recommended web inputs for review: ${formatList(output.aeoReadiness.recommendedWebInputs)}

## Status Payload
\`\`\`json
${JSON.stringify({
  ...output.statusPayload,
  status: output.status,
  conversationIntent: output.conversationIntent,
  persistenceState: output.persistenceState,
}, null, 2)}
\`\`\`

## Downstream Handoff
${output.downstreamHandoff
  .map((handoff) => `- ${handoff.agent}: receives ${handoff.receives.join(", ")}. ${handoff.reason}`)
  .join("\n")}
`;
}

function renderDownstreamRoutingPacket(output: Omit<Output, "markdownPacket">): string {
  const requestedAgent = output.statusPayload.nextAgents[0] ?? "Company Context Builder";
  return `# Company Context Builder Routing Note

## Consumed Context
- Used: ${formatList(output.consumedContext.used)}
- Missing: ${formatList(output.consumedContext.missing)}
- Evidence mode: source_supplied

## Produced Artifact
- Company Context Builder is context-only.
- Published company context is available.
- No new company context packet or workspace-context draft was created from the request.
- Continue through Marketing OS Launcher or @mention ${requestedAgent}.

## Assumptions And Missing Evidence
- The requested specialist must validate task-specific evidence and limitations in its own artifact.

## Approval Gate
${output.approvalGates
  .map((gate) => `- Review required — ${gate.ownerRole}: ${gate.decision} Required before: ${withoutTrailingPeriod(gate.requiredBefore)}. Status: ${gate.status}.`)
  .join("\n")}

## AEO / AI-Readiness Contribution
- No new AEO or AI-readiness artifact was generated by this routing response.

## Status Payload
\`\`\`json
${JSON.stringify({
  ...output.statusPayload,
  status: output.status,
  conversationIntent: output.conversationIntent,
  persistenceState: output.persistenceState,
}, null, 2)}
\`\`\`

## Downstream Handoff
${output.downstreamHandoff
  .map((handoff) => `- ${handoff.agent}: receives ${handoff.receives.join(", ")}. ${handoff.reason}`)
  .join("\n")}
`;
}

function renderPacketSummary(output: Omit<Output, "markdownPacket">): string {
  if (output.conversationIntent === "save_state_question") {
    if (output.persistenceState.saved_to_workspace_context) {
      return `${output.persistenceState.persistence_note} Downstream agents should treat published Guild workspace context as their first source of truth.`;
    }
    return output.persistenceState.persistence_note;
  }
  if (output.conversationIntent === "attachment_unreadable") {
    return "I can see that you tried to provide company context, but I cannot read the attachment contents in this run. Paste the relevant text or provide readable excerpts, and I will extract the company context from it. Nothing has been saved.";
  }
  if (output.conversationIntent === "downstream_request_without_context") {
    const requestedAgent = output.downstreamHandoff.find((handoff) => handoff.agent !== "Company Context Builder")?.agent ?? "the requested downstream agent";
    return `I preserved the request for ${requestedAgent}, but setup comes first. The Marketing OS needs approved company context before downstream agents should produce specialist work. Nothing has been saved.`;
  }
  if (output.conversationIntent === "approval_or_edit") {
    if (output.persistenceState.saved_to_workspace_context) {
      return `${output.persistenceState.persistence_note} Downstream agents should now use Guild workspace context as their first source of truth.`;
    }
    if (output.persistenceState.workspace_context_status === "approved_pending_publish") {
      return `${output.persistenceState.persistence_note} No workspace context write has run yet.`;
    }
    if (output.persistenceState.workspace_context_status === "blocked") {
      return output.persistenceState.persistence_note;
    }
    if (needsVisiblePriorDraftForApproval(output)) {
      return "I noted the approval or persistence request, but this run cannot resolve an exact durable Company Context artifact revision. Recreate the draft from readable source before approving it. Guild workspace context was not changed.";
    }
    return output.persistenceState.persistence_note;
  }
  if (output.conversationIntent === "missing_context") {
    return "I do not have enough company context yet. Reply with rough notes, pasted text, or a readable source packet; you do not need to fill out an internal schema. Nothing has been saved.";
  }
  const companyName = output.statusPayload.companyName === "TBD" ? "this company" : output.statusPayload.companyName;
  return output.persistenceState.saved_to_context_artifacts
    ? output.status === "ready_for_review"
      ? `I drafted initial company context for ${companyName} and retained the supplied source plus review-ready Company Context artifact in Guild Chat state. Guild Workspace Context has not changed. Review and approve the exact artifact revision in the canonical Launcher Chat before publication.`
      : `I drafted initial company context for ${companyName} and retained the supplied source plus a draft Company Context artifact in Guild Chat state. Guild Workspace Context has not changed. Continue in the canonical Launcher Chat with the focused inputs listed in this draft.`
    : `I drafted initial company context for ${companyName}, but durable source and artifact persistence did not complete. Approval and workspace-context publication remain blocked.`;
}

function needsVisiblePriorDraftForApproval(output: Pick<Output, "conversationIntent" | "persistenceState" | "statusPayload">): boolean {
  return output.conversationIntent === "approval_or_edit" &&
    !output.persistenceState.approved_in_session &&
    output.statusPayload.blockers.some((blocker) => /prior company context draft is not visible/i.test(blocker));
}

function formatAudienceSegments(segments: readonly AudienceSegment[]): string {
  if (!segments.length) return "- TBD.";
  return segments
    .map((segment) => [
      `- ${segment.name}: ${segment.description}`,
      `  Status: ${segment.status}. Evidence: ${segment.evidenceStatus}. Missing evidence: ${formatList(segment.missingEvidence)}.`,
    ].join("\n"))
    .join("\n");
}

function formatBulletList(values: readonly string[]): string {
  if (!values.length) return "- None.";
  return values.map((value) => `- ${value}`).join("\n");
}

function formatList(values: readonly string[]): string {
  return values.length ? values.join(", ") : "TBD";
}

function withoutTrailingPeriod(value: string): string {
  return value.trim().replace(/\.+$/, "");
}

function formatSchemaIssues(issues: z.ZodIssue[]): string {
  return issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "root"} ${issue.message}`)
    .join("; ");
}

function formatClaims(claims: readonly Claim[]): string {
  if (!claims.length) return "- None identified.";
  return claims
    .map(
      (claim) => {
        const qualification =
          claim.status === "blocked"
            ? "Blocked: "
            : claim.status === "do_not_use"
              ? "Do not use: "
              : claim.status === "missing"
                ? "Missing evidence: "
                : claim.status === "assumption"
                  ? "Assumption: "
                  : "";
        return `- ${qualification}${claim.claim.replace(/\s+/g, " ").trim()} (${claim.status}${claim.source ? `, source: ${claim.source}` : ""})`;
      },
    )
    .join("\n");
}

function formatEvidenceSectionClaims(claims: readonly Claim[]): string {
  return formatClaims(claims)
    .replace(/\bsource_supplied\b/gi, "source supplied")
    .replace(/\bconnected_read_only\b/gi, "connected read only")
    .replace(/\blive_monitoring\b/gi, "live monitoring");
}
