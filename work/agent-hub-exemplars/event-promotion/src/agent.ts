import {
  buildDashboardPayload,
  runAgent,
  type DashboardPayload,
} from "../../../local-agent-lab/dist/index.js";
import { eventPromotionAgent } from "../../../local-agent-lab/dist/agents/event-promotion.js";

export interface EventPromotionInput {
  type: "text";
  text: string;
}

export interface EventPromotionOutput {
  type: "text";
  text: string;
  dashboardPayload: DashboardPayload;
  liveExecution: false;
}

export async function run(input: EventPromotionInput): Promise<EventPromotionOutput> {
  const requestText = input.text.trim() || eventPromotionAgent.demoPrompt;

  return {
    type: "text",
    text: runAgent(eventPromotionAgent.id, requestText),
    dashboardPayload: buildDashboardPayload(eventPromotionAgent, requestText),
    liveExecution: false,
  };
}

// Future Agent Hub packaging should replace this local-only export with the
// approved Guild SDK wrapper after packaging scope is explicitly approved.
export const eventPromotionExemplar = {
  id: eventPromotionAgent.id,
  hubName: eventPromotionAgent.hubName,
  displayName: eventPromotionAgent.displayName,
  description: eventPromotionAgent.summary,
  mode: "one-shot",
  liveExecution: false,
  run,
} as const;

export default eventPromotionExemplar;
