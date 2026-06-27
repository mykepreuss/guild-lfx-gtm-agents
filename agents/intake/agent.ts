import { agent, pick, type Task } from "@guildai/agents-sdk";
import { FirecrawlTools } from "@guildai-services/dkountanis~firecrawl";
import { z } from "zod";

const inputSchema = z.object({
  type: z.literal("text").describe("Guild canonical text input type."),
  text: z.string().describe("Guild canonical text input body."),
});

const outputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;
const tools = pick(FirecrawlTools, ["firecrawl_search_and_scrape"]);
type Tools = typeof tools;
type AgentTask = Task<Tools>;

type Route = {
  agent: string;
  reason: string;
};

type ResearchSource = {
  title: string;
  url: string;
  excerpt: string;
};

type ResearchPacket = {
  status: "not_requested" | "ready_for_approval" | "blocked";
  sources: ResearchSource[];
  note: string;
};

const minimumCompanyInputs = [
  "Approved one-paragraph description",
  "Primary audiences or buyer/user roles",
  "Current marketing goals",
  "Proof-backed claims or approved source links",
  "Channel scope",
];

const sourcePacketFields = [
  "Company/project",
  "Approved description",
  "Primary audiences",
  "Current goals",
  "Proof-backed claims or source excerpts",
  "Approved links or uploaded source names",
  "Channels in scope",
  "Anything not approved for reuse",
];

const blockedActions = [
  "live publishing or scheduling",
  "paid media spend or CRM activation",
  "credential, workspace, or trigger changes",
  "public visibility changes",
];

const routeRules: Array<{ pattern: RegExp; agent: string; reason: string }> = [
  {
    pattern: /\b(context|source of truth|setup|set up|onboard|knowledge graph|company profile|workspace focused)\b/i,
    agent: "Company Context Builder",
    reason: "first-run setup needs approved company context before specialist agents draft work",
  },
  {
    pattern: /\b(market|competitor|competition|community|search|answer engine|social signal|developer signal|signal)\b/i,
    agent: "Market Signal",
    reason: "the request asks for external signals that should be separated from assumptions",
  },
  {
    pattern: /\b(icp|persona|target audience|who to target|buyer|user role)\b/i,
    agent: "ICP",
    reason: "the request asks who the marketing system should prioritize",
  },
  {
    pattern: /\b(segment|segmentation|list|suppression|consent|targeting rules)\b/i,
    agent: "Audience Segmentation",
    reason: "the request asks for reviewable segment or activation logic",
  },
  {
    pattern: /\b(positioning|messaging|message|claims|boilerplate|objection|answer-ready|copy)\b/i,
    agent: "Messaging",
    reason: "the request asks for approved-language and proof-backed messaging work",
  },
  {
    pattern: /\b(brand|branding|pitch|deck|website|web direction|visual|aeo|ai-readiness)\b/i,
    agent: "Branding And Pitch Deck",
    reason: "the request asks for brand, web, AEO, or pitch narrative guidance",
  },
  {
    pattern: /\b(social|content|post|reply|monitoring|digest|linkedin|twitter|x\b|reddit)\b/i,
    agent: "Social Monitoring And Content",
    reason: "the request asks for social or content planning that must stay review-only",
  },
  {
    pattern: /\b(campaign|paid|ads?|budget|kpi|landing page|performance|retargeting)\b/i,
    agent: "Campaigns And Paid Media",
    reason: "the request asks for campaign or paid-media planning without live spend changes",
  },
];

const companyPatterns = [
  /\bcompany\/project\s*:\s*([A-Z][A-Za-z0-9&.\- ]{1,80})/i,
  /\bcompany\s*(?:is|=|:)\s*([A-Z][A-Za-z0-9&.\- ]{1,80})/i,
  /\bproject\s*(?:is|=|:)\s*([A-Z][A-Za-z0-9&.\- ]{1,80})/i,
  /\b(?:my|our|the)\s+company,\s*([A-Z][A-Za-z0-9&.\- ]{1,80})(?:[,.]|$)/i,
  /\b(?:research|search|source|sources)\s+([A-Z][A-Za-z0-9&.\- ]{1,80})(?:[,.]|$)/i,
  /\bfor\s+([A-Z][A-Za-z0-9&.\- ]{1,80})(?:[,.]|$)/,
  /\bfocused on\s+([A-Z][A-Za-z0-9&.\- ]{1,80})(?:[,.]|$)/i,
];

