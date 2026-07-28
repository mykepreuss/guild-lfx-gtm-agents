import {
  agent,
  callTools,
  guildAgentTool,
  guildTools,
  output,
  pick,
  type Task,
  type Tool,
  type TypedToolError,
  type TypedToolResult,
} from "@guildai/agents-sdk";
import { z } from "zod";

const routes = [
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
] as const;

type Route = (typeof routes)[number];

const routeConfig = {
  company_context: {
    displayName: "Company Context Builder",
    packageName: "guild-marketing-os-company-context-builder",
    toolName: "marketing_os_company_context_builder",
  },
  market_signal: {
    displayName: "Market Signal",
    packageName: "guild-marketing-os-market-signal",
    toolName: "marketing_os_market_signal",
  },
  icp: {
    displayName: "ICP",
    packageName: "guild-marketing-os-icp",
    toolName: "marketing_os_icp",
  },
  audience_segmentation: {
    displayName: "Audience Segmentation",
    packageName: "guild-marketing-os-audience-segmentation",
    toolName: "marketing_os_audience_segmentation",
  },
  messaging: {
    displayName: "Messaging",
    packageName: "guild-marketing-os-messaging",
    toolName: "marketing_os_messaging",
  },
  branding_pitch_deck: {
    displayName: "Branding And Pitch Deck",
    packageName: "guild-marketing-os-branding-pitch-deck",
    toolName: "marketing_os_branding_pitch_deck",
  },
  social_monitoring_content: {
    displayName: "Social Monitoring And Content",
    packageName: "guild-marketing-os-social-monitoring-content",
    toolName: "marketing_os_social_monitoring_content",
  },
  campaigns_paid_media: {
    displayName: "Campaigns And Paid Media",
    packageName: "guild-marketing-os-campaigns-paid-media",
    toolName: "marketing_os_campaigns_paid_media",
  },
} as const;

type DelegatedRoute = keyof typeof routeConfig;

// The validated coded return path remains available for a future Guild runtime
// fix, but public-facing behavior stays on the explicit Guide fallback until a
// completed specialist child reliably resumes its Launcher root task.
function sameSessionDelegationEnabled(): boolean {
  return false;
}

const suiteInstallOrder = (Object.keys(routeConfig) as DelegatedRoute[]).map((route) => ({
  route,
  ...routeConfig[route],
  agentId: {
    company_context: "019f0024-33dd-726e-0000-0d487f1261a7",
    market_signal: "019f0024-978a-726e-0000-6116f4c49ff4",
    icp: "019f0025-0fda-726e-0000-b57226531776",
    audience_segmentation: "019f0025-7767-726e-0000-74ce71ea69b9",
    messaging: "019f0025-e267-726e-0000-79109cb788a0",
    branding_pitch_deck: "019f0026-4f43-726e-0000-ca5ea98e608f",
    social_monitoring_content: "019f0026-ccca-726e-0000-69405bcb5de7",
    campaigns_paid_media: "019f0027-3298-726e-0000-32cad92c2c88",
  }[route],
}));

const requiredHeadings = [
  "## Consumed Context",
  "## Produced Artifact",
  "## Assumptions And Missing Evidence",
  "## Approval Gate",
  "## AEO / AI-Readiness Contribution",
  "## Status Payload",
  "## Downstream Handoff",
] as const;

const specialistInputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});
const specialistOutputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const inputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});
const outputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const routeAttemptSchema = z.object({
  route: z.enum(routes),
  classifier_attempts: z.array(z.string()),
  context_revision: z.string().nullable(),
  package_name: z.string().nullable(),
  version_id: z.string().nullable(),
  artifact_attempts: z.array(
    z.object({
      attempt: z.number(),
      output: z.string(),
      validation_errors: z.array(z.string()),
    }),
  ),
  routing_reason: z.string().optional(),
  status: z.enum(["running", "needs_input", "ready_for_review", "blocked", "failed"]),
  error: z.string().optional(),
  next_handoff: z.string().optional(),
});

const stateSchema = z.object({
  install_pending: z
    .object({
      agent_id: z.string(),
      package_name: z.string(),
      display_name: z.string(),
    })
    .optional(),
  pending: z
    .object({
      route: z.enum(routes),
      tool_name: z.string(),
      user_text: z.string(),
      context_revision: z.string().nullable(),
      package_name: z.string(),
      version_id: z.string(),
      format_repair_attempted: z.boolean(),
      audit: routeAttemptSchema,
    })
    .optional(),
  audit_trail: z.array(routeAttemptSchema).default([]),
});

