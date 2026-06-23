import {
  buildDashboardPayload,
  runAgent,
  type DashboardPayload,
} from "../../../local-agent-lab/dist/index.js";
import { campaignPerformanceAgent } from "../../../local-agent-lab/dist/agents/campaign-performance.js";

export interface CampaignPerformanceInput {
  type: "text";
  text: string;
}

export interface CampaignPerformanceOutput {
  type: "text";
  text: string;
  dashboardPayload: DashboardPayload;
  liveExecution: false;
}

export async function run(input: CampaignPerformanceInput): Promise<CampaignPerformanceOutput> {
  const requestText = input.text.trim() || campaignPerformanceAgent.demoPrompt;

  return {
    type: "text",
    text: runAgent(campaignPerformanceAgent.id, requestText),
    dashboardPayload: buildDashboardPayload(campaignPerformanceAgent, requestText),
    liveExecution: false,
  };
}

// Future Agent Hub packaging should replace this local-only export with the
// approved Guild SDK wrapper after packaging scope is explicitly approved.
export const campaignPerformanceExemplar = {
  id: campaignPerformanceAgent.id,
  hubName: campaignPerformanceAgent.hubName,
  displayName: campaignPerformanceAgent.displayName,
  description: campaignPerformanceAgent.summary,
  mode: "one-shot",
  liveExecution: false,
  run,
} as const;

export default campaignPerformanceExemplar;
