import { agent, noTools, type Task } from "@guildai/agents-sdk";
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
  "No workspace context publish.",
  "No context artifact persistence.",
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
const tools = noTools;
type Tools = typeof tools;
type AgentTask = Task<Tools>;

const requiredHeadings = [
  "## Consumed Context",
  "## Produced Artifact",
  "## Assumptions And Missing Evidence",
  "## Approval Gate",
  "## AEO / AI-Readiness Contribution",
  "## Status Payload",
  "## Downstream Handoff",
];

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
  "Approved description",
  "Company description",
  "Product description",
  "Description",
  "Primary audiences",
  "Primary audience",
  "Audiences",
  "Audience",
  "Current goals",
  "Goals",
  "Channels in scope",
  "Approved channels",
  "Channel scope",
  "Channels",
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
    "Builds a structured Guild Marketing OS context foundation by converting raw company context into typed context artifacts, approval gates, AEO readiness notes, status payloads, and downstream handoffs.",
  inputSchema,
  outputSchema,
  tools,
  async run(input: Input, task: AgentTask) {
    const rawContext = getRawContext(input);
    const conversationIntent = classifyConversationIntent(rawContext);

    if (conversationIntent === "save_state_question") {
      return finalizeOutput(buildSaveStateQuestionOutput(input));
    }

    if (conversationIntent === "approval_or_edit") {
      return finalizeOutput(buildApprovalOrEditOutput(input));
    }

    if (conversationIntent === "attachment_unreadable") {
      return finalizeOutput(buildReadableSourceNeededOutput(input, conversationIntent));
    }

    if (conversationIntent === "downstream_request_without_context") {
      return finalizeOutput(buildDownstreamWithoutContextOutput(input));
    }

    if (conversationIntent === "missing_context") {
      return finalizeOutput(buildMissingContextOutput(input));
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
    return finalizeOutput(guarded);
  },
});

async function finalizeOutput(output: Output): Promise<z.infer<typeof outputSchema>> {
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
  const rawText = input.text.trim();
  return extractEmbeddedTextInput(rawText) ?? rawText;
}

function getSourceLabels(_input: Input): string[] {
  return [];
}

