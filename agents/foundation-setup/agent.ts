import { agent, pick, textPromptNotifyEvent, userInterfaceTools, type Task } from "@guildai/agents-sdk";
import { z } from "zod";

const artifactValues = [
  "project-context",
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

const defaultRequestedArtifacts = [...artifactValues];
const defaultConstraints = [
  "No live publishing.",
  "No scheduling.",
  "No paid media spend.",
  "No CRM activation.",
  "No credential setup.",
  "No workspace install.",
  "No trigger setup.",
  "No visibility changes.",
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

const outputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  status: packetStatusSchema,
  consumedContext: z.object({
    used: z.array(z.string()),
    missing: z.array(z.string()),
    sourceLabels: z.array(z.string()),
  }),
  contextArtifacts: z.object({
    projectContext: z.object({
      status: artifactStatusSchema,
      projectName: z.string(),
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
  assumptionsAndMissingEvidence: z.array(claimSchema),
  approvalGates: z.array(approvalGateSchema),
  aeoReadiness: z.object({
    status: readinessSchema,
    entityClarity: z.string(),
    answerReadyOpportunities: z.array(z.string()),
    missingProof: z.array(z.string()),
    recommendedWebInputs: z.array(z.string()),
  }),
  statusPayload: z.object({
    projectName: z.string(),
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

const llmOutputSchema = outputSchema.omit({ type: true, text: true, markdownPacket: true }).extend({
  type: z.literal("text").optional(),
  text: z.string().optional(),
  markdownPacket: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;
type Claim = z.infer<typeof claimSchema>;
const tools = {
  ...pick(userInterfaceTools, ["ui_notify"]),
};
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

export default agent({
  identifier: "guild_marketing_os_company_context_builder",
  description:
    "Builds a structured Guild Marketing OS context foundation by converting raw company or project context into typed context artifacts, approval gates, AEO readiness notes, status payloads, and downstream handoffs.",
  inputSchema,
  outputSchema,
  tools,
  async run(input: Input, task: AgentTask) {
    const rawContext = getRawContext(input);
    const fallback = buildFallbackOutput(input, []);

    const { text } = await task.llm.generateText({
      prompt: buildExtractionPrompt(input, rawContext),
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

    const guarded = enforceDeterministicGuards(candidate, input, parseWarnings);
    const markdownPacket = renderMarkdownPacket(guarded);
    const withMarkdown = {
      ...guarded,
      type: "text" as const,
      text: markdownPacket,
      markdownPacket,
    };

    const parsedOutput = outputSchema.parse(withMarkdown);
    await notifyVisibleReviewSummary(task, renderVisibleReviewSummary(parsedOutput));
    return parsedOutput;
  },
});

async function notifyVisibleReviewSummary(task: AgentTask, text: string): Promise<void> {
  const notify = task.tools?.ui_notify;
  if (typeof notify !== "function") return;

  try {
    await notify(textPromptNotifyEvent({ type: "text", text }));
  } catch {
    // The final Markdown packet still carries the same review state when UI notifications are unavailable.
  }
}

function renderVisibleReviewSummary(output: Output): string {
  const projectName = output.statusPayload.projectName === "TBD" ? "this project" : output.statusPayload.projectName;
  const missingInputs = output.consumedContext.missing.slice(0, 5);
  const nextAgent = output.statusPayload.nextAgents[0] ?? "Messaging";

  if (output.status === "blocked") {
    return [
      `**Company context for ${projectName} needs a few inputs before it can drive the Marketing OS.**`,
      "",
      missingInputs.length ? "Missing now:" : "Review needed:",
      ...(missingInputs.length ? missingInputs.map((item) => `- ${item}`) : ["- Confirm the project description, audiences, goals, proof, and channels."]),
      "",
      "Send the missing facts or paste source material in one message, and I will draft the context packet again.",
      "",
      "Nothing has been saved, published, scheduled, or sent to another system.",
    ].join("\n");
  }

  const channelScope = output.contextArtifacts.channelRegistry.approvedChannels.length
    ? output.contextArtifacts.channelRegistry.approvedChannels
    : output.contextArtifacts.channelRegistry.channelsTbd;

  return [
    `**Draft company context for ${projectName} is ready for review.**`,
    "",
    `- Audiences: ${formatList(output.contextArtifacts.projectContext.primaryAudiences)}`,
    `- Goals: ${formatList(output.contextArtifacts.projectContext.goals)}`,
    `- Channels: ${formatList(channelScope)}`,
    `- Proof status: ${output.approvedFacts.length ? `${output.approvedFacts.length} user-supplied fact(s) captured` : "proof still needs approval"}`,
    ...(missingInputs.length ? ["", "Review gaps:", ...missingInputs.map((item) => `- ${item}`)] : []),
    "",
    "Reply with one:",
    "- `Approve company context` if the draft is safe to reuse.",
    "- `Edit company context: ...` to replace or remove facts.",
    `- \`Run ${nextAgent}\` after context is approved.`,
    "",
    "Nothing has been saved, published, scheduled, or sent to another system.",
  ].join("\n");
}

function getRawContext(input: Input): string {
  return input.text.trim();
}

function getSourceLabels(_input: Input): string[] {
  return [];
}

function getRequestedArtifacts(_input: Input): Array<(typeof artifactValues)[number]> {
  return normalizeArtifacts(defaultRequestedArtifacts);
}

function getOperatingConstraints(_input: Input): string[] {
  return defaultConstraints;
}

function buildExtractionPrompt(input: Input, rawContext: string): string {
  const sourceLabels = getSourceLabels(input);

  return `
You are the structured Guild Marketing OS Company Context Builder.

Return only valid JSON. Do not use markdown fences.

Your JSON must match this TypeScript-style shape:
{
  "status": "ready_for_review" | "needs_input" | "blocked",
  "consumedContext": { "used": string[], "missing": string[], "sourceLabels": string[] },
  "contextArtifacts": {
    "projectContext": { "status": "draft" | "needs_input" | "blocked", "projectName": string, "category": string, "primaryAudiences": string[], "goals": string[], "missingContext": string[] },
    "messagingSource": { "status": "draft" | "needs_input" | "blocked", "overview": string, "positioning": string, "proofNeeds": string[], "answerReadyLanguage": string[] },
    "brandKit": { "status": "draft" | "needs_input" | "blocked", "voice": string, "visualDirection": string, "constraints": string[] },
    "audienceSegments": [{ "status": "draft" | "needs_input" | "blocked", "name": string, "description": string, "evidenceStatus": "approved" | "user_supplied" | "assumption" | "missing" | "blocked" | "do_not_use", "missingEvidence": string[] }],
    "channelRegistry": { "status": "draft" | "needs_input" | "blocked", "approvedChannels": string[], "channelsTbd": string[], "blockedActions": string[] },
    "proofAndConstraints": { "status": "draft" | "needs_input" | "blocked", "approvedClaims": claim[], "blockedClaims": claim[], "constraints": string[] },
    "dashboardSignals": { "status": "draft" | "needs_input" | "blocked", "readiness": "blocked" | "draft" | "review_ready", "blockers": string[], "nextReviewSignals": string[] }
  },
  "workspaceContextDraft": string,
  "approvedFacts": claim[],
  "assumptionsAndMissingEvidence": claim[],
  "approvalGates": [{ "ownerRole": string, "decision": string, "requiredBefore": string, "status": "needed" | "approved" | "blocked" }],
  "aeoReadiness": { "status": "blocked" | "draft" | "review_ready", "entityClarity": string, "answerReadyOpportunities": string[], "missingProof": string[], "recommendedWebInputs": string[] },
  "statusPayload": { "projectName": string, "readiness": "blocked" | "draft" | "review_ready", "nextAgents": string[], "blockers": string[], "requiredArtifacts": string[] },
  "downstreamHandoff": [{ "agent": string, "receives": string[], "reason": string }],
  "markdownPacket": string
}

Valid downstream agent names are: ${agentValues.join(", ")}.
Valid artifact names are: ${artifactValues.join(", ")}.
Valid claim statuses are: approved, user_supplied, assumption, missing, blocked, do_not_use.

Rules:
- Do not invent customer-specific facts, metrics, audience counts, connected systems, legal constraints, or performance results.
- If context is sparse, return status "blocked" or "needs_input" and mark unsupported artifacts as "blocked" or "needs_input".
- Do not draft substantive public copy, headlines, campaign messages, benefit claims, channel plans, or audience rules from sparse context.
- Do not claim publishing, scheduling, spend, CRM activation, credential setup, workspace install, trigger setup, visibility change, or external system updates happened.
- Keep legal, trademark, privacy, security, compliance, pricing, guarantee, and performance claims behind approved evidence and human review.
- Use review verbs such as draft, recommend, plan, prepare, or propose.
- Separate approved facts, user-supplied facts, assumptions, missing evidence, blocked claims, and do-not-use claims.
- AEO outputs must distinguish answer-ready recommendations from deployed web/schema/metadata changes.
- The runtime renders markdownPacket deterministically, so markdownPacket may be an empty string if the structured fields are complete.

Project name hint:
${extractProjectName(rawContext) ?? "TBD"}

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

function enforceDeterministicGuards(output: Output, input: Input, parseWarnings: string[]): Output {
  const rawContext = getRawContext(input);
  const explicitProjectName = extractProjectName(rawContext);
  const explicitDescription = extractLineAfterLabels(rawContext, [
    "Approved description",
    "Company description",
    "Project description",
    "Product description",
    "Description",
  ]);
  const explicitAudiences = extractListAfterLabels(rawContext, ["Primary audiences", "Primary audience", "Audiences", "Audience"]);
  const explicitGoals = extractListAfterLabels(rawContext, ["Current goals", "Project goals", "Goals"]);
  const explicitChannels = extractListAfterLabels(rawContext, ["Channels in scope", "Approved channels", "Channel scope", "Channels"]);
  const blockers = new Set(output.statusPayload.blockers);
  const missing = new Set(output.consumedContext.missing);
  const blockedClaims = [...output.contextArtifacts.proofAndConstraints.blockedClaims];
  const assumptionsAndMissingEvidence = [...output.assumptionsAndMissingEvidence];

  if (parseWarnings.length > 0 && isSparse(rawContext)) {
    blockers.add("Structured extraction needs more source context.");
  }

  if (explicitProjectName) {
    output.contextArtifacts.projectContext.projectName = explicitProjectName;
    output.statusPayload.projectName = explicitProjectName;
    missing.delete("Project name");
    addUserSuppliedClaim(output.approvedFacts, `Project name: ${explicitProjectName}`);
    addUserSuppliedClaim(output.contextArtifacts.proofAndConstraints.approvedClaims, `Project name: ${explicitProjectName}`);
  }

  if (explicitDescription) {
    output.contextArtifacts.messagingSource.overview = explicitDescription;
    missing.delete("Approved description");
    addUserSuppliedClaim(output.approvedFacts, explicitDescription);
    addUserSuppliedClaim(output.contextArtifacts.proofAndConstraints.approvedClaims, explicitDescription);
  }

  if (explicitAudiences.length > 0) {
    output.contextArtifacts.projectContext.primaryAudiences = explicitAudiences;
    missing.delete("Primary audience");
    missing.delete("Primary audiences");
  }

  if (explicitGoals.length > 0) {
    output.contextArtifacts.projectContext.goals = explicitGoals;
    missing.delete("Project goals");
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
    addUserSuppliedClaim(output.approvedFacts, fact);
    addUserSuppliedClaim(output.contextArtifacts.proofAndConstraints.approvedClaims, fact);
  }

  if (explicitProjectName && (output.workspaceContextDraft.includes("Project: TBD") || output.workspaceContextDraft.includes("Project: teams"))) {
    output.workspaceContextDraft = renderWorkspaceContextDraft(explicitProjectName, output.statusPayload.readiness);
  }

  if (isSparse(rawContext)) {
    blockers.add("Business context is too sparse for substantive public marketing strategy.");
    missing.add("Project name");
    missing.add("Approved description");
    missing.add("Primary audience");
    missing.add("Proof-backed claims");
    output.status = "blocked";
    output.contextArtifacts.projectContext.status = "blocked";
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
  output.approvedFacts = factNormalization.approved;
  output.contextArtifacts.proofAndConstraints.approvedClaims = proofNormalization.approved;
  assumptionsAndMissingEvidence.push(...factNormalization.downgraded, ...proofNormalization.downgraded);

  if (!hasExplicitApprovedChannelScope(rawContext)) {
    const channelsTbd = new Set([...output.contextArtifacts.channelRegistry.channelsTbd, ...output.contextArtifacts.channelRegistry.approvedChannels]);
    output.contextArtifacts.channelRegistry.approvedChannels = [];
    output.contextArtifacts.channelRegistry.channelsTbd = [...channelsTbd];
    if (channelsTbd.size) {
      missing.add("Approved channel scope");
    }
  }

  if (!hasApprovedProofEvidence(rawContext)) {
    missing.add("Proof-backed claims");
    output.contextArtifacts.messagingSource.status = "needs_input";
    output.contextArtifacts.messagingSource.overview = "TBD. Requires an approved project description and proof-backed claims.";
    output.contextArtifacts.messagingSource.positioning = "TBD. Requires approved category, audience, problem, promise, differentiation, and proof.";
    output.contextArtifacts.messagingSource.answerReadyLanguage = [];
    output.contextArtifacts.messagingSource.proofNeeds = [
      ...new Set([
        ...output.contextArtifacts.messagingSource.proofNeeds,
        "Approved project description",
        "Approved proof points",
        "Do-not-use claims",
      ]),
    ];
    output.aeoReadiness.status = output.aeoReadiness.status === "blocked" ? "blocked" : "draft";
    output.aeoReadiness.answerReadyOpportunities = [
      "What the project is",
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
      output.status = "blocked";
      output.statusPayload.readiness = "blocked";
    }
  }

  output.approvalGates = mergeApprovalGates(output.approvalGates);
  output.assumptionsAndMissingEvidence = dedupeClaims(assumptionsAndMissingEvidence);
  output.consumedContext.missing = [...missing];
  output.contextArtifacts.projectContext.missingContext = [...missing];
  output.contextArtifacts.proofAndConstraints.blockedClaims = dedupeClaims(blockedClaims);
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
    output.downstreamHandoff = [
      {
        agent: "Market Signal",
        receives: ["project-context", "proof-and-constraints", "dashboard-signals"],
        reason: "Review external source scope only after the project foundation is approved.",
      },
    ];
  }

  if (output.status !== "blocked" && hasOpenContextGaps(output)) {
    output.status = "needs_input";
    if (output.statusPayload.readiness === "review_ready") output.statusPayload.readiness = "draft";
    if (output.aeoReadiness.status === "review_ready") output.aeoReadiness.status = "draft";
    if (output.contextArtifacts.dashboardSignals.readiness === "review_ready") output.contextArtifacts.dashboardSignals.readiness = "draft";
  }

  return output;
}

function isSparse(rawContext: string): boolean {
  const normalized = rawContext.toLowerCase();
  const wordCount = rawContext.split(/\s+/).filter(Boolean).length;
  return wordCount < 12 || sparseMarkers.some((marker) => normalized.includes(marker));
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
    "project": "project-context",
    "project-context": "project-context",
    "projectcontext": "project-context",
    "context": "project-context",
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

function normalizeApprovedClaims(claims: Claim[], rawContext: string): { approved: Claim[]; downgraded: Claim[] } {
  const approved: Claim[] = [];
  const downgraded: Claim[] = [];

  for (const claim of claims) {
    if (claim.status !== "approved" && claim.status !== "user_supplied") {
      downgraded.push(claim);
      continue;
    }

    if (isGroundedInInput(claim.claim, rawContext)) {
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

  return { approved: dedupeClaims(approved), downgraded: dedupeClaims(downgraded) };
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
      ownerRole: "Project Leader",
      decision: "Approve project identity, goals, and primary audiences.",
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
    output.contextArtifacts.projectContext.missingContext.length > 0 ||
    output.contextArtifacts.channelRegistry.approvedChannels.length === 0
  );
}

function buildFallbackOutput(input: Input, blockers: string[]): Output {
  const rawContext = getRawContext(input);
  const projectName = extractProjectName(rawContext) ?? "TBD";
  const approvedDescription = extractLineAfterLabels(rawContext, [
    "Approved description",
    "Company description",
    "Project description",
    "Product description",
    "Description",
  ]);
  const primaryAudiences = extractListAfterLabels(rawContext, ["Primary audiences", "Primary audience", "Audiences", "Audience"]);
  const goals = extractListAfterLabels(rawContext, ["Current goals", "Project goals", "Goals"]);
  const approvedChannels = hasExplicitApprovedChannelScope(rawContext)
    ? extractListAfterLabels(rawContext, ["Channels in scope", "Approved channels", "Channel scope", "Channels"])
    : [];
  const userSuppliedFacts = dedupeClaims([
    ...(projectName !== "TBD" ? [userSuppliedClaim(`Project name: ${projectName}`)] : []),
    ...(approvedDescription ? [userSuppliedClaim(approvedDescription)] : []),
    ...extractProofFacts(rawContext).map(userSuppliedClaim),
  ]);
  const missing = inferMissingInputs(rawContext, projectName);
  const sparse = isSparse(rawContext);
  const status = sparse ? "blocked" : "needs_input";
  const readiness = sparse ? "blocked" : "draft";
  const requestedArtifacts = getRequestedArtifacts(input);
  const operatingConstraints = getOperatingConstraints(input);

  const output: Output = {
    status,
    type: "text",
    text: "",
    consumedContext: {
      used: rawContext ? ["User-provided raw context"] : [],
      missing,
      sourceLabels: getSourceLabels(input),
    },
    contextArtifacts: {
      projectContext: {
        status,
        projectName,
        category: "TBD",
        primaryAudiences: primaryAudiences.length ? primaryAudiences : ["TBD"],
        goals: goals.length ? goals : ["TBD"],
        missingContext: missing,
      },
      messagingSource: {
        status,
        overview: approvedDescription ?? "TBD. Requires approved project description and proof-backed claims.",
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
    workspaceContextDraft: renderWorkspaceContextDraft(projectName, readiness),
    approvedFacts: userSuppliedFacts,
    assumptionsAndMissingEvidence: missing.map((item) => ({
      claim: item,
      status: "missing",
      source: "context_gap",
    })),
    approvalGates: defaultApprovalGates(),
    aeoReadiness: {
      status: readiness,
      entityClarity: projectName === "TBD" ? "Blocked until the project entity is named and described." : "Draft entity clarity from user-supplied project name only.",
      answerReadyOpportunities: ["What the project is", "Who it serves", "Why it matters", "What proof supports claims"],
      missingProof: ["Approved description", "Canonical URLs", "Proof-backed claims", "Source-backed FAQ inputs"],
      recommendedWebInputs: ["Entity summary", "FAQ candidates", "Schema.org inputs", "llms.txt inputs"],
    },
    statusPayload: {
      projectName,
      readiness,
      nextAgents: ["Market Signal", "ICP", "Messaging"],
      blockers,
      requiredArtifacts: requestedArtifacts,
    },
    downstreamHandoff: [
      {
        agent: "Market Signal",
        receives: ["project-context", "channel-registry", "proof-and-constraints", "dashboard-signals"],
        reason: "Review external source scope after project identity and proof constraints are approved.",
      },
      {
        agent: "ICP",
        receives: ["project-context", "proof-and-constraints", "dashboard-signals"],
        reason: "Define target audiences once project goals and constraints are approved.",
      },
      {
        agent: "Messaging",
        receives: ["project-context", "audience-segments", "proof-and-constraints", "dashboard-signals"],
        reason: "Draft positioning and answer-ready language only after approved context exists.",
      },
    ],
    markdownPacket: "",
  };

  const markdownPacket = renderMarkdownPacket(output);
  return { ...output, text: markdownPacket, markdownPacket };
}

function inferMissingInputs(rawContext: string, projectName: string): string[] {
  const missing = new Set<string>();
  if (projectName === "TBD") missing.add("Project name");
  if (!/audience/i.test(rawContext)) missing.add("Primary audiences");
  if (!/goal/i.test(rawContext)) missing.add("Project goals");
  if (!/proof|evidence|claim/i.test(rawContext)) missing.add("Proof-backed claims");
  if (!/channel|website|social|email|paid|crm/i.test(rawContext)) missing.add("Channel scope");
  return [...missing];
}

function extractProjectName(rawContext: string): string | undefined {
  const labeledName = extractLineAfterLabels(rawContext, [
    "Project name",
    "Company name",
    "Brand name",
    "Organization name",
    "Org name",
    "Product name",
    "Project",
    "Company",
    "Brand",
    "Organization",
    "Org",
    "Product",
  ]);
  const cleanedLabeledName = labeledName ? cleanExtractedName(labeledName) : undefined;
  if (cleanedLabeledName) return cleanedLabeledName;

  const patterns = [
    /\b(?:company|project|brand|organization|org|product)\s+(?:is|called|named)\s+([A-Z][A-Za-z0-9 .&'-]{1,80})/,
    /\b(?:for|focused on|about)\s+(?:my|our|the)\s+(?:company|project|brand|organization|org|product)\s*,?\s*([A-Z][A-Za-z0-9 .&'-]{1,80})/,
    /,\s*([A-Z][A-Za-z0-9 .&'-]{1,80})\.?\s*$/,
  ];
  const value = patterns
    .map((pattern) => cleanExtractedName(rawContext.match(pattern)?.[1] ?? ""))
    .find((candidate) => candidate !== undefined);
  return value;
}

function cleanExtractedName(value: string): string | undefined {
  const cleaned = value
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+(so|to|because|that|for)\b.*$/i, "")
    .replace(/[.。]+$/, "")
    .trim();
  if (!cleaned || /^tbd$/i.test(cleaned) || isGenericExtractedName(cleaned)) return undefined;
  return cleaned;
}

function isGenericExtractedName(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return [
    "marketing os",
    "guild marketing os",
    "company context",
    "context",
    "project",
    "company",
    "teams",
    "leaders",
    "users",
    "customers",
  ].includes(normalized);
}

function extractLineAfterLabels(rawContext: string, labels: readonly string[]): string | undefined {
  const sortedLabels = [...labels].sort((a, b) => b.length - a.length);
  for (const rawLine of rawContext.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^[-*]\s+/, "");
    for (const label of sortedLabels) {
      const match = line.match(new RegExp(`^${escapeRegExp(label)}\\s*:\\s*(.+)$`, "i"));
      const value = match?.[1]?.trim().replace(/[.。]+$/, "").trim();
      if (value) return value;
    }
  }
  return undefined;
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

function renderWorkspaceContextDraft(projectName: string, readiness: string): string {
  return [
    `Project: ${projectName}`,
    `Readiness: ${readiness}`,
    "Operating rule: draft reviewable work, mark missing evidence, and keep live actions behind explicit approval.",
  ].join("\n");
}

function renderMarkdownPacket(output: Omit<Output, "markdownPacket">): string {
  return `# Company Context Approval Packet

## Consumed Context
- Used: ${formatList(output.consumedContext.used)}
- Missing: ${formatList(output.consumedContext.missing)}
- Source labels: ${formatList(output.consumedContext.sourceLabels)}

## Produced Artifact
### Project Context
- Project: ${output.contextArtifacts.projectContext.projectName}
- Status: ${output.contextArtifacts.projectContext.status}
- Category: ${output.contextArtifacts.projectContext.category}
- Audiences: ${formatList(output.contextArtifacts.projectContext.primaryAudiences)}
- Goals: ${formatList(output.contextArtifacts.projectContext.goals)}

### Approved Context Artifact Drafts
- project-context: ${output.contextArtifacts.projectContext.status}
- messaging-source: ${output.contextArtifacts.messagingSource.status}
- brand-kit: ${output.contextArtifacts.brandKit.status}
- audience-segments: ${output.contextArtifacts.audienceSegments.map((segment) => `${segment.name} (${segment.status})`).join(", ") || "TBD"}
- channel-registry: ${output.contextArtifacts.channelRegistry.status}
- proof-and-constraints: ${output.contextArtifacts.proofAndConstraints.status}
- dashboard-signals: ${output.contextArtifacts.dashboardSignals.status}

### Guild Workspace Context Draft
${output.workspaceContextDraft}

## Assumptions And Missing Evidence
${formatClaims(output.assumptionsAndMissingEvidence)}

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
${JSON.stringify(output.statusPayload, null, 2)}
\`\`\`

## Downstream Handoff
${output.downstreamHandoff
  .map((handoff) => `- ${handoff.agent}: receives ${handoff.receives.join(", ")}. ${handoff.reason}`)
  .join("\n")}

## Do Not Do Yet
${output.contextArtifacts.proofAndConstraints.constraints.map((constraint) => `- ${constraint}`).join("\n")}
`;
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
