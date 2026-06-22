export type DashboardSignalValue = string | number | boolean | null;

export type DashboardSignals = Record<string, DashboardSignalValue>;

export type AdapterNote = [system: string, action: string];

export interface AssetBlock {
  title: string;
  body: string;
}

export interface AgentDefinition {
  id: string;
  hubName: string;
  displayName: string;
  order: number;
  aliases: string[];
  keywords: string[];
  trigger: string;
  summary: string;
  demoPrompt: string;
  questions: string[];
  assumptions: string[];
  assetBlocks: AssetBlock[];
  approvalChecklist: string[];
  dashboardSignals: DashboardSignals;
  adapters: AdapterNote[];
  nextAction: string;
}

export interface SharedContext {
  project: string;
  projectLeader: string;
  primaryAudience: string;
  tone: string;
  reviewState: string;
  mode: string;
  liveExecution: boolean;
  dateContext: string;
}

export interface DashboardPayload {
  agentId: string;
  agentHubName: string;
  agentDisplayName: string;
  mode: string;
  liveExecution: boolean;
  project: string;
  status: string;
  sourceRequest: string;
  signals: DashboardSignals;
}

export interface RankedAgent {
  agent: AgentDefinition;
  score: number;
}
