import {
  buildDashboardPayload,
  runAgent,
  type DashboardPayload,
} from "../../../local-agent-lab/dist/index.js";
import { foundationSetupAgent } from "../../../local-agent-lab/dist/agents/foundation-setup.js";

export interface FoundationSetupInput {
  type: "text";
  text: string;
}

export interface FoundationSetupOutput {
  type: "text";
  text: string;
  dashboardPayload: DashboardPayload;
  liveExecution: false;
}

export async function run(input: FoundationSetupInput): Promise<FoundationSetupOutput> {
  const requestText = input.text.trim() || foundationSetupAgent.demoPrompt;

  return {
    type: "text",
    text: runAgent(foundationSetupAgent.id, requestText),
    dashboardPayload: buildDashboardPayload(foundationSetupAgent, requestText),
    liveExecution: false,
  };
}

// Future Agent Hub packaging should replace this local-only export with the
// approved Guild SDK wrapper after packaging scope is explicitly approved.
export const foundationSetupExemplar = {
  id: foundationSetupAgent.id,
  hubName: foundationSetupAgent.hubName,
  displayName: foundationSetupAgent.displayName,
  description: foundationSetupAgent.summary,
  mode: "one-shot",
  liveExecution: false,
  run,
} as const;

export default foundationSetupExemplar;
