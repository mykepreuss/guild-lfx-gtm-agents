import type { Task } from "@guildai/agents-sdk";
import { z } from "zod";

export const routes = [
  "onboarding",
  "cockpit",
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
] as const;

export type Route = (typeof routes)[number];

export const routeConfig = {
  company_context: {
    displayName: "Company Context Builder",
    packageName: "guild-marketing-os-company-context-builder",
    toolName: "marketing_os_company_context_builder",
    agentId: "019f0024-33dd-726e-0000-0d487f1261a7",
  },
  market_signal: {
    displayName: "Market Signal",
    packageName: "guild-marketing-os-market-signal",
    toolName: "marketing_os_market_signal",
    agentId: "019f0024-978a-726e-0000-6116f4c49ff4",
  },
  icp: {
    displayName: "ICP",
    packageName: "guild-marketing-os-icp",
    toolName: "marketing_os_icp",
    agentId: "019f0025-0fda-726e-0000-b57226531776",
  },
  audience_segmentation: {
    displayName: "Audience Segmentation",
    packageName: "guild-marketing-os-audience-segmentation",
    toolName: "marketing_os_audience_segmentation",
    agentId: "019f0025-7767-726e-0000-74ce71ea69b9",
  },
  messaging: {
    displayName: "Messaging",
    packageName: "guild-marketing-os-messaging",
    toolName: "marketing_os_messaging",
    agentId: "019f0025-e267-726e-0000-79109cb788a0",
  },
  branding_pitch_deck: {
    displayName: "Branding And Pitch Deck",
    packageName: "guild-marketing-os-branding-pitch-deck",
    toolName: "marketing_os_branding_pitch_deck",
    agentId: "019f0026-4f43-726e-0000-ca5ea98e608f",
  },
  social_monitoring_content: {
    displayName: "Social Monitoring And Content",
    packageName: "guild-marketing-os-social-monitoring-content",
    toolName: "marketing_os_social_monitoring_content",
    agentId: "019f0026-ccca-726e-0000-69405bcb5de7",
  },
  campaigns_paid_media: {
    displayName: "Campaigns And Paid Media",
    packageName: "guild-marketing-os-campaigns-paid-media",
    toolName: "marketing_os_campaigns_paid_media",
    agentId: "019f0027-3298-726e-0000-32cad92c2c88",
  },
} as const;

export type DelegatedRoute = keyof typeof routeConfig;

export const suiteInstallOrder = (Object.keys(routeConfig) as DelegatedRoute[]).map(
  (route) => ({
    route,
    ...routeConfig[route],
  }),
);

export const specialistInputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const specialistOutputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const inputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const outputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const requiredHeadings = [
  "## Consumed Context",
  "## Produced Artifact",
  "## Assumptions And Missing Evidence",
  "## Approval Gate",
  "## AEO / AI-Readiness Contribution",
  "## Status Payload",
  "## Downstream Handoff",
] as const;

