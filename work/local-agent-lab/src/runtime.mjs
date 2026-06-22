import { agents, sharedContext } from "./agent-catalog.mjs";

const LOCAL_ONLY_BOUNDARY =
  "Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.";

const MENU_REQUESTS = ["help", "menu", "list agents", "show agents"];

export function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function includesPhrase(haystack, phrase) {
  const normalizedPhrase = normalizeText(phrase);
  return normalizedPhrase.length > 0 && haystack.includes(normalizedPhrase);
}

export function getAgentById(id) {
  const agent = agents.find((candidate) => candidate.id === id);
  if (!agent) {
    throw new Error(`Unknown agent id: ${id}`);
  }
  return agent;
}

function scoreAgent(text, agent) {
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

export function rankAgents(text) {
  return agents
    .map((agent) => ({ agent, score: scoreAgent(text, agent) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.agent.order - b.agent.order);
}

function listItems(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function adapterItems(adapters) {
  return adapters
    .map(([system, action]) => `- ${system}: V1 documents the handoff. Future live action: ${action}`)
    .join("\n");
}

function assetBlocks(agent) {
  return agent.assetBlocks
    .map((block) => [`### ${block.title}`, block.body].join("\n"))
    .join("\n\n");
}

function agentMenuLine(agent) {
  return `${agent.order}. ${agent.displayName} - future hub name: \`${agent.hubName}\``;
}

function isMenuRequest(normalizedText) {
  if (!normalizedText) {
    return true;
  }

  return MENU_REQUESTS.some((phrase) => includesPhrase(normalizedText, phrase));
}

function clarificationOptions(matches) {
  return matches
    .slice(0, 3)
    .map((entry) => `- ${entry.agent.displayName}`);
}

export function buildDashboardPayload(agent, requestText) {
  return {
    agentId: agent.id,
    agentHubName: agent.hubName,
    agentDisplayName: agent.displayName,
    mode: sharedContext.mode,
    liveExecution: sharedContext.liveExecution,
    project: sharedContext.project,
    status: sharedContext.reviewState,
    sourceRequest: requestText.trim(),
    signals: agent.dashboardSignals,
  };
}

export function runAgent(agentId, requestText) {
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

export function buildMenu() {
  return [
    "# Marketing OS Local Agent Lab",
    "",
    "Choose one local agent. This lab models nine separate marketplace/workspace agents plus an orchestrator, without creating remote agent records.",
    "",
    ...agents.map(agentMenuLine),
  ].join("\n");
}

export function runOrchestrator(requestText) {
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
