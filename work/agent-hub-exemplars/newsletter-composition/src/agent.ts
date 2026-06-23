import {
  buildDashboardPayload,
  runAgent,
  type DashboardPayload,
} from "../../../local-agent-lab/dist/index.js";
import { newsletterCompositionAgent } from "../../../local-agent-lab/dist/agents/newsletter-composition.js";

export interface NewsletterCompositionInput {
  type: "text";
  text: string;
}

export interface NewsletterCompositionOutput {
  type: "text";
  text: string;
  dashboardPayload: DashboardPayload;
  liveExecution: false;
}

export async function run(input: NewsletterCompositionInput): Promise<NewsletterCompositionOutput> {
  const requestText = input.text.trim() || newsletterCompositionAgent.demoPrompt;

  return {
    type: "text",
    text: runAgent(newsletterCompositionAgent.id, requestText),
    dashboardPayload: buildDashboardPayload(newsletterCompositionAgent, requestText),
    liveExecution: false,
  };
}

// Future Agent Hub packaging should replace this local-only export with the
// approved Guild SDK wrapper after packaging scope is explicitly approved.
export const newsletterCompositionExemplar = {
  id: newsletterCompositionAgent.id,
  hubName: newsletterCompositionAgent.hubName,
  displayName: newsletterCompositionAgent.displayName,
  description: newsletterCompositionAgent.summary,
  mode: "one-shot",
  liveExecution: false,
  run,
} as const;

export default newsletterCompositionExemplar;