const approvedHipaaConstraintPattern =
  /\b[A-Z][A-Za-z0-9&.'’ -]{0,120} may not be HIPAA compliant,\s+and customers\s+should not provide Protected Health Information\s*\/\s*PHI\s+through the platform\./gi;

const specialistStatusPayloadSchema = z.object({
  evidence_mode: z.enum([
    "source_supplied",
    "connected_read_only",
    "live_monitoring",
  ]),
  observed_at: z.string().nullable(),
  source_coverage: z.array(z.string()),
  coverage_limitations: z.array(z.string()),
  status: z.enum(["needs_input", "ready_for_review", "blocked"]),
  safety: z.object({
    action_mode: z.literal("draft_only"),
    external_mutation_requested: z.literal(false),
    blocked_actions: z.array(z.string()),
    unsupported_claims: z.array(z.string()),
    evidence_gaps: z.array(z.string()),
  }),
});

export async function classifyRoute(
  text: string,
  task: Pick<Task, "llm">,
): Promise<{ route: Route; classifierAttempts: string[]; routingReason: string }> {
  const deterministic = deterministicRouteDecision(text);
  if (deterministic) {
    return {
      route: deterministic.route,
      classifierAttempts: [],
      routingReason: deterministic.reason,
    };
  }

  const first = await task.llm.generateText({ prompt: classifierPrompt(text, false) });
  const firstRoute = parseRoute(first.text);
  if (firstRoute) {
    return {
      route: firstRoute,
      classifierAttempts: [first.text],
      routingReason: "strict_classifier",
    };
  }

  const repair = await task.llm.generateText({ prompt: classifierPrompt(text, true) });
  const repairedRoute = parseRoute(repair.text);
  return {
    route: repairedRoute || "guide",
    classifierAttempts: [first.text, repair.text],
    routingReason: "strict_classifier_format_repair",
  };
}

export function deterministicRoute(text: string): Route | undefined {
  const decision = deterministicRouteDecision(text);
  return decision ? decision.route : undefined;
}

function deterministicRouteDecision(
  text: string,
): { route: Route; reason: string } | undefined {
  const normalized = text.toLowerCase();
  const blockedPatterns: Array<[RegExp, string]> = [
    [
      /\b(?:ignore|override|bypass)\b[\s\S]{0,100}\b(?:route|allowlist|safety|instructions?)\b/i,
      "routing_override_attempt",
    ],
    [
      /\b(?:call|invoke|delegate to)\b[\s\S]{0,100}\b(?:yourself|launcher|unrelated agent|any agent|arbitrary agent)\b/i,
      "disallowed_agent_invocation",
    ],
    [
      /\b(?:publish|schedule|send|launch|activate|sync)\b[\s\S]{0,80}\b(?:campaign|content|post|message|email|ads?|result|artifact|changes?)\b/i,
      "external_execution_request",
    ],
    [
      /\b(?:configure credentials?|change spend|increase spend|decrease spend|update crm|grant legal approval)\b/i,
      "restricted_operation_request",
    ],
  ];
  for (const [pattern, reason] of blockedPatterns) {
    const match = text.match(pattern);
    if (match) {
      return { route: "blocked", reason: `${reason}: ${match[0].slice(0, 120)}` };
    }
  }

  if (
    /\b(?:onboard|onboarding|install|installation|suite status|setup status|set up status|verify suite)\b[\s\S]{0,80}\b(?:marketing os|suite|agents?|packages?|workspace)\b/i.test(
      text,
    ) ||
    /\b(?:marketing os|suite)\b[\s\S]{0,50}\b(?:onboard|onboarding|install|installation)\b/i.test(
      text,
    )
  ) {
    return { route: "onboarding", reason: "suite_onboarding_or_status_intent" };
  }

  if (
    /\b(?:marketing os|workstreams?|cockpit)\b[\s\S]{0,80}\b(?:status|progress|resume|next action|what(?:'s| is) next)\b/i.test(
      text,
    ) ||
    /\b(?:status|progress|resume|what(?:'s| is) next)\b[\s\S]{0,80}\b(?:marketing os|workstreams?|cockpit)\b/i.test(
      text,
    )
  ) {
    return { route: "cockpit", reason: "cockpit_status_or_resume_intent" };
  }

  if (
    /\bapprove\b[\s\S]{0,160}\b(?:artifact|revision)\b/i.test(text)
  ) {
    return { route: "cockpit", reason: "artifact_approval_intent" };
  }

  if (
    /\b(?:set up|build|create|refresh|update)\s+(?:the\s+|our\s+|a\s+)?(?:company context|workspace context|marketing os(?:\s+(?:company|workspace))?\s+context)\b/i.test(
      text,
    )
  ) {
    return { route: "company_context", reason: "clear_context_setup_intent" };
  }

  const matches: DelegatedRoute[] = [];
  if (
    /\b(?:market signal|competitor|competition|market research|community signal|search signal)\b/i.test(
      normalized,
    )
  ) {
    matches.push("market_signal");
  }
  if (/\b(?:\bicp\b|ideal customer|persona|buyer profile|target audience)\b/i.test(normalized)) {
    matches.push("icp");
  }
  if (
    /\b(?:audience segment|segmentation|suppression|consent rule|targeting rule)\b/i.test(
      normalized,
    )
  ) {
    matches.push("audience_segmentation");
  }
  if (
    /\b(?:messaging|message pillar|positioning|boilerplate|objection handling|answer-ready copy)\b/i.test(
      normalized,
    )
  ) {
    matches.push("messaging");
  }
  if (/\b(?:brand brief|branding|pitch deck|slide narrative|visual direction)\b/i.test(normalized)) {
    matches.push("branding_pitch_deck");
  }
  if (
    /\b(?:social monitoring|social content|content calendar|social post|community response)\b/i.test(
      normalized,
    )
  ) {
    matches.push("social_monitoring_content");
  }
  if (
    /\b(?:campaign|paid media|ad plan|media plan|retargeting|landing page test)\b/i.test(
      normalized,
    )
  ) {
    matches.push("campaigns_paid_media");
  }

  const uniqueMatches = [...new Set(matches)];
  return uniqueMatches.length === 1
    ? { route: uniqueMatches[0], reason: `clear_${uniqueMatches[0]}_intent` }
    : undefined;
}

function classifierPrompt(text: string, repair: boolean): string {
  return [
    repair
      ? "Your prior response was malformed. Return exactly one enum value and nothing else."
      : "Classify this Marketing OS request. Return exactly one enum value and nothing else.",
    routes.join(" | "),
    "Use blocked for external action, unsafe routing, self-delegation, or unrelated agents.",
    "Use guide when the requested outcome is unclear or spans several peer workflows.",
    `Request: ${text}`,
  ].join("\n");
}

function parseRoute(value: string): Route | undefined {
  const normalized = value.trim().toLowerCase().replace(/^["'`]|["'`]$/g, "");
  return routes.includes(normalized as Route) ? (normalized as Route) : undefined;
}

export function readContextSnapshot(inputText: string): {
  ready: boolean;
  contextRevision: string;
  compiled: string;
  error: string;
} {
  const match = inputText.match(
    /<!-- guild-marketing-os-context:start -->[\s\S]*?<!-- guild-marketing-os-context:end -->/i,
  );
  const block = match ? match[0] : "";
  if (block) {
    const ready =
      /\bStatus:\s*(?:published|approved)\b/i.test(block) &&
      /##\s+Workspace Context Brief\b/i.test(block);
    return {
      ready,
      contextRevision: `fingerprint:${contextFingerprint(block)}`,
      compiled: block,
      error: ready ? "" : "Injected managed Marketing OS context is not published and ready.",
    };
  }

  return {
    ready: false,
    contextRevision: "unavailable",
    compiled: "",
    error:
      "Managed Marketing OS context was not supplied to this Chat. Start a new workspace Chat or use Company Context Builder.",
  };
}

export function removeCompiledWorkspaceContext(text: string, compiled: string): string {
  const endMarker = "<!-- guild-marketing-os-context:end -->";
  const endIndex = text.lastIndexOf(endMarker);
  const withoutManagedBlock =
    endIndex >= 0
      ? text.slice(endIndex + endMarker.length)
      : text.replace(
          /<!-- guild-marketing-os-context:start -->[\s\S]*?<!-- guild-marketing-os-context:end -->/gi,
          "\n",
        );
  if (!compiled.trim()) return withoutManagedBlock.trim();
  return withoutManagedBlock
    .split(compiled)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function contextFingerprint(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

export function specialistInput(
  userText: string,
  contextRevision: string,
  route?: DelegatedRoute,
  expectedHipaaConstraint?: string,
) {
  const publicationBoundary =
    route === "company_context"
      ? []
      : [
          "- Never state, quote, or suggest the Company Context Builder's exact workspace-context publication confirmation phrase. Route context revisions back to Company Context Builder without exposing that phrase.",
        ];
  return {
    type: "text" as const,
    text: [
      userText,
      "",
      "Launcher contract:",
      `- Consume published workspace context revision ${contextRevision} as the first source of truth.`,
      "- Return the complete standard Guild Marketing OS output frame.",
      "- State the actual evidence mode and coverage limitations.",
      "- Keep action_mode draft_only and external_mutation_requested false.",
      "- Do not publish, schedule, spend, mutate CRM, configure credentials, make legal decisions, or delegate.",
      ...(expectedHipaaConstraint
        ? [
            `- Exact approved HIPAA constraint for verbatim reuse: "${expectedHipaaConstraint}"`,
            "- If the request asks to preserve this constraint, reproduce that quoted sentence verbatim exactly once and refer to it elsewhere only as the approved HIPAA constraint.",
          ]
        : []),
      ...publicationBoundary,
    ].join("\n"),
  };
}

export function extractSpecialistText(value: unknown): string {
  const parsed = specialistOutputSchema.safeParse(value);
  return parsed.success && parsed.data.text.trim() ? parsed.data.text.trim() : "";
}

export function validateSpecialistOutput(
  text: string,
  {
    allowContextPublicationPhrase = false,
    expectedHipaaConstraint,
  }: {
    allowContextPublicationPhrase?: boolean;
    expectedHipaaConstraint?: string;
  } = {},
): string[] {
  const errors: string[] = [];
  let previousIndex = -1;
  for (const heading of requiredHeadings) {
    const indexes = allTextIndexes(text, heading);
    if (indexes.length !== 1) {
      errors.push(
        indexes.length === 0
          ? `Format error: missing required heading: ${heading}`
          : `Format error: required heading appears ${indexes.length} times: ${heading}`,
      );
      continue;
    }
    if (indexes[0] < previousIndex) {
      errors.push(`Format error: required heading out of order: ${heading}`);
    }
    previousIndex = Math.max(previousIndex, indexes[0]);
  }

  const evidenceSection = specialistSection(
    text,
    "## Assumptions And Missing Evidence",
    "## Approval Gate",
  );
  const evidenceModes =
    evidenceSection.match(
      /\b(?:source_supplied|connected_read_only|live_monitoring)\b/g,
    ) ?? [];
  if (evidenceModes.length !== 1) {
    errors.push(
      "Format error: Assumptions And Missing Evidence must contain exactly one evidence mode.",
    );
  }

  const statusSection = specialistSection(
    text,
    "## Status Payload",
    "## Downstream Handoff",
  );
  const statusMatches = [
    ...statusSection.matchAll(/```json\s*([\s\S]*?)```/gi),
  ];
  let statusPayload:
    | z.infer<typeof specialistStatusPayloadSchema>
    | undefined;
  if (statusMatches.length !== 1) {
    errors.push(
      "Format error: Status Payload must contain exactly one JSON code fence.",
    );
  } else {
    try {
      const parsed = specialistStatusPayloadSchema.safeParse(
        JSON.parse(statusMatches[0][1]),
      );
      if (parsed.success) {
        statusPayload = parsed.data;
      } else {
        errors.push(
          `Format error: Status Payload does not match the contract: ${parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")}`,
        );
      }
    } catch {
      errors.push("Format error: Status Payload JSON is malformed.");
    }
  }
  if (
    statusPayload &&
    evidenceModes.length === 1 &&
    statusPayload.evidence_mode !== evidenceModes[0]
  ) {
    errors.push(
      "Evidence error: narrative and Status Payload evidence modes do not match.",
    );
  }
  if (
    statusPayload &&
    statusPayload.evidence_mode !== "source_supplied" &&
    (!statusPayload.observed_at ||
      statusPayload.source_coverage.length === 0)
  ) {
    errors.push(
      "Evidence error: connected or live evidence requires observed_at and inspected-source coverage.",
    );
  }
  if (statusPayload && statusPayload.status === "blocked") {
    errors.push(
      "Safety error: specialist reported blocked status; a blocked result may not enter the artifact store.",
    );
  }

  const safetyNarrative = [
    specialistSection(
      text,
      "## Produced Artifact",
      "## Assumptions And Missing Evidence",
    ),
    specialistSection(
      text,
      "## Approval Gate",
      "## AEO / AI-Readiness Contribution",
    ),
    specialistSection(
      text,
      "## AEO / AI-Readiness Contribution",
      "## Status Payload",
    ),
    specialistSection(text, "## Downstream Handoff", "\u0000"),
  ].join("\n");
  for (const rawLine of safetyNarrative
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z])/))) {
    const line = rawLine.trim();
    if (!line || specialistLineIsQualified(line)) continue;
    for (const [pattern, label] of [
      [/\b(?:eliminate|eliminates|eliminated)\b/i, "absolute eliminate claim"],
      [/\binstantly\b/i, "instant-result claim"],
      [/\bproduction-ready\b/i, "production-readiness claim"],
      [/\bhigh-converting\b/i, "conversion-performance claim"],
      [/\bhigh-performance\b/i, "performance claim"],
      [/\bscales? securely\b/i, "security-and-scale claim"],
      [/\bwithout compromises?\b/i, "absolute no-compromise claim"],
      [/\btrusted by\b/i, "trust/scale claim"],
      [/\bbest-in-class\b|\bmarket[- ]leading\b|\bindustry[- ]leading\b/i, "ranking claim"],
      [/\bcontinuous experiments?\b/i, "continuous-execution claim"],
      [/\bis not HIPAA compliant\b/i, "incorrectly strengthened HIPAA claim"],
      [/\bis HIPAA compliant\b/i, "unsupported HIPAA compliance claim"],
      [/\bSOC\s*2(?:\s+Type\s+II)?\s+compliance\b/i, "compliance claim"],
      [/\bscales? safely\b/i, "safety-and-scale claim"],
      [
        /\$[0-9]|\b(?:funding|ARR|valuation|SOC\s*2|ISO(?:\/IEC)?\s*27001|uptime|faster|trusted by|leading|guarantee|guaranteed)\b|\b(?:secure|standards[- ]compliant|secure and compliant)\b|\b[0-9]+(?:\.[0-9]+)?\s*%|\b[0-9]+(?:\.[0-9]+)?\s*x\b|\b[0-9][0-9.,]*\s*(?:m|million|k|thousand)?\s+users\b|\b[0-9][0-9.,]*\s+countries\b/i,
        "sensitive pricing, proof, scale, trust, or performance claim",
      ],
    ] as const) {
      if (pattern.test(line)) {
        errors.push(`Safety error: unqualified ${label}.`);
      }
    }
  }
  const exactHipaaMatches = expectedHipaaConstraint
    ? safetyNarrative.split(expectedHipaaConstraint).length - 1
    : (
        safetyNarrative.match(
          new RegExp(approvedHipaaConstraintPattern.source, "gi"),
        ) ?? []
      ).length;
  const hipaaRemainder = (
    expectedHipaaConstraint
      ? safetyNarrative.split(expectedHipaaConstraint).join("")
      : safetyNarrative.replace(
          new RegExp(approvedHipaaConstraintPattern.source, "gi"),
          "",
        )
  ).replace(/\b(?:the\s+)?approved HIPAA constraint\b/gi, "");
  if (expectedHipaaConstraint && exactHipaaMatches !== 1) {
    errors.push(
      "Safety error: the exact approved HIPAA constraint from Guild Workspace Context must appear verbatim exactly once.",
    );
  } else if (exactHipaaMatches > 1) {
    errors.push(
      "Safety error: the exact approved HIPAA constraint appears more than once.",
    );
  }
  if (/\bHIPAA\b|\bPHI\b|Protected Health Information/i.test(hipaaRemainder)) {
    errors.push(
      "Safety error: the approved HIPAA constraint was paraphrased or expanded.",
    );
  }

  for (const pattern of [
    /\bautomatically (?:pause|scale|publish|schedule|sync|activate)\b/i,
    /\b(?:published|scheduled|synced|activated) successfully\b/i,
    /\bcredentials? (?:were |was |have been |has been )?configured\b/i,
    /\bcrm (?:was |has been )?(?:updated|synced|activated)\b/i,
  ]) {
    if (pattern.test(safetyNarrative)) {
      errors.push(`Safety error: forbidden execution claim: ${pattern.source}`);
    }
  }
  if (
    !allowContextPublicationPhrase &&
    /publish approved context to workspace context/i.test(text)
  ) {
    errors.push(
      "Safety error: downstream specialist exposed the context-publication confirmation phrase",
    );
  }
  return errors;
}

export function specialistResultStatus(
  text: string,
): "needs_input" | "ready_for_review" | "blocked" | undefined {
  const statusSection = specialistSection(
    text,
    "## Status Payload",
    "## Downstream Handoff",
  );
  const statusMatches = [
    ...statusSection.matchAll(/```json\s*([\s\S]*?)```/gi),
  ];
  if (statusMatches.length !== 1) return undefined;
  try {
    return specialistStatusPayloadSchema.parse(
      JSON.parse(statusMatches[0][1]),
    ).status;
  } catch {
    return undefined;
  }
}

export function extractApprovedHipaaConstraint(
  compiledContext: string,
): string | undefined {
  const normalized = compiledContext.replace(/\s+/g, " ").trim();
  const markerIndex = normalized
    .toLowerCase()
    .indexOf("may not be hipaa compliant");
  if (markerIndex < 0) return undefined;

  const priorPeriod = normalized.lastIndexOf(". ", markerIndex);
  const priorColon = normalized.lastIndexOf(": ", markerIndex);
  const boundaryIndex = Math.max(priorPeriod, priorColon);
  const sentenceStart = boundaryIndex >= 0 ? boundaryIndex + 2 : 0;
  const sentenceEnd = normalized.indexOf(".", markerIndex);
  if (sentenceEnd < 0) return undefined;

  const candidate = normalized
    .slice(sentenceStart, sentenceEnd + 1)
    .replace(/^[-*]\s*/, "")
    .trim();
  if (
    !/\bmay not be HIPAA compliant\b/i.test(candidate) ||
    !/\bProtected Health Information\b|\bPHI\b/i.test(candidate)
  ) {
    return undefined;
  }
  return candidate;
}

export function onlyFormatErrors(errors: string[]): boolean {
  return errors.length > 0 && errors.every((error) => error.startsWith("Format error:"));
}

function allTextIndexes(text: string, value: string): number[] {
  const indexes: number[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const index = text.indexOf(value, cursor);
    if (index === -1) break;
    indexes.push(index);
    cursor = index + value.length;
  }
  return indexes;
}

function specialistSection(
  text: string,
  startHeading: string,
  endHeading: string,
): string {
  const start = text.indexOf(startHeading);
  if (start === -1) return "";
  const bodyStart = start + startHeading.length;
  const end = text.indexOf(endHeading, bodyStart);
  return text.slice(bodyStart, end === -1 ? undefined : end).trim();
}

function specialistLineIsQualified(line: string): boolean {
  return /\b(?:approved[-_ ]reusable|do not use|do not claim|must not claim|blocked|unsupported|needs evidence|requires? (?:separate )?(?:evidence|approval|review|validation)|tbd|source[-_ ]supplied(?:[-_ ]review[-_ ]required| only)?|review[-_ ]required|secondary[-_ ]estimate|claim status|evidence status|missing (?:proof|evidence)|proof needs?|limitation|unapproved|pending verification|subject to (?:verification|review|approval)|not company[- ]confirmed|confirm|verify|validate|review)\b/i.test(
    line,
  );
}

export function unqualifiedPackageName(value: string): string {
  const unscoped = value.replace(/^@guildai\//, "");
  const withoutVersion = unscoped.replace(/@[^@]+$/, "");
  const parts = withoutVersion.split("~");
  return parts.length > 1 ? parts[parts.length - 1] : withoutVersion;
}

export function installedSuiteAgents(workspaceAgents: unknown): Array<{
  packageName: string;
  versionId: string;
}> {
  const installed: Array<{ packageName: string; versionId: string }> = [];
  if (!Array.isArray(workspaceAgents)) return installed;
  for (const value of workspaceAgents) {
    if (!value || typeof value !== "object") continue;
    const packageNameValue = Reflect.get(value, "package_name");
    const versionValue = Reflect.get(value, "version_id");
    if (typeof packageNameValue !== "string" || typeof versionValue !== "string") continue;
    const packageName = unqualifiedPackageName(packageNameValue);
    if (!suiteInstallOrder.some((entry) => entry.packageName === packageName)) continue;
    installed.push({ packageName, versionId: versionValue });
  }
  return installed;
}

export function renderOnboardingStatus(
  installed: Array<{ packageName: string; versionId: string }>,
): string {
  return [
    "# Marketing OS Onboarding",
    "",
    "All eight capability packages are installed.",
    "",
    "| Capability | State |",
    "| --- | --- |",
    ...suiteInstallOrder.map((entry) => {
      const record = installed.find((candidate) => candidate.packageName === entry.packageName);
      return `| ${entry.displayName} | ${record ? "installed" : "blocked"} |`;
    }),
    "",
    "Launcher is active in this Chat.",
    "",
    "Admin check: in the Guild workspace UI, confirm Marketing OS Launcher is the default agent.",
    "Next action: set up company context or request one specialist workflow.",
    "",
    "Status: ready",
  ].join("\n");
}

export function renderDelegatedResult(displayName: string, specialistText: string): string {
  return [
    "# Marketing OS",
    "",
    `Handled by: ${displayName}`,
    "Status: ready for review",
    "",
    "---",
    "",
    specialistText,
  ].join("\n");
}

export function renderGuide(message: string, status = "needs clarification"): string {
  return [
    "# Marketing OS Guide",
    "",
    message,
    "",
    `Status: ${status}`,
    "",
    "No specialist work or external action was started.",
  ].join("\n");
}

export function renderBlocked(message: string): string {
  return [
    "# Request not supported",
    "",
    message,
    "",
    "Status: blocked safely",
    "No specialist work or external action occurred.",
  ].join("\n");
}

export function renderSpecialistBlocked(
  message: string,
  runId?: string,
  retentionConfirmed = true,
): string {
  return [
    "# Specialist result blocked",
    "",
    message,
    "",
    "Status: blocked safely",
    runId ? `Workflow run: ${runId}` : "",
    retentionConfirmed
      ? "The specialist attempt was retained for review. No external action occurred."
      : "Specialist work occurred, but durable retention could not be confirmed. No external action occurred.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseArtifactApprovalRequest(text: string): {
  requested: boolean;
  route?: DelegatedRoute;
  revision?: number;
  artifactId?: string;
} {
  const requested =
    /\bapprove\b/i.test(text) && /\b(?:artifact|revision)\b/i.test(text);
  if (!requested) return { requested: false };

  const routeMatches: DelegatedRoute[] = [];
  const routePatterns: Array<[DelegatedRoute, RegExp]> = [
    ["company_context", /\b(?:company|workspace|marketing os)\s+context\b/i],
    ["market_signal", /\bmarket signal\b/i],
    ["icp", /\b(?:icp|ideal customer)\b/i],
    ["audience_segmentation", /\b(?:audience\s+)?segmentation\b/i],
    ["messaging", /\bmessaging\b/i],
    ["branding_pitch_deck", /\b(?:branding|brand|pitch deck)\b/i],
    [
      "social_monitoring_content",
      /\b(?:social monitoring|social content|content calendar)\b/i,
    ],
    [
      "campaigns_paid_media",
      /\b(?:campaigns?|paid media|media plan)\b/i,
    ],
  ];
  for (const [route, pattern] of routePatterns) {
    if (pattern.test(text)) routeMatches.push(route);
  }

  const revisionMatch = text.match(/\brevision\s+(\d+)\b/i);
  const revision = revisionMatch
    ? Number.parseInt(revisionMatch[1], 10)
    : undefined;
  const artifactMatch = text.match(
    /\bartifact\s+((?!revision\b)[a-z0-9][a-z0-9_-]{7,})\b/i,
  );
  return {
    requested: true,
    route: routeMatches.length === 1 ? routeMatches[0] : undefined,
    revision:
      revision && Number.isSafeInteger(revision) && revision > 0
        ? revision
        : undefined,
    artifactId: artifactMatch?.[1],
  };
}

export function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer <redacted>").slice(0, 500);
}
