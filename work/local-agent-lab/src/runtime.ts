import { agents, sharedContext } from "./agent-catalog.js";
import type { AdapterNote, AgentDefinition, AssetBlock, DashboardPayload, RankedAgent } from "./types.js";

const LOCAL_ONLY_BOUNDARY =
  "Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.";

const MENU_REQUESTS = ["help", "menu", "list agents", "show agents"];

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function includesPhrase(haystack: string, phrase: string): boolean {
  const normalizedPhrase = normalizeText(phrase);
  return normalizedPhrase.length > 0 && haystack.includes(normalizedPhrase);
}

export function getAgentById(id: string): AgentDefinition {
  const agent = agents.find((candidate) => candidate.id === id);
  if (!agent) {
    throw new Error(`Unknown agent id: ${id}`);
  }
  return agent;
}

function scoreAgent(text: string, agent: AgentDefinition): number {
  const normalized = normalizeText(text);
  let score = 0;

  if (includesPhrase(normalized, agent.displayName)) score += 10;
  if (includesPhrase(normalized, agent.hubName.replace(/-/g, " "))) score += 8;
  if (includesPhrase(normalized, agent.id.replace(/-/g, " "))) score += 6;

  for (const alias of agent.aliases) {
    if (includesPhrase(normalized, alias)) score += 4;
  }

  for (const keyword of agent.keywords) {
    if (includesPhrase(normalized, keyword)) score += 2;
  }

  return score;
}

export function rankAgents(text: string): RankedAgent[] {
  return agents
    .map((agent) => ({ agent, score: scoreAgent(text, agent) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.agent.order - b.agent.order);
}

function listItems(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function adapterItems(adapters: AdapterNote[]): string {
  return adapters
    .map(([system, action]) => `- ${system}: V1 documents the handoff. Future live action: ${action}`)
    .join("\n");
}

function assetBlocks(agent: AgentDefinition): string {
  return agent.assetBlocks
    .map((block: AssetBlock) => [`### ${block.title}`, block.body].join("\n"))
    .join("\n\n");
}

function agentMenuLine(agent: AgentDefinition): string {
  return `${agent.order}. ${agent.displayName} - future hub name: \`${agent.hubName}\``;
}

function isMenuRequest(normalizedText: string): boolean {
  if (!normalizedText) {
    return true;
  }

  return MENU_REQUESTS.some((phrase) => includesPhrase(normalizedText, phrase));
}

function clarificationOptions(matches: RankedAgent[]): string[] {
  return matches
    .slice(0, 3)
    .map((entry) => `- ${entry.agent.displayName}`);
}

export function buildDashboardPayload(agent: AgentDefinition, requestText: string): DashboardPayload {
  return {
    agentId: agent.id,
    agentHubName: agent.hubName,
    agentDisplayName: agent.displayName,
    category: agent.metadata.category,
    tags: agent.metadata.tags,
    mode: sharedContext.mode,
    liveExecution: sharedContext.liveExecution,
    project: sharedContext.project,
    status: sharedContext.reviewState,
    sourceRequest: requestText.trim(),
    workstream: agent.dashboard.workstream,
    ownerRole: agent.dashboard.ownerRole,
    approvalStatus: agent.dashboard.approvalStatus,
    decisionRequired: agent.dashboard.decisionRequired,
    blockers: agent.dashboard.blockers,
    nextAction: agent.dashboard.nextAction,
    metrics: agent.dashboard.metrics,
    sourceConfidence: agent.dashboard.sourceConfidence,
    downstreamAgents: agent.dashboard.downstreamAgents,
    agentHubReadiness: agent.metadata.agentHubReadiness,
    signals: agent.dashboardSignals,
  };
}

export function runAgent(agentId: string, requestText: string): string {
  const agent = getAgentById(agentId);
  const payload = buildDashboardPayload(agent, requestText);

  return [
    `# ${agent.displayName} Local V1 Packet`,
    "",
    `Future Agent Hub name: \`${agent.hubName}\``,
    "",
    LOCAL_ONLY_BOUNDARY,
    "",
    "## Workflow Summary",
    agent.summary,
    "",
    `Trigger: ${agent.trigger}`,
    "",
    "## Inputs Captured Or Assumed",
    listItems([
      `Request: ${requestText.trim() || agent.demoPrompt}`,
      ...agent.questions.map((question) => `Project leader question: ${question}`),
      ...agent.assumptions.map((assumption) => `Fixture assumption: ${assumption}`),
    ]),
    "",
    "## Generated Assets",
    assetBlocks(agent),
    "",
    "## Approval Checklist",
    listItems(agent.approvalChecklist),
    "",
    "## Dashboard Update Payload",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "",
    "## Future Integration Adapter Notes",
    adapterItems(agent.adapters),
    "",
    "## Next Recommended Action",
    agent.nextAction,
  ].join("\n");
}

export function buildMenu(): string {
  return [
    "# Marketing OS Local Agent Lab",
    "",
    "Choose one local agent. This lab models nine separate marketplace/workspace agents plus an orchestrator, without creating remote agent records.",
    "",
    ...agents.map(agentMenuLine),
  ].join("\n");
}

export function runOrchestrator(requestText: string): string {
  const normalized = normalizeText(requestText);
  if (isMenuRequest(normalized)) {
    return buildMenu();
  }

  const matches = rankAgents(requestText);
  if (!matches.length) {
    return [
      "# Choose An Agent",
      "",
      "I could not map that request to a specific Marketing OS agent. Choose one agent from the local lab menu and include the project context you want reflected in the packet.",
      "",
      buildMenu(),
    ].join("\n");
  }

  const [best, second] = matches;
  if (second && best.score - second.score <= 2) {
    return [
      "# Choose An Agent",
      "",
      "Your request could map to more than one Marketing OS agent. Pick one of these names:",
      "",
      ...clarificationOptions(matches),
    ].join("\n");
  }

  return runAgent(best.agent.id, requestText);
}