function extractEmbeddedTextInput(value: string): string | undefined {
  for (const candidate of [value, fencedJson(value), firstJsonObject(value)]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (isRecord(parsed) && parsed.type === "text" && typeof parsed.text === "string") {
        return parsed.text.trim();
      }
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

function getRequestedArtifacts(_input: Input): Array<(typeof artifactValues)[number]> {
  return normalizeArtifacts(defaultRequestedArtifacts);
}

function getOperatingConstraints(_input: Input): string[] {
  return defaultConstraints;
}

function classifyConversationIntent(rawContext: string): ConversationIntent {
  if (isSaveStateQuestion(rawContext)) return "save_state_question";
  if (isApprovalOrEdit(rawContext)) return "approval_or_edit";
  if (isAttachmentUnreadableTurn(rawContext)) return "attachment_unreadable";
  if (isSparseSetupRequest(rawContext) || hasUrlOnlySource(rawContext)) return "missing_context";
  if (detectRequestedDownstreamAgent(rawContext) && !hasUsableSourceContent(rawContext)) {
    return "downstream_request_without_context";
  }
  if (!hasUsableSourceContent(rawContext)) return "missing_context";
  return "source_available";
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
    /\b(?:add|save|persist|store|publish|put|use|make)\b[\s\S]{0,120}\b(?:company context|workspace context|context)\b[\s\S]{0,120}\b(?:other agents?|downstream agents?|agents|workspace|context hub|reference|reuse)\b/i.test(rawContext) ||
    /\b(?:make|use)\s+this\s+(?:the\s+)?(?:approved\s+)?(?:company|workspace)\s+context\b/i.test(rawContext) ||
    /\bshow\s+ready-to-(?:save|publish)\s+company context block\b/i.test(rawContext);
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
  return /(?:^|\n)\s*#{1,3}\s+[A-Z][A-Za-z0-9&.\- ]{1,80}\s+(?:company|product|brand)\s+(?:profile|overview|context|brief)\b/im.test(rawContext);
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

function detectRequestedDownstreamAgent(rawContext: string): (typeof agentValues)[number] | undefined {
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
  "statusPayload": { "companyName": string, "readiness": "blocked" | "draft" | "review_ready", "nextAgents": string[], "blockers": string[], "requiredArtifacts": string[] },
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
- Always set saved_to_workspace_context and saved_to_context_artifacts to false. This agent drafts ready-to-publish blocks only; it does not persist them.
- Set drafted_in_session true when a draft artifact block is produced. Set approved_in_session true only when the user explicitly approves the draft in the current turn.
- If the Raw context only says a file or context is attached/provided but does not include readable source text, return status "blocked" and ask the user to paste the source text.
- If context is sparse, return status "blocked" or "needs_input" and mark unsupported artifacts as "blocked" or "needs_input".
- Do not draft substantive public copy, headlines, campaign messages, benefit claims, channel plans, or audience rules from sparse context.
- Do not claim publishing, scheduling, spend, CRM activation, credential setup, workspace install, trigger setup, visibility change, or external system updates happened.
- Do not claim that Guild workspace context, workspace artifacts, Context Hub files, or runtime context were saved, updated, published, installed, or persisted.
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
    "Approved description",
    "Company description",
    "Product description",
    "Description",
  ]);
  const explicitAudiences = extractListAfterLabels(rawContext, ["Primary audiences", "Primary audience", "Audiences", "Audience"]);
  const explicitGoals = extractListAfterLabels(rawContext, ["Current goals", "Goals"]);
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

  output.approvalGates = mergeApprovalGates(output.approvalGates);
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
  output.contextArtifacts.proofAndConstraints.blockedClaims = dedupeClaims(blockedClaims);
  output.claimsNeedingApproval = normalizeClaimsNeedingApproval([
    ...claimsNeedingApproval,
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

  return output;
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
        "Approved description",
        "Company description",
        "Product description",
        "Description",
        "Primary audiences",
        "Primary audience",
        "Current goals",
        "Goals",
        "Proof-backed claims or source excerpts",
        "Proof-backed claims",
        "Approved proof",
        "Proof points",
        "Evidence",
        "Channels in scope",
        "Approved channels",
        "Channel scope",
        "Channels",
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

    if (isSensitiveClaim(claim.claim)) {
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

function buildSaveStateQuestionOutput(input: Input): Output {
  const output = buildFallbackOutput(input, ["No persistence operation has been run in this agent."], "save_state_question");
  output.status = "needs_input";
  output.persistenceState = {
    drafted_in_session: true,
    approved_in_session: false,
    saved_to_workspace_context: false,
    saved_to_context_artifacts: false,
    persistence_note: "No. This is drafted in the session only. It has not been saved to Guild workspace context or Context Hub artifacts.",
  };
  output.consumedContext.used = ["User asked whether company context is saved or approved."];
  output.consumedContext.missing = ["Explicit approval", "Separate persistence step"];
  output.contextArtifacts.companyContext.status = "needs_input";
  output.contextArtifacts.companyContext.missingContext = output.consumedContext.missing;
  output.contextArtifacts.dashboardSignals.status = "needs_input";
  output.contextArtifacts.dashboardSignals.readiness = "draft";
  output.contextArtifacts.dashboardSignals.blockers = ["Session draft is not persisted."];
  output.workspaceContextDraft = "No Guild workspace context update has been saved. The current Company Context block is a session draft only.";
  output.openQuestions = [
    "Should the current draft be approved in this session?",
    "Do any claims need to be removed before a future persistence step?",
    "Which approved source should be used if a separate save/publish workflow is later authorized?",
  ];
  output.statusPayload.readiness = "draft";
  output.statusPayload.blockers = ["Not saved to workspace context.", "Not saved to Context Hub artifacts."];
  output.downstreamHandoff = [
    {
      agent: "Company Context Builder",
      receives: ["company-context"],
      reason: "Answer save-state questions directly before drafting or routing additional work.",
    },
  ];
  return output;
}

function buildApprovalOrEditOutput(input: Input): Output {
  const rawContext = getRawContext(input);
  const isEdit = /\bedit\s+company context\s*:/i.test(rawContext) || /\b(remove|delete)\b/i.test(rawContext);
  const isPersistenceRequest = isContextPersistenceRequest(rawContext);
  const bareApprovalCommand = isBareApprovalCommand(rawContext);
  const hasVisibleDraftContext = hasVisibleApprovalContext(rawContext);
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
  return output;
}

function hasVisibleApprovalContext(rawContext: string): boolean {
  return /Company Context Draft \(company-context\)|Status Payload|Guild Workspace Context Draft|Ready-To-Publish Workspace Context|Downstream Handoff Context|^Company:\s+\S/im.test(rawContext);
}

function isBareApprovalCommand(rawContext: string): boolean {
  return /^\s*(?:approve|approved|confirm|looks good|ship it)\s+(?:company context|the company context|this|it|the draft)\s*\.?\s*$/i.test(rawContext.trim());
}

function buildDownstreamWithoutContextOutput(input: Input): Output {
  const rawContext = getRawContext(input);
  const requestedAgent = detectRequestedDownstreamAgent(rawContext) ?? "Campaigns And Paid Media";
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
    saved_to_workspace_context: false,
    saved_to_context_artifacts: false,
    persistence_note:
      value?.persistence_note ??
      "Drafted in this session only. Not saved to Guild workspace context or Context Hub artifacts.",
  };
}

function isPricingOrSensitiveEdit(rawContext: string): boolean {
  return /\b(pricing|price|compliance|security|privacy|performance|production-ready|production readiness|guarantee|legal)\b/i.test(rawContext);
}

function isSensitiveClaim(claim: string): boolean {
  return /\b(pricing|price|privacy|security|secure|compliance|compliant|soc\s*2|hipaa|gdpr|retention|guarantee|guaranteed|performance|faster|conversion|revenue|arr|funding|valuation|production-ready|production readiness|uptime|availability|sla|user base|team members|countries|customer count|ranking|ranked|leading|leader|#1|best|only|benchmark|roi)\b|\b[0-9][0-9.,]*\s*(?:m|million|k|thousand)?\s+users\b|\$[0-9]/i.test(claim);
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
  return [...new Set([...values.filter(Boolean), ...defaultConstraints])];
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
  output.contextArtifacts.proofAndConstraints.constraints = scrubGuardedList(
    output.contextArtifacts.proofAndConstraints.constraints,
    defaultConstraints,
  );
  output.contextArtifacts.channelRegistry.blockedActions = scrubGuardedList(
    output.contextArtifacts.channelRegistry.blockedActions,
    defaultConstraints,
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

  output.aeoReadiness.entityClarity = scrubGuardedString(
    output.aeoReadiness.entityClarity,
    "Draft entity clarity pending approved evidence.",
  );
  output.aeoReadiness.answerReadyOpportunities = scrubGuardedList(
    output.aeoReadiness.answerReadyOpportunities,
    ["What the company is", "Who it serves", "Why it matters", "What proof supports claims"],
  );
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
    "Approved description",
    "Company description",
    "Product description",
    "Description",
  ]);
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

  const namedEntityReference = extractNamedEntityReference(rawContext);
  if (namedEntityReference) return namedEntityReference;

  const patterns = [
    /\b(?:we['’]?re|we are)\s+([A-Z][A-Za-z0-9 .&'-]{1,80})(?:[,.]|$)/i,
    /\b(?:company|brand|organization|org|product)\s+(?:called|named)\s+([A-Z][A-Za-z0-9 .&'-]{1,80})/i,
    /\b(?:company|brand|organization|org|product)\s+is\s+([A-Z][A-Za-z0-9 .&'-]{1,80})(?:[,.]|$)/i,
    /\bfor\s+([A-Z][A-Za-z0-9 .&'-]{1,80})(?:[,.]|$)/i,
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
    const match = line.match(/^#{1,3}\s+(.+?)\s+(?:company|product|brand)\s+(?:profile|overview|context|brief)\b/i);
    const value = match?.[1] ? cleanExtractedName(match[1]) : undefined;
    if (value) return value;
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
  for (const rawLine of rawContext.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^[-*]\s+/, "");
    for (const label of sortedLabels) {
      const match = line.match(new RegExp(`(?:^|[.;。]\\s*)${escapeRegExp(label)}\\s*:\\s*(.+)$`, "i"));
      const value = match?.[1] ? cleanLabeledFieldValue(match[1]) : undefined;
      if (value) return value;
    }
  }
  return undefined;
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
  const line = extractLineAfterLabels(rawContext, [
    "Proof-backed claims or source excerpts",
    "Proof-backed claims",
    "Approved proof",
    "Proof points",
    "Evidence",
  ]);
  if (!line) return [];
  return line
    .split(/;/)
    .map((value) => value.trim().replace(/[.。]+$/, "").trim())
    .filter(Boolean);
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
    "Persistence rule: this block may be published only through a separate approved Guild workspace context edit/publish lifecycle step.",
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
    "Persistence state: session draft only unless separately published to Guild workspace context.",
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
- Approved claims: ${formatInlineClaims(output.contextArtifacts.proofAndConstraints.approvedClaims)}
- Blocked or do-not-use claims: ${formatInlineClaims(output.contextArtifacts.proofAndConstraints.blockedClaims)}
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
This block has not been saved. Use it only in a separate Guild workspace context edit/publish lifecycle step after explicit approval.

### Context For Downstream Agents
\`\`\`text
${renderDownstreamHandoffContext(output)}
\`\`\`
Paste this block into a downstream agent if workspace context has not been published yet.

## Assumptions And Missing Evidence
### Approved Or User-Supplied Facts
${formatClaims(output.approvedFacts)}

### Extracted Claims
${formatClaims(output.extractedClaims)}

### Proof-Backed Claims
${formatClaims(output.proofBackedClaims)}

### Claims Needing Approval
${formatClaims(output.claimsNeedingApproval)}

### Assumptions And Missing Evidence
${formatClaims(output.assumptionsAndMissingEvidence)}

### Open Questions
${formatBulletList(output.openQuestions)}

## Approval Gate
${output.approvalGates
  .map((gate) => `- ${gate.ownerRole}: ${gate.decision} Required before: ${withoutTrailingPeriod(gate.requiredBefore)}. Status: ${gate.status}.`)
  .join("\n")}

## AEO / AI-Readiness Contribution
- Status: ${output.aeoReadiness.status}
- Entity clarity: ${output.aeoReadiness.entityClarity}
- Answer-ready opportunities: ${formatList(output.aeoReadiness.answerReadyOpportunities)}
- Missing proof: ${formatList(output.aeoReadiness.missingProof)}
- Recommended web inputs: ${formatList(output.aeoReadiness.recommendedWebInputs)}

## Status Payload
\`\`\`json
${JSON.stringify({
  ...output.statusPayload,
  conversationIntent: output.conversationIntent,
  persistenceState: output.persistenceState,
}, null, 2)}
\`\`\`

## Downstream Handoff
${output.downstreamHandoff
  .map((handoff) => `- ${handoff.agent}: receives ${handoff.receives.join(", ")}. ${handoff.reason}`)
  .join("\n")}

## Do Not Do Yet
${output.contextArtifacts.proofAndConstraints.constraints.map((constraint) => `- ${constraint}`).join("\n")}
`;
}

function renderPacketSummary(output: Omit<Output, "markdownPacket">): string {
  if (output.conversationIntent === "save_state_question") {
    return "No. This is drafted in the session only. It has not been saved to Guild workspace context or Context Hub artifacts. To make it reusable by other agents, use the Ready-To-Publish Workspace Context block in a separate approved workspace context edit/publish step, or paste the Downstream Handoff Context into a downstream agent.";
  }
  if (output.conversationIntent === "attachment_unreadable") {
    return "I can see that you tried to provide company context, but I cannot read the attachment contents in this run. Paste the relevant text or provide readable excerpts, and I will extract the company context from it. Nothing has been saved.";
  }
  if (output.conversationIntent === "downstream_request_without_context") {
    const requestedAgent = output.downstreamHandoff.find((handoff) => handoff.agent !== "Company Context Builder")?.agent ?? "the requested downstream agent";
    return `I preserved the request for ${requestedAgent}, but setup comes first. The Marketing OS needs approved company context before downstream agents should produce specialist work. Nothing has been saved.`;
  }
  if (output.conversationIntent === "approval_or_edit") {
    if (needsVisiblePriorDraftForApproval(output)) {
      return "I noted the approval or persistence request, but this run cannot see the prior company context draft. Paste the Ready-To-Publish Workspace Context block from the draft turn, or explicitly approve a separate workspace context edit/publish lifecycle step with that block. Nothing has been saved to Guild workspace context or Context Hub artifacts.";
    }
    return `${output.persistenceState.persistence_note} Nothing has been saved to Guild workspace context or Context Hub artifacts. Use the Downstream Handoff Context below for downstream agents unless a separate workspace context publish has been authorized.`;
  }
  if (output.conversationIntent === "missing_context") {
    return "I do not have enough company context yet. Reply with rough notes, pasted text, or a readable source packet; you do not need to fill out an internal schema. Nothing has been saved.";
  }
  const companyName = output.statusPayload.companyName === "TBD" ? "this company" : output.statusPayload.companyName;
  return `I found enough to draft initial company context for ${companyName}. I extracted the company entity, audience groups, product surface, proof-sensitive claims, and downstream handoffs. Nothing has been saved to Guild workspace context or Context Hub artifacts. Use the Ready-To-Publish Workspace Context block for a separate approved publish step, or paste the Downstream Handoff Context into downstream agents.`;
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

function formatInlineClaims(claims: readonly Claim[]): string {
  return claims.length ? claims.map((claim) => claim.claim).join("; ") : "TBD";
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
  return claims.map((claim) => `- ${claim.claim} (${claim.status}${claim.source ? `, source: ${claim.source}` : ""})`).join("\n");
}
