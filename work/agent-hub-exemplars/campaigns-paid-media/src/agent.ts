import {
  buildDashboardPayload,
  runAgent,
  type DashboardPayload,
} from "../../../local-agent-lab/dist/index.js";
import { campaignsPaidMediaAgent } from "../../../local-agent-lab/dist/agents/campaigns-paid-media.js";

export interface CampaignsPaidMediaInput {
  type: "text";
  text: string;
}

export interface CampaignsPaidMediaOutput {
  type: "text";
  text: string;
  dashboardPayload: DashboardPayload;
  liveExecution: false;
}

export async function run(input: CampaignsPaidMediaInput): Promise<CampaignsPaidMediaOutput> {
  const requestText = input.text.trim() || campaignsPaidMediaAgent.demoPrompt;

  return {
    type: "text",
    text: runAgent(campaignsPaidMediaAgent.id, requestText),
    dashboardPayload: buildDashboardPayload(campaignsPaidMediaAgent, requestText),
    liveExecution: false,
  };
}

// Future Agent Hub packaging should replace this local-only export with the
// approved Guild SDK wrapper after packaging scope is explicitly approved.
export const campaignsPaidMediaExemplar = {
  id: campaignsPaidMediaAgent.id,
  hubName: campaignsPaidMediaAgent.hubName,
  displayName: campaignsPaidMediaAgent.displayName,
  description: campaignsPaidMediaAgent.summary,
  mode: "one-shot",
  liveExecution: false,
  run,
} as const;

export default campaignsPaidMediaExemplar;