const sourceIntentPattern =
  /\b(use my sources|use sources|paste sources|manual context|manual source|source packet|pasted context|paste context|upload(?:ed)? pdf|pdf upload|uploaded file|source text|use pasted context)\b/i;

const sourcePacketPattern =
  /\b(company\/project|approved description|primary audiences|current goals|proof-backed claims|source excerpts|channels in scope|anything not approved)\s*:/i;

const researchIntentPattern =
  /\b(web search|search|research|look up|public source|public-source|official source|source-backed|find this information|get this information|crawl|scrape)\b/i;

export default agent({
  identifier: "guild_marketing_os_intake",
  description:
    "Deterministic chat-native entrypoint for Guild Marketing OS. Triage setup requests, collect minimum company context, and route users to the right specialist without LLM delay, invented facts, or live actions.",
  inputSchema,
  outputSchema,
  tools,
  async run(input: Input, task: AgentTask): Promise<Output> {
    const userText = extractUserText(input.text);
    const knownCompanyOrProject = extractCompanyOrProject(userText) ?? "TBD";
    const route = chooseRoute(userText);
    const wantsSourceIntake = sourceIntentPattern.test(userText);
    const hasSourcePacket = sourcePacketPattern.test(userText);
    const wantsResearch = researchIntentPattern.test(userText);
    const missingInputs = inferMissingInputs(userText);
    const researchPacket = wantsResearch ? await researchPublicContext(task, knownCompanyOrProject) : notRequestedResearchPacket();

    return {
      type: "text",
      text: renderResponse({
        route,
        knownCompanyOrProject,
        missingInputs,
        wantsSourceIntake,
        hasSourcePacket,
        wantsResearch,
        researchPacket,
      }),
    };
  },
});

