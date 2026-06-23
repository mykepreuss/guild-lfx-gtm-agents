import type { AgentDefinition } from "../types.js";
import { localLabAgentHubReadiness } from "../agent-hub-readiness.js";

export const campaignPerformanceAgent: AgentDefinition = {
  id: "campaign-performance",
  hubName: "marketing-os-campaign-performance",
  displayName: "Campaign Performance Agent",
  order: 8,
  metadata: {
    category: "gtm-marketing-os",
    tags: ["performance", "dashboard", "anomaly", "decisioning"],
    workstream: "performance",
    primaryUser: "Project Leader",
    sourceSafetyLevel: "public_fixture_only",
    visibilityReadiness: "local_lab_only",
    agentHubReadiness: localLabAgentHubReadiness,
  },
  aliases: ["campaign performance", "performance", "anomaly", "dashboard", "ab test"],
  keywords: ["campaign", "metrics", "insight", "ga4", "youtube analytics", "sprout", "cvent", "weekly narrative"],
  trigger: "Daily data refresh, with project leader reading the dashboard.",
  summary:
    "Reads campaign fixtures and returns plain-English insights, anomaly flags, weekly narrative, A/B winner picks, and drill-down links.",
  demoPrompt:
    "Run the Campaign Performance Agent for the Monday readout and call out anomalies, A/B winners, and recommended pause or scale actions.",
  questions: [
    "Which campaign or channel needs the readout?",
    "What metric movement counts as critical or urgent?",
    "Which decisions should the dashboard support this week?",
    "Should recommendations emphasize pause, scale, investigate, or learn?",
  ],
  assumptions: [
    "Paid search conversions are down while event registrations are ahead of pace.",
    "The project leader needs a concise Monday readout.",
  ],
  contextHub: {
    requiredArtifacts: ["project-context", "proof-and-constraints", "dashboard-signals"],
    optionalArtifacts: ["audience-segments", "channel-registry"],
    missingContextBehavior: "If live metrics are unavailable, label the readout fixture-backed and ask for the data source.",
    sourcePolicy: [
      "Fixture metrics are not live performance.",
      "Live numbers require approved context, dashboard data, or integrations.",
      "Recommendations that imply spend or platform action require approval.",
    ],
  },
  assetBlocks: [
    {
      title: "Metric Snapshot",
      body: [
        "| Channel | Signal | Change | Recommendation |",
        "| --- | --- | --- | --- |",
        "| Event email | registrations | +18% vs pace | Scale reminder wave to evaluator segment |",
        "| Paid search | qualified conversions | -24% week over week | Investigate landing page and query match |",
        "| LinkedIn organic | engagement | +9% | Reuse maintainer quote format |",
        "| YouTube | watch-through | flat | Keep as nurture, not conversion driver |",
      ].join("\n"),
    },
    {
      title: "Weekly Narrative",
      body:
        "The event campaign is ahead of registration pace, driven by email and organic social. Paid search is underperforming and should not receive additional budget until query quality and landing-page conversion are reviewed. The best near-term move is to scale the email reminder wave while using LinkedIn organic to reinforce the maintainer-led message.",
    },
    {
      title: "Anomalies And A/B Readout",
      body: [
        "Critical anomaly: paid search conversion rate dropped below the 2.5% guardrail.",
        "Opportunity anomaly: event email click-through is 1.4x the recent benchmark.",
        "A/B winner: subject line B, 'What changed this week in the project', wins on click rate and reply quality.",
      ].join("\n"),
    },
  ],
  approvalChecklist: [
    "Project leader confirms narrative matches operating reality.",
    "Marketing owner approves pause or scale recommendations.",
    "Analytics owner confirms thresholds and metric definitions.",
    "Campaign owner chooses next action.",
  ],
  approvalModel: {
    ownerRole: "Analytics Owner",
    requiredApprovers: ["Project Leader", "Marketing Owner", "Analytics Owner", "Campaign Owner"],
    decisionType: "choose_next_action",
  },
  dashboard: {
    workstream: "performance",
    ownerRole: "Analytics Owner",
    approvalStatus: "ready_for_review",
    decisionRequired: "Choose whether to pause, scale, investigate, or keep learning for each flagged channel.",
    blockers: ["Metric threshold confirmation", "Query quality review", "Landing-page conversion review"],
    nextAction: "Approve investigate, pause, or scale actions before connecting any live campaign-control adapter.",
    metrics: [
      { key: "critical_anomaly_count", label: "Critical anomalies", value: 1, unit: "alerts" },
      { key: "recommended_action_count", label: "Recommended actions", value: 3, unit: "actions" },
      { key: "ab_test_winner", label: "A/B winner", value: "subject_line_b" },
    ],
    sourceConfidence: "fixture_metric",
    downstreamAgents: ["event-promotion", "campaigns-paid-media", "audience-segmentation"],
  },
  dashboardSignals: {
    performance_readout_status: "ready",
    critical_anomaly_count: 1,
    ab_test_winner: "subject_line_b",
    recommended_action_count: 3,
    weekly_narrative_ready: true,
  },
  adapters: [
    ["Segment", "Pull daily channel and audience events."],
    ["HubSpot, Sprout Social, GA4, Cvent, YouTube Analytics", "Ingest live source metrics and generate dashboard insights."],
    ["Marketing Dashboard", "Update live dashboard cards and drill-down links."],
  ],
  nextAction:
    "Approve investigate, pause, or scale actions before connecting any live campaign-control adapter.",
};
