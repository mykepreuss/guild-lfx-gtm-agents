import {
  buildDashboardPayload,
  runAgent,
  type DashboardPayload,
} from "../../../local-agent-lab/dist/index.js";
import { audienceSegmentationAgent } from "../../../local-agent-lab/dist/agents/audience-segmentation.js";

export interface AudienceSegmentationInput {
  type: "text";
  text: string;
}

export interface AudienceSegmentationOutput {
  type: "text";
  text: string;
  dashboardPayload: DashboardPayload;
  liveExecution: false;
}

export async function run(input: AudienceSegmentationInput): Promise<AudienceSegmentationOutput> {
  const requestText = input.text.trim() || audienceSegmentationAgent.demoPrompt;

  return {
    type: "text",
    text: runAgent(audienceSegmentationAgent.id, requestText),
    dashboardPayload: buildDashboardPayload(audienceSegmentationAgent, requestText),
    liveExecution: false,
  };
}

// Future Agent Hub packaging should replace this local-only export with the
// approved Guild SDK wrapper after packaging scope is explicitly approved.
export const audienceSegmentationExemplar = {
  id: audienceSegmentationAgent.id,
  hubName: audienceSegmentationAgent.hubName,
  displayName: audienceSegmentationAgent.displayName,
  description: audienceSegmentationAgent.summary,
  mode: "one-shot",
  liveExecution: false,
  run,
} as const;

export default audienceSegmentationExemplar;