function extractUserText(text: string): string {
  const trimmed = text.trim();
  const fencedJson = trimmed.match(/```json\s*([\s\S]*?)\s*```/i)?.[1];
  const parsedFence = parseTextPayload(fencedJson);
  if (parsedFence) return parsedFence;

  const parsedText = parseTextPayload(trimmed);
  if (parsedText) return parsedText;

  const firstJsonIndex = trimmed.indexOf("{");
  const lastJsonIndex = trimmed.lastIndexOf("}");
  if (firstJsonIndex !== -1 && lastJsonIndex > firstJsonIndex) {
    const parsedSubstring = parseTextPayload(trimmed.slice(firstJsonIndex, lastJsonIndex + 1));
    if (parsedSubstring) return parsedSubstring;
  }

  const textField = trimmed.match(/"text"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
  const parsedTextField = parseJsonString(textField);
  if (parsedTextField) return parsedTextField;

  return trimmed;
}

function parseTextPayload(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
      return parsed.text.trim();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function parseJsonString(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(`"${value}"`);
    return typeof parsed === "string" ? parsed.trim() : undefined;
  } catch {
    return undefined;
  }
}

async function researchPublicContext(task: AgentTask, knownCompanyOrProject: string): Promise<ResearchPacket> {
  if (knownCompanyOrProject === "TBD") {
    return {
      status: "blocked",
      sources: [],
      note: "public-source research needs a company or project name first",
    };
  }

  const search = task.tools?.firecrawl_search_and_scrape;
  if (typeof search !== "function") {
    return {
      status: "blocked",
      sources: [],
      note: "Firecrawl search is not exposed in this run",
    };
  }

  try {
    const response = await search({
      query: `${knownCompanyOrProject} official website about product platform customers`,
      limit: 5,
      sources: [{ type: "web" }],
      scrapeOptions: {
        formats: [{ type: "markdown" }, { type: "summary" }],
        onlyMainContent: true,
        onlyCleanContent: true,
        removeBase64Images: true,
        timeout: 20000,
      },
    });
    const sources = extractResearchSources(response);

    if (!sources.length) {
      return {
        status: "blocked",
        sources: [],
        note: "Firecrawl ran, but no usable source snippets were returned",
      };
    }

    return {
      status: "ready_for_approval",
      sources,
      note: "review these public-source snippets, then approve, reject, or edit each fact before Company Context Builder treats it as context",
    };
  } catch (error) {
    return {
      status: "blocked",
      sources: [],
      note: `Firecrawl search could not run: ${formatResearchError(error)}`,
    };
  }
}

function notRequestedResearchPacket(): ResearchPacket {
  return {
    status: "not_requested",
    sources: [],
    note: "public-source research was not requested in this message",
  };
}

function extractResearchSources(response: unknown): ResearchSource[] {
  const webResults = getNestedArray(response, ["data", "web"]);
  return webResults
    .map((item) => {
      const record = isRecord(item) ? item : {};
      const metadata = isRecord(record.metadata) ? record.metadata : {};
      const url = asString(record.url) ?? asString(metadata.sourceURL) ?? asString(metadata.url);
      const title = asString(record.title) ?? asString(metadata.title) ?? url;
      const description = asString(record.description) ?? asString(metadata.description);
      const markdown = asString(record.markdown);
      const excerpt = cleanExcerpt(description ?? markdown);

      if (!url || !title || !excerpt) return undefined;
      return { title, url, excerpt };
    })
    .filter((source): source is ResearchSource => source !== undefined)
    .slice(0, 5);
}

function getNestedArray(value: unknown, path: string[]): unknown[] {
  let current = value;
  for (const key of path) {
    if (!isRecord(current)) return [];
    current = current[key];
  }
  return Array.isArray(current) ? current : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function cleanExcerpt(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > 260 ? `${cleaned.slice(0, 257).trim()}...` : cleaned;
}

function formatResearchError(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : stringifyError(error);
  const lower = raw.toLowerCase();
  if (lower.includes("unauthorized") && lower.includes("credentials")) {
    return "Firecrawl credentials are not configured for this workspace";
  }
  return raw.replace(/Use the `guild_credentials_request` tool to set up credentials\.?/gi, "Ask a workspace owner to configure Firecrawl credentials.");
}

function stringifyError(error: unknown): string {
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function chooseRoute(text: string): Route {
  if (sourceIntentPattern.test(text) || sourcePacketPattern.test(text)) {
    return {
      agent: "Company Context Builder",
      reason: "source intake should become approved company context before specialist agents draft work",
    };
  }

  for (const rule of routeRules) {
    if (rule.pattern.test(text)) {
      return { agent: rule.agent, reason: rule.reason };
    }
  }

  return {
    agent: "Company Context Builder",
    reason: "approved company context is the safest first step when the request is broad or underspecified",
  };
}

function extractCompanyOrProject(text: string): string | undefined {
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    const candidate = cleanCandidate(match?.[1]);
    if (candidate) return candidate;
  }

  return undefined;
}

function cleanCandidate(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const cleaned = value
    .replace(/\b(so|and|because|to|that|where|when|with|using|please|next)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,.!?;:]+$/, "");

  if (!cleaned || cleaned.length < 2) return undefined;
  return cleaned;
}

function inferMissingInputs(text: string): string[] {
  const missing = new Set(minimumCompanyInputs);

  if (/\b(description|about|overview|one-paragraph)\b/i.test(text)) missing.delete("Approved one-paragraph description");
  if (/\b(audience|buyer|user|persona|role|maintainer|developer|executive|sponsor)\b/i.test(text)) {
    missing.delete("Primary audiences or buyer/user roles");
  }
  if (/\b(goal|objective|priority|outcome)\b/i.test(text)) missing.delete("Current marketing goals");
  if (/\b(proof|claim|source|link|evidence|customer|case study|metric)\b/i.test(text)) {
    missing.delete("Proof-backed claims or approved source links");
  }
  if (/\b(channel|website|social|email|paid|ads|crm|content|community)\b/i.test(text)) missing.delete("Channel scope");

  return [...missing];
}

function renderResponse({
  route,
  knownCompanyOrProject,
  missingInputs,
  wantsSourceIntake,
  hasSourcePacket,
  wantsResearch,
  researchPacket,
}: {
  route: Route;
  knownCompanyOrProject: string;
  missingInputs: string[];
  wantsSourceIntake: boolean;
  hasSourcePacket: boolean;
  wantsResearch: boolean;
  researchPacket: ResearchPacket;
}): string {
  const status = missingInputs.length ? "needs_input" : "ready_for_review";
  const publicSourceResearchStatus =
    researchPacket.status === "ready_for_approval" ? "ready_for_approval" : researchPacket.status;
  const researchReply = formatResearchReply(knownCompanyOrProject);
  const sourceIntakeStatus = hasSourcePacket
    ? "source_packet_received"
    : wantsSourceIntake
      ? "requested"
      : "available_on_request";

  return [
    "## Consumed Context",
    `- User request: ${formatRequestSummary({
      route,
      knownCompanyOrProject,
      wantsResearch,
      wantsSourceIntake,
      hasSourcePacket,
    })}`,
    `- Company or project: ${knownCompanyOrProject === "TBD" ? "TBD" : `${knownCompanyOrProject} (user supplied)`}`,
    hasSourcePacket
      ? "- Approved context artifacts available in this message: source packet provided by user, pending explicit approval."
      : "- Approved context artifacts available in this message: none",
    "",
    "## Produced Artifact",
    `- Intake decision: run ${route.agent} next.`,
    `- Reason: ${route.reason}.`,
    ...formatNextActionLines({
      wantsSourceIntake,
      hasSourcePacket,
      wantsResearch,
      researchPacket,
      researchReply,
    }),
    ...formatSourcePacketLines({ wantsSourceIntake, hasSourcePacket }),
    `- Public-source research status: ${formatResearchStatus(researchPacket)}.`,
    ...formatResearchSources(researchPacket),
    `- Missing setup inputs: ${formatList(missingInputs)}`,
    "",
    "## Assumptions And Missing Evidence",
    "- No company category, market claims, audience facts, proof points, competitors, channels, or performance claims are approved from this intake message alone.",
    "- Connected workspace services are not treated as approved customer context.",
    "",
    "## Approval Gate",
    "- Approve the company description, audiences, goals, proof-backed claims, and channel scope before specialist agents use them as source-of-truth context.",
    "- If public-source research is used, approve or reject each researched fact before it becomes reusable context.",
    "",
    "## AEO / AI-Readiness Contribution",
    "- First readiness need: establish approved entity facts, canonical URLs, source-backed descriptions, answer-ready claims, and unknowns.",
    "- Do not claim schema, metadata, llms.txt, or answer-engine visibility is deployed until a production change confirms it.",
    "",
    "## Status Payload",
    "```json",
    JSON.stringify(
      {
        status,
        recommended_agent: route.agent,
        known_company_or_project: knownCompanyOrProject,
        missing_inputs: missingInputs,
        source_intake: sourceIntakeStatus,
        public_source_research: wantsResearch ? publicSourceResearchStatus : "available_on_request",
        researched_sources: researchPacket.sources.map((source) => source.url),
        next_actions: [
          {
            label: "Use your pasted or uploaded sources",
            reply: "Use my sources",
            no_web_credential_required: true,
            fields: sourcePacketFields,
          },
          {
            label: "Research public sources for approval",
            reply: researchReply,
            requires_configured_web_research_credentials: true,
          },
          {
            label: "Run Company Context Builder after source approval",
            agent: "Company Context Builder",
          },
        ],
        blocked_actions: blockedActions,
      },
      null,
      2,
    ),
    "```",
    "",
    "## Downstream Handoff",
    ...formatSourceHandoff({ wantsSourceIntake, hasSourcePacket, researchReply }),
    ...(wantsResearch ? [formatResearchHandoff({ researchPacket, researchReply })] : []),
    route.agent === "Company Context Builder"
      ? "- After the facts are approved, run Company Context Builder with the approved context."
      : "- Confirm Company Context Builder has approved reusable context before this specialist produces a review packet.",
  ].join("\n");
}

function formatNextActionLines({
  wantsSourceIntake,
  hasSourcePacket,
  wantsResearch,
  researchPacket,
  researchReply,
}: {
  wantsSourceIntake: boolean;
  hasSourcePacket: boolean;
  wantsResearch: boolean;
  researchPacket: ResearchPacket;
  researchReply: string;
}): string[] {
  if (hasSourcePacket) {
    return [
      "- Source packet received. Treat these inputs as user-supplied and pending approval before they become reusable context.",
    ];
  }

  if (wantsSourceIntake) {
    return ["- Source intake requested. Paste answers, excerpts, links, or uploaded PDF text using the packet below."];
  }

  if (!wantsResearch) {
    return [
      "- Recommended next reply: Use my sources",
      `- Optional web research reply: ${researchReply}. This requires configured web-research credentials.`,
    ];
  }

  if (researchPacket.status === "ready_for_approval") {
    return [
      "- Research request completed. Review the public-source approval draft below before any facts become reusable context.",
    ];
  }

  return [`- Research request received. To retry after the blocker is fixed, reply: ${researchReply}`];
}

function formatSourcePacketLines({
  wantsSourceIntake,
  hasSourcePacket,
}: {
  wantsSourceIntake: boolean;
  hasSourcePacket: boolean;
}): string[] {
  if (hasSourcePacket) {
    return [
      "- Next approval step: confirm which supplied facts, excerpts, and links are approved for reuse before Company Context Builder stores them as context.",
    ];
  }

  const intro = wantsSourceIntake
    ? "- Paste this source packet next. Web research credentials are not required:"
    : "- If you want to avoid web-research credentials, reply `Use my sources` and paste this packet:";

  return [intro, "```text", ...sourcePacketFields.map((field) => `${field}:`), "```"];
}

function formatResearchHandoff({
  researchPacket,
  researchReply,
}: {
  researchPacket: ResearchPacket;
  researchReply: string;
}): string {
  if (researchPacket.status === "blocked") {
    return `- Public-source research is blocked right now. You can still continue without credentials by replying: Use my sources`;
  }

  return "- Review, approve, reject, or edit the researched source snippets before using them as Company Context Builder input.";
}

function formatSourceHandoff({
  wantsSourceIntake,
  hasSourcePacket,
  researchReply,
}: {
  wantsSourceIntake: boolean;
  hasSourcePacket: boolean;
  researchReply: string;
}): string[] {
  if (hasSourcePacket) {
    return ["- Send this source packet to Company Context Builder for approval and normalization."];
  }

  if (wantsSourceIntake) {
    return ["- Paste the source packet using the template above; no web credential is needed."];
  }

  return [
    "- Recommended: reply `Use my sources` and paste approved answers, excerpts, links, or uploaded PDF text.",
    `- Optional: reply \`${researchReply}\` for public web research after credentials are configured.`,
  ];
}

function formatResearchStatus(researchPacket: ResearchPacket): string {
  if (researchPacket.status === "not_requested") {
    return "not requested; optional public-source research requires configured web-research credentials";
  }

  return `${researchPacket.status}; ${researchPacket.note}`;
}

function formatResearchSources(researchPacket: ResearchPacket): string[] {
  if (!researchPacket.sources.length) return [];

  const lines = ["- Public-source approval draft:"];
  researchPacket.sources.forEach((source, index) => {
    lines.push(`  ${index + 1}. ${source.title} - ${source.url}`);
    lines.push(`     Source snippet for approval: ${source.excerpt}`);
  });
  return lines;
}

function formatRequestSummary({
  route,
  knownCompanyOrProject,
  wantsResearch,
  wantsSourceIntake,
  hasSourcePacket,
}: {
  route: Route;
  knownCompanyOrProject: string;
  wantsResearch: boolean;
  wantsSourceIntake: boolean;
  hasSourcePacket: boolean;
}): string {
  const target = knownCompanyOrProject === "TBD" ? "" : ` for ${knownCompanyOrProject}`;
  const research = wantsResearch ? " with public-source research requested" : "";
  const sources = hasSourcePacket
    ? " with a user-provided source packet"
    : wantsSourceIntake
      ? " with source intake requested"
      : "";
  return `route a Guild Marketing OS request to ${route.agent}${target}${research}${sources}`;
}

function formatResearchReply(knownCompanyOrProject: string): string {
  const target = knownCompanyOrProject === "TBD" ? "<company name>" : knownCompanyOrProject;
  return `Research ${target}`;
}

function formatList(items: string[]): string {
  if (!items.length) return "none";
  return items.join("; ");
}
