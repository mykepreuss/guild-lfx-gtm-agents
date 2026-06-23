import type { AgentDefinition } from "../types.js";
import { localLabAgentHubReadiness } from "../agent-hub-readiness.js";

export const audienceSegmentationAgent: AgentDefinition = {
  id: "audience-segmentation",
  hubName: "marketing-os-audience-segmentation",
  displayName: "Audience Segmentation Agent",
  order: 6,
  metadata: {
    category: "gtm-marketing-os",
    tags: ["audience", "segmentation", "personas", "consent"],
    workstream: "audience",
    primaryUser: "Project Leader",
    sourceSafetyLevel: "public_fixture_only",
    visibilityReadiness: "local_lab_only",
    agentHubReadiness: localLabAgentHubReadiness,
  },
  aliases: ["audience", "segmentation", "segments", "personas", "hubspot sync"],
  keywords: ["persona", "segment", "identity", "subscriber", "re-engagement", "target market"],
  trigger: "New event, new campaign, or quarterly target-market review.",
  summary:
    "Drafts personas and segment definitions from contributor and member signals, then prepares sync and re-engagement recommendations.",
  demoPrompt:
    "Create audience segments for a contributor re-engagement campaign and October webinar promotion.",
  questions: [
    "Which campaign, event, or quarterly review is this segment for?",
    "Which audiences should be included or excluded?",
    "What contact-frequency guardrail should protect community members?",
    "Which dormant audience should be re-engaged?",
  ],
  assumptions: [
    "Segments must reduce repeated outreach to the same individuals.",
    "Personas combine contributor activity and member interest signals.",
  ],
  contextHub: {
    requiredArtifacts: ["project-context", "messaging-source", "audience-segments", "proof-and-constraints"],
    optionalArtifacts: ["dashboard-signals", "channel-registry"],
    missingContextBehavior: "Ask for missing source data, consent rules, or segment goals before recommending sync.",
    sourcePolicy: [
      "Missing segment data becomes an explicit question.",
      "Do not infer audience priority without approved context.",
      "Mark unproven segment assumptions as fixture assumptions or TBD.",
    ],
  },
  assetBlocks: [
    {
      title: "Persona Drafts",
      body: [
        "Persona 1 - Active Maintainer: already contributes, values roadmap clarity, needs fewer generic marketing touches and more decision context.",
        "Persona 2 - Technical Evaluator: engaged with docs or events, comparing project fit, needs proof, reference architectures, and getting-started paths.",
        "Persona 3 - Dormant Contributor: contributed or attended before, has not engaged in 180 days, responds best to specific ways back in.",
      ].join("\n"),
    },
    {
      title: "Segment Criteria",
      body: [
        "Webinar target: technical evaluators with docs visits, event attendance, or newsletter clicks in the last 120 days, excluding active maintainers.",
        "Contributor re-engagement: contributors with no merged PR, issue comment, event attendance, or newsletter click in 180 days.",
        "Sponsor-safe audience: member contacts with explicit marketing consent and no community-only suppression flag.",
      ].join("\n"),
    },
    {
      title: "Suppression Rules",
      body: [
        "Suppress anyone who received two event promotions in the last seven days.",
        "Suppress unsubscribed, legal hold, community-only, and sponsor-contract-only contacts.",
        "Route ambiguous consent records to data owner review before use.",
      ].join("\n"),
    },
  ],
  approvalChecklist: [
    "Project leader approves persona names and use cases.",
    "Marketing owner approves segment criteria.",
    "Data owner confirms source fields and suppression rules.",
    "Campaign owner confirms contact-frequency guardrails.",
  ],
  approvalModel: {
    ownerRole: "Data Owner",
    requiredApprovers: ["Project Leader", "Marketing Owner", "Data Owner", "Campaign Owner"],
    decisionType: "confirm_segment",
  },
  dashboard: {
    workstream: "audience",
    ownerRole: "Data Owner",
    approvalStatus: "ready_for_review",
    decisionRequired: "Approve persona names, segment criteria, consent guardrails, and suppressions.",
    blockers: ["Source field confirmation", "Consent review", "Contact-frequency guardrail approval"],
    nextAction: "Approve or edit plain-language segment criteria before any future adapter writes lists to marketing systems.",
    metrics: [
      { key: "eligible_contact_count", label: "Eligible contacts", value: 6800, unit: "contacts" },
      { key: "suppression_count", label: "Suppressed contacts", value: 940, unit: "contacts" },
      { key: "re_engagement_candidates", label: "Re-engagement candidates", value: 510, unit: "contacts" },
    ],
    sourceConfidence: "fixture_assumption",
    downstreamAgents: ["newsletter-composition", "event-promotion", "campaigns-paid-media"],
  },
  dashboardSignals: {
    segment_review_status: "ready",
    persona_count: 3,
    eligible_contact_count: 6800,
    suppression_count: 940,
    re_engagement_candidates: 510,
  },
  adapters: [
    ["Audience Studio or Segment", "Write approved segment definitions to segmentation platform."],
    ["HubSpot", "Create or update target lists."],
    ["Identity Platform", "Resolve live identity and consent fields."],
  ],
  nextAction:
    "Approve or edit plain-language segment criteria before any future adapter writes lists to marketing systems.",
};
