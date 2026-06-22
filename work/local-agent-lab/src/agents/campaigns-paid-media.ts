import type { AgentDefinition } from "../types.js";

export const campaignsPaidMediaAgent: AgentDefinition = {
  id: "campaigns-paid-media",
  hubName: "marketing-os-campaigns-paid-media",
  displayName: "Campaigns and Paid Media Agent",
  order: 9,
  aliases: ["paid media", "campaigns", "campaign structure", "google ads", "linkedin ads", "reddit ads"],
  keywords: ["campaign", "budget", "utm", "ad creative", "roas", "pause", "scale", "sem"],
  trigger: "Project leader sets budget and goal, then reviews the proposed campaign structure.",
  summary:
    "Defines paid and organic campaign hierarchy around market segment, ICP, message, goal, budget, creative variants, UTMs, and guardrails.",
  demoPrompt:
    "Create a paid media campaign structure for an October webinar with LinkedIn, Google Search, Reddit, UTMs, and pause-scale guardrails.",
  questions: [
    "What goal and budget should the campaign use?",
    "Which persona or segment should be targeted?",
    "Which message and offer should anchor the campaign?",
    "What spend threshold requires approval?",
    "Which platforms are in scope?",
  ],
  assumptions: [
    "Budget is small enough that approval thresholds matter.",
    "Campaign should include both organic and paid tactics.",
  ],
  assetBlocks: [
    {
      title: "Campaign Hierarchy",
      body: [
        "Objective: drive qualified webinar registrations from technical evaluators.",
        "Primary segment: technical evaluators with cloud native operations interest.",
        "Offer: maintainer-led roadmap and adoption walkthrough.",
        "Budget fixture: $5,000 total, with any single-platform increase over 20% requiring approval.",
      ].join("\n"),
    },
    {
      title: "Creative Variants",
      body: [
        "LinkedIn A: Join maintainers for a practical walkthrough of the project roadmap and adoption patterns.",
        "LinkedIn B: Evaluating open source infrastructure options? Bring your questions to the October webinar.",
        "Search ad: Cloud native operations webinar - maintainer-led roadmap and adoption session.",
        "Reddit post: We are hosting a practical project walkthrough for operators evaluating open source infrastructure patterns.",
      ].join("\n"),
    },
    {
      title: "Budget And Guardrails",
      body: [
        "LinkedIn: $2,600 for evaluator targeting and retargeting.",
        "Google Search: $1,500 for high-intent roadmap and webinar queries.",
        "Reddit: $600 for community testing.",
        "Reserve: $300 for winning-channel scale after week one.",
        "Pause rule: pause ad set after 500 clicks with conversion rate below 2%.",
        "Scale rule: move reserve budget to any channel with cost per qualified registration 25% below target.",
      ].join("\n"),
    },
    {
      title: "UTM Plan",
      body:
        "utm_source={platform}&utm_medium=paid&utm_campaign=oct_webinar&utm_content={persona}_{creative_variant}",
    },
  ],
  approvalChecklist: [
    "Project leader approves goal, budget, and spend threshold.",
    "Marketing owner approves message and creative variants.",
    "Audience owner approves targeting logic.",
    "Paid media owner approves platform setup before launch.",
  ],
  dashboardSignals: {
    campaign_structure_status: "ready_for_budget_review",
    budget_pending_approval: true,
    creative_variant_count: 4,
    utm_plan_ready: true,
    pause_scale_guardrails_set: true,
  },
  adapters: [
    ["Google Ads, LinkedIn Ads, Reddit Ads", "Create draft campaigns and pause or scale within approved guardrails."],
    ["HubSpot", "Sync campaign membership and conversion status."],
    ["Segment", "Track ROAS and campaign performance by audience."],
  ],
  nextAction:
    "Approve budget, message, and guardrails before any paid-media adapter creates or modifies campaigns.",
};