type LauncherState = z.infer<typeof stateSchema>;

const tools: Record<string, Tool> = {
  ...pick(guildTools, [
    "guild_agent_install_request",
    "guild_get_task_workspace_agents",
  ]),
};

type Tools = typeof tools;
type LauncherTask = Task<Tools, LauncherState>;

export default agent({
  identifier: "guild_marketing_os_launcher",
  description:
    "Routes draft-only Marketing OS work to an explicit suite allowlist, returns complete specialist artifacts, and fails safely when context or a required package is unavailable.",
  inputSchema,
  outputSchema,
  stateSchema,
  tools,
  async init(task: LauncherTask) {
    await installAllowlistedWorkspaceAgentTools(task);
  },
  async start(input, task) {
    const previousState = stateSchema.parse((await task.restore()) ?? {});
    const context = await readContextSnapshot(input.text, task);
    const userText = removeCompiledWorkspaceContext(input.text, context.compiled);
    const classification = await classifyRoute(userText, task);

    if (classification.route === "blocked") {
      const audit = baseAudit(classification, context.contextRevision, null);
      audit.status = "blocked";
      audit.error =
        classification.routingReason ??
        "The request asks for an unsupported external action or attempts to override routing safety.";
      await task.save({ audit_trail: [...previousState.audit_trail, audit] });
      return output({
        type: "text",
        text: renderBlocked(
          "V1 is draft-only. Publishing, scheduling, spend, CRM mutation, credential setup, legal approval, recursive delegation, and arbitrary-agent invocation are not supported.",
          audit,
        ),
      });
    }

    if (classification.route === "guide") {
      const audit = baseAudit(classification, context.contextRevision, null);
      audit.status = "blocked";
      audit.next_handoff = "Clarify the requested Marketing OS workflow.";
      await task.save({ audit_trail: [...previousState.audit_trail, audit] });
      return output({
        type: "text",
        text: renderGuide(
          "I could not determine one safe specialist workflow. Name the desired outcome—company context, market signal, ICP, audience segmentation, messaging, brand/deck, social/content, or campaigns/paid media.",
          audit,
        ),
      });
    }

    const route = classification.route;
    if (route === "onboarding") {
      return await runOnboarding(task, previousState, classification, context.contextRevision);
    }

    const config = routeConfig[route];
    const installed = installedSuiteAgents(task);
    const installedAgent = installed.get(config.packageName);
    if (route !== "company_context" && !context.ready) {
      const audit = baseAudit(classification, context.contextRevision, installedAgent ?? null);
      audit.status = "blocked";
      audit.error = context.error ?? "Approved published Marketing OS context is missing.";
      audit.next_handoff = "Company Context Builder";
      await task.save({ audit_trail: [...previousState.audit_trail, audit] });
      return output({
        type: "text",
        text: renderGuide(
          "Approved published Marketing OS context is not ready. Use Company Context Builder first; approve the context artifact, then confirm publication with the exact required phrase.",
          audit,
        ),
      });
    }

    if (!installedAgent || !(config.toolName in tools)) {
      const audit = baseAudit(classification, context.contextRevision, null);
      audit.status = "blocked";
      audit.error = `${config.displayName} is not installed or is unavailable in this workspace.`;
      audit.next_handoff = config.displayName;
      await task.save({ audit_trail: [...previousState.audit_trail, audit] });
      return output({
        type: "text",
        text: renderGuide(
          `${config.displayName} is required but unavailable. Installation remains blocked and resumable; an administrator must approve that suite package before this route can run.`,
          audit,
        ),
      });
    }

    const audit = baseAudit(classification, context.contextRevision, installedAgent);
    if (!sameSessionDelegationEnabled()) {
      audit.status = "needs_input";
      audit.error =
        "Same-session coded delegation is disabled because the Guild root task did not reliably resume after a completed specialist child task.";
      audit.next_handoff = `Start a separate ${config.displayName} Chat.`;
      await task.save({ audit_trail: [...previousState.audit_trail, audit] });
      return output({
        type: "text",
        text: renderSpecialistGuide(
          config,
          userText,
          context.contextRevision,
          installedAgent,
          audit,
        ),
      });
    }

    const pending: NonNullable<LauncherState["pending"]> = {
      route,
      tool_name: config.toolName,
      user_text: userText,
      context_revision: context.contextRevision,
      package_name: installedAgent.packageName,
      version_id: installedAgent.versionId,
      format_repair_attempted: false,
      audit,
    };
    await task.save({ pending, audit_trail: previousState.audit_trail });

    return callTools([
      {
        type: "tool-call",
        dynamic: true,
        toolCallId: newToolCallId(),
        toolName: config.toolName,
        input: specialistInput(userText, context.contextRevision),
      },
    ]);
  },
  async onToolResults(
    results: Array<TypedToolResult<Tools> | TypedToolError<Tools>>,
    task: LauncherTask,
  ) {
    const state = stateSchema.parse((await task.restore()) ?? {});
    const pending = state.pending;
    if (!pending && state.install_pending) {
      return await finishInstallRequest(task, state, results);
    }
    if (!pending) {
      return output({
        type: "text",
        text: renderBlocked("Delegation state was missing. No specialist result was accepted.", undefined),
      });
    }

    if (results.length !== 1) {
      return await finishFailed(task, state, `Expected one specialist result, received ${results.length}.`);
    }

    const result = results[0];
    if (result.type === "tool-error") {
      return await finishFailed(task, state, `Specialist failed: ${safeError(result.error)}`);
    }
    if (result.toolName !== pending.tool_name) {
      return await finishFailed(task, state, `Unexpected tool result from ${result.toolName}.`);
    }

    const specialistText = extractSpecialistText(result.output);
    if (!specialistText) {
      return await finishFailed(task, state, "Specialist returned an empty or unsupported output.");
    }
    const validationErrors = validateSpecialistOutput(specialistText);
    pending.audit.artifact_attempts.push({
      attempt: pending.audit.artifact_attempts.length + 1,
      output: specialistText,
      validation_errors: validationErrors,
    });

    if (validationErrors.length > 0 && !pending.format_repair_attempted && onlyFormatErrors(validationErrors)) {
      pending.format_repair_attempted = true;
      await task.save({ ...state, pending });
      return callTools([
        {
          type: "tool-call",
          dynamic: true,
          toolCallId: newToolCallId(),
          toolName: pending.tool_name,
          input: specialistInput(
            [
              "FORMAT REPAIR ONLY.",
              "Preserve the substantive content from the prior attempt; do not add new claims.",
              `Repair these validation errors: ${validationErrors.join("; ")}`,
              "Return the complete corrected artifact with the seven required headings, an explicit evidence mode, and a draft-only safety envelope.",
              "",
              "Prior attempt:",
              specialistText,
            ].join("\n"),
            pending.context_revision,
          ),
        },
      ]);
    }

    if (validationErrors.length > 0) {
      return await finishFailed(
        task,
        { ...state, pending },
        `Specialist output failed validation: ${validationErrors.join("; ")}`,
      );
    }

    pending.audit.status = "ready_for_review";
    pending.audit.next_handoff = "Marketing Owner review";
    const completedAudit = clone(pending.audit);
    await task.save({
      audit_trail: [...state.audit_trail, completedAudit],
    });
    return output({
      type: "text",
      text: renderDelegatedResult(pending, specialistText),
    });
  },
});

