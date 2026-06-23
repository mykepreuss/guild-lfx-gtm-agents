import {
  buildDashboardPayload,
  runAgent,
  type DashboardPayload,
} from "../../../local-agent-lab/dist/index.js";
import { eventCreationAgent } from "../../../local-agent-lab/dist/agents/event-creation.js";

export interface EventCreationInput {
  type: "text";
  text: string;
}

export interface EventCreationOutput {
  type: "text";
  text: string;
  dashboardPayload: DashboardPayload;
  liveExecution: false;
}

export async function run(input: EventCreationInput): Promise<EventCreationOutput> {
  const requestText = input.text.trim() || eventCreationAgent.demoPrompt;

  return {
    type: "text",
    text: runAgent(eventCreationAgent.id, requestText),
    dashboardPayload: buildDashboardPayload(eventCreationAgent, requestText),
    liveExecution: false,
  };
}

// Future Agent Hub packaging should replace this local-only export with the
// approved Guild SDK wrapper after packaging scope is explicitly approved.
export const eventCreationExemplar = {
  id: eventCreationAgent.id,
  hubName: eventCreationAgent.hubName,
  displayName: eventCreationAgent.displayName,
  description: eventCreationAgent.summary,
  mode: "one-shot",
  liveExecution: false,
  run,
} as const;

export default eventCreationExemplar;
