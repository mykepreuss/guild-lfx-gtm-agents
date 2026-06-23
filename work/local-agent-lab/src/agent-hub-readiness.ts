import type { AgentHubReadiness } from "./types.js";

export const localLabAgentHubReadiness: AgentHubReadiness = {
  packageStatus: "not_packaged",
  validationStatus: "not_run",
  visibility: "draft_only",
  notes: [
    "Local lab definition only.",
    "No Guild lifecycle package has been created for this definition.",
    "Any Agent Hub exemplar remains local-only until packaging is approved.",
    "Do not save, publish, or change Agent Hub visibility until packaging is approved.",
  ],
};
