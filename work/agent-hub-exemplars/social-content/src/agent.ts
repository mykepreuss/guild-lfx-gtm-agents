import {
  buildDashboardPayload,
  runAgent,
  type DashboardPayload,
} from "../../../local-agent-lab/dist/index.js";
import { socialContentAgent } from "../../../local-agent-lab/dist/agents/social-content.js";

export interface SocialContentInput {
  type: "text";
  text: string;
}

export interface SocialContentOutput {
  type: "text";
  text: string;
  dashboardPayload: DashboardPayload;
  liveExecution: false;
}

export async function run(input: SocialContentInput): Promise<SocialContentOutput> {
  const requestText = input.text.trim() || socialContentAgent.demoPrompt;

  return {
    type: "text",
    text: runAgent(socialContentAgent.id, requestText),
    dashboardPayload: buildDashboardPayload(socialContentAgent, requestText),
    liveExecution: false,
  };
}

// Future Agent Hub packaging should replace this local-only export with the
// approved Guild SDK wrapper after packaging scope is explicitly approved.
export const socialContentExemplar = {
  id: socialContentAgent.id,
  hubName: socialContentAgent.hubName,
  displayName: socialContentAgent.displayName,
  description: socialContentAgent.summary,
  mode: "one-shot",
  liveExecution: false,
  run,
} as const;

export default socialContentExemplar;