async function installAllowlistedWorkspaceAgentTools(task: LauncherTask): Promise<void> {
  const workspaceAgents = await task.guild?.get_task_workspace_agents({});
  if (!Array.isArray(workspaceAgents)) return;

  for (const workspaceAgent of workspaceAgents) {
    const packageName = unqualifiedPackageName(workspaceAgent.package_name);
    const route = delegatedRouteForPackage(packageName);
    if (!route) continue;
    const config = routeConfig[route];
    tools[config.toolName] = guildAgentTool({
      inputSchema: specialistInputSchema,
      outputSchema: specialistOutputSchema,
      calls: `${workspaceAgent.package_name}@${workspaceAgent.version_id}`,
    });
  }
}

function installedSuiteAgents(task: LauncherTask): Map<string, { packageName: string; versionId: string }> {
  const installed = new Map<string, { packageName: string; versionId: string }>();
  for (const [toolName, tool] of Object.entries(tools)) {
    const config = Object.values(routeConfig).find((entry) => entry.toolName === toolName);
    if (!config) continue;
    const calls = tool.providerOptions?.guild?.calls;
    if (typeof calls !== "string") continue;
    const versionSeparator = calls.lastIndexOf("@");
    installed.set(config.packageName, {
      packageName: versionSeparator > 0 ? calls.slice(0, versionSeparator) : calls,
      versionId: versionSeparator > 0 ? calls.slice(versionSeparator + 1) : "unknown",
    });
  }
  return installed;
}

function delegatedRouteForPackage(packageName: string): DelegatedRoute | undefined {
  return (Object.keys(routeConfig) as DelegatedRoute[]).find(
    (route) => routeConfig[route].packageName === packageName,
  );
}

function unqualifiedPackageName(value: string): string {
  const unscoped = value.replace(/^@guildai\//, "");
  const withoutVersion = unscoped.replace(/@[^@]+$/, "");
  return withoutVersion.includes("~")
    ? withoutVersion.split("~").at(-1) ?? withoutVersion
    : withoutVersion;
}

async function classifyRoute(
  text: string,
  task: LauncherTask,
): Promise<{ route: Route; classifierAttempts: string[]; routingReason?: string }> {
  const deterministic = deterministicRouteDecision(text);
  if (deterministic) {
    return {
      route: deterministic.route,
      classifierAttempts: [],
      routingReason: deterministic.reason,
    };
  }

  const classifierAttempts: string[] = [];
  const first = await task.llm.generateText({ prompt: classifierPrompt(text, false) });
  classifierAttempts.push(first.text);
  const firstRoute = parseRoute(first.text);
  if (firstRoute) return { route: firstRoute, classifierAttempts, routingReason: "strict_classifier" };

  const repair = await task.llm.generateText({ prompt: classifierPrompt(text, true) });
  classifierAttempts.push(repair.text);
  return {
    route: parseRoute(repair.text) ?? "guide",
    classifierAttempts,
    routingReason: "strict_classifier_format_repair",
  };
}

export function deterministicRoute(text: string): Route | undefined {
  return deterministicRouteDecision(text)?.route;
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
    /\b(?:marketing os|suite)\b[\s\S]{0,50}\b(?:onboard|onboarding|install|installation|status)\b/i.test(
      text,
    )
  ) {
    return { route: "onboarding", reason: "suite_onboarding_or_status_intent" };
  }
  if (
    /\b(?:set up|build|create|refresh|update)\s+(?:the\s+|our\s+|a\s+)?(?:company context|workspace context|marketing os(?:\s+(?:company|workspace))?\s+context)\b/i.test(
      text,
    )
  ) {
    return { route: "company_context", reason: "clear_context_setup_intent" };
  }

  const matches: DelegatedRoute[] = [];
  if (/\b(?:market signal|competitor|competition|market research|community signal|search signal)\b/i.test(normalized)) matches.push("market_signal");
  if (/\b(?:\bicp\b|ideal customer|persona|buyer profile|target audience)\b/i.test(normalized)) matches.push("icp");
  if (/\b(?:audience segment|segmentation|suppression|consent rule|targeting rule)\b/i.test(normalized)) matches.push("audience_segmentation");
  if (/\b(?:messaging|message pillar|positioning|boilerplate|objection handling|answer-ready copy)\b/i.test(normalized)) matches.push("messaging");
  if (/\b(?:brand brief|branding|pitch deck|slide narrative|visual direction)\b/i.test(normalized)) matches.push("branding_pitch_deck");
  if (/\b(?:social monitoring|social content|content calendar|social post|community response)\b/i.test(normalized)) matches.push("social_monitoring_content");
  if (/\b(?:campaign|paid media|ad plan|media plan|retargeting|landing page test)\b/i.test(normalized)) matches.push("campaigns_paid_media");
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

async function readContextSnapshot(inputText: string, _task: LauncherTask): Promise<{
  ready: boolean;
  contextRevision: string | null;
  compiled: string;
  error?: string;
}> {
  const injectedManagedBlock = inputText.match(
    /<!-- guild-marketing-os-context:start -->[\s\S]*?<!-- guild-marketing-os-context:end -->/i,
  )?.[0];
  if (injectedManagedBlock) {
    const ready =
      /\bStatus:\s*(?:published|approved)\b/i.test(injectedManagedBlock) &&
      /##\s+Workspace Context Brief\b/i.test(injectedManagedBlock);
    return {
      ready,
      contextRevision: `fingerprint:${contextFingerprint(injectedManagedBlock)}`,
      compiled: injectedManagedBlock,
      error: ready ? undefined : "Injected managed Marketing OS context is not published and ready.",
    };
  }

  return {
    ready: false,
    contextRevision: null,
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
  const withoutCompiled = withoutManagedBlock.split(compiled).join("\n");
  return withoutCompiled
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

function specialistInput(userText: string, contextRevision: string | null) {
  return {
    type: "text" as const,
    text: [
      userText,
      "",
      "Launcher contract:",
      `- Consume published workspace context revision ${contextRevision ?? "unavailable"} as the first source of truth.`,
      "- Return the complete standard Guild Marketing OS output frame.",
      "- State the actual evidence mode and coverage limitations.",
      "- Keep action_mode draft_only and external_mutation_requested false.",
      "- Do not publish, schedule, spend, mutate CRM, configure credentials, make legal decisions, or delegate.",
    ].join("\n"),
  };
}

function extractSpecialistText(value: unknown): string | undefined {
  const parsed = specialistOutputSchema.safeParse(value);
  return parsed.success && parsed.data.text.trim() ? parsed.data.text.trim() : undefined;
}

export function validateSpecialistOutput(text: string): string[] {
  const errors: string[] = [];
  let previousIndex = -1;
  for (const heading of requiredHeadings) {
    const index = text.indexOf(heading);
    if (index === -1) errors.push(`Missing required heading: ${heading}`);
    else if (index < previousIndex) errors.push(`Required heading out of order: ${heading}`);
    previousIndex = Math.max(previousIndex, index);
  }
  if (!/\b(?:source_supplied|connected_read_only|live_monitoring)\b/.test(text)) {
    errors.push("Missing evidence mode.");
  }
  if (!/"?action_mode"?\s*:\s*"?draft_only"?/.test(text)) {
    errors.push("Missing draft-only safety mode.");
  }
  if (!/"?external_mutation_requested"?\s*:\s*false/.test(text)) {
    errors.push("Missing external_mutation_requested false.");
  }
  for (const pattern of [
    /\bautomatically (?:pause|scale|publish|schedule|sync|activate)\b/i,
    /\b(?:published|scheduled|synced|activated) successfully\b/i,
    /\bcredentials? (?:were |was |have been |has been )?configured\b/i,
    /\bcrm (?:was |has been )?(?:updated|synced|activated)\b/i,
  ]) {
    if (pattern.test(text)) errors.push(`Forbidden execution claim: ${pattern.source}`);
  }
  return errors;
}

function onlyFormatErrors(errors: string[]): boolean {
  return errors.every((error) => !error.startsWith("Forbidden execution claim:"));
}

function baseAudit(
  classification: { route: Route; classifierAttempts: string[]; routingReason?: string },
  contextRevision: string | null,
  installed: { packageName: string; versionId: string } | null,
): z.infer<typeof routeAttemptSchema> {
  return {
    route: classification.route,
    classifier_attempts: classification.classifierAttempts,
    context_revision: contextRevision,
    package_name: installed?.packageName ?? null,
    version_id: installed?.versionId ?? null,
    artifact_attempts: [],
    routing_reason: classification.routingReason,
    status: "running",
  };
}

async function runOnboarding(
  task: LauncherTask,
  state: LauncherState,
  classification: { route: Route; classifierAttempts: string[]; routingReason?: string },
  contextRevision: string | null,
) {
  const installed = installedSuiteAgents(task);
  const missing = suiteInstallOrder.find((entry) => !installed.has(entry.packageName));

  if (missing) {
    const audit = baseAudit(classification, contextRevision, null);
    audit.status = "blocked";
    audit.error = `${missing.displayName} requires user-approved installation.`;
    audit.next_handoff = `Approve installation of ${missing.displayName}, then resume onboarding.`;
    await task.save({
      install_pending: {
        agent_id: missing.agentId,
        package_name: missing.packageName,
        display_name: missing.displayName,
      },
      audit_trail: [...state.audit_trail, audit],
    });
    return callTools([
      {
        type: "tool-call",
        toolCallId: newToolCallId(),
        toolName: "guild_agent_install_request",
        input: { agent_id: missing.agentId },
      },
    ]);
  }

  const audit = baseAudit(classification, contextRevision, null);
  audit.status = "ready_for_review";
  audit.next_handoff = "Request one specialist workflow.";
  await task.save({ audit_trail: [...state.audit_trail, audit] });
  return output({
    type: "text",
    text: renderOnboardingStatus(installed, audit),
  });
}

async function finishInstallRequest(
  task: LauncherTask,
  state: LauncherState,
  results: Array<TypedToolResult<Tools> | TypedToolError<Tools>>,
) {
  const pending = state.install_pending;
  if (!pending) {
    return output({ type: "text", text: renderBlocked("Installation state was missing.", undefined) });
  }
  const result = results[0];
  const failed =
    results.length !== 1 ||
    !result ||
    result.type === "tool-error" ||
    result.toolName !== "guild_agent_install_request";
  const message = failed
    ? `The installation request for ${pending.display_name} was denied, suspended, or failed. It remains blocked and resumable.`
    : `The installation request for ${pending.display_name} was accepted by Guild. Resume onboarding so Launcher can verify installation and request the next missing package.`;
  await task.save({ audit_trail: state.audit_trail });
  return output({
    type: "text",
    text: [
      "# Marketing OS Onboarding",
      "",
      message,
      "",
      `Package: ${pending.package_name}`,
      "No other installation request was made.",
      "",
      "Next action: ask `continue Marketing OS onboarding`.",
    ].join("\n"),
  });
}

function renderOnboardingStatus(
  installed: Map<string, { packageName: string; versionId: string }>,
  audit: z.infer<typeof routeAttemptSchema>,
): string {
  return [
    "# Marketing OS Onboarding",
    "",
    "All eight capability packages are installed.",
    "",
    "| Capability | State | Version provenance |",
    "| --- | --- | --- |",
    ...suiteInstallOrder.map((entry) => {
      const record = installed.get(entry.packageName);
      return `| ${entry.displayName} | ${record ? "installed" : "blocked"} | ${record?.versionId ?? "unavailable"} |`;
    }),
    "",
    "Launcher is active in this Chat.",
    "",
    "Admin check: in the Guild workspace UI, confirm Marketing OS Launcher is the default agent.",
    "Next action: set up company context or request one specialist workflow.",
    "",
    `Status: ${audit.status === "ready_for_review" ? "ready" : "action needed"}`,
  ].join("\n");
}

async function finishFailed(
  task: LauncherTask,
  state: LauncherState,
  message: string,
) {
  const pending = state.pending;
  if (!pending) return output({ type: "text", text: renderBlocked(message, undefined) });
  pending.audit.status = "failed";
  pending.audit.error = message;
  pending.audit.next_handoff = routeConfig[pending.route as DelegatedRoute]?.displayName;
  await task.save({
    audit_trail: [...state.audit_trail, clone(pending.audit)],
  });
  return output({ type: "text", text: renderBlocked(message, pending.audit) });
}

function renderDelegatedResult(
  pending: NonNullable<LauncherState["pending"]>,
  specialistText: string,
): string {
  const config = routeConfig[pending.route as DelegatedRoute];
  return [
    "# Marketing OS",
    "",
    `Handled by: ${config.displayName}`,
    "Status: ready for review",
    "",
    "---",
    "",
    specialistText,
  ].join("\n");
}

function renderGuide(message: string, audit: z.infer<typeof routeAttemptSchema>): string {
  return [
    "# Marketing OS Guide",
    "",
    message,
    "",
    `Status: ${audit.status === "blocked" ? "needs clarification" : audit.status.replaceAll("_", " ")}`,
    "",
    "No specialist work or external action was started.",
  ].join("\n");
}

export function renderSpecialistGuide(
  config: (typeof routeConfig)[DelegatedRoute],
  userText: string,
  contextRevision: string | null,
  _installed: { packageName: string; versionId: string },
  _audit: z.infer<typeof routeAttemptSchema>,
): string {
  const handoffPrompt = specialistInput(userText, contextRevision).text;
  return [
    "# Marketing OS Guide",
    "",
    `## Ready for ${config.displayName}`,
    "",
    "Your request and approved workspace context are ready for the specialist.",
    "This Guild workspace currently needs the specialist to run in a separate Chat because its completed result cannot yet be returned reliably to this Launcher conversation. No specialist work was started in this turn.",
    "",
    "## Continue",
    "",
    `1. Start a new Chat in this Marketing OS workspace.`,
    `2. Choose **${config.displayName}** from the agent picker. Its package name is \`${config.packageName}\`.`,
    "3. Paste the prepared request below.",
    "",
    "```text",
    handoffPrompt,
    "```",
    "",
    "Status: handoff ready",
    "Safety: draft-only; no publishing, scheduling, spend, CRM changes, credential setup, or other external action occurred.",
  ].join("\n");
}

function renderBlocked(message: string, audit?: z.infer<typeof routeAttemptSchema>): string {
  return [
    "# Request not supported",
    "",
    message,
    "",
    "Status: blocked safely",
    "No specialist work or external action occurred.",
    ...(audit?.next_handoff ? ["", `Next step: ${audit.next_handoff}`] : []),
  ].join("\n");
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer <redacted>").slice(0, 500);
}

function newToolCallId(): string {
  return `launcher_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
