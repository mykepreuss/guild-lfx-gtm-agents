import type { AgentDefinition } from "../types.js";
import { localLabAgentHubReadiness } from "../agent-hub-readiness.js";

export const eventPromotionAgent: AgentDefinition = {
  id: "event-promotion",
  hubName: "marketing-os-event-promotion",
  displayName: "Event Promotion Agent",
  order: 5,
  metadata: {
    category: "gtm-marketing-os",
    tags: ["event", "promotion", "forecast", "paid"],
    workstream: "events",
    primaryUser: "Project Leader",
    sourceSafetyLevel: "public_fixture_only",
    visibilityReadiness: "local_lab_only",
    agentHubReadiness: localLabAgentHubReadiness,
  },
  aliases: ["event promotion", "event execution", "12 week plan", "attendance forecast"],
  keywords: ["milestone", "promotion", "webinar", "attendance", "forecast", "budget", "paid"],
  trigger: "Project leader provides event date, event URL, goals, and budget.",
  summary:
    "Creates a 12-week backwards promotion plan with email waves, social cadence, paid allocation, attendance forecast, and first-wave assets.",
  demoPrompt:
    "Run the Event Promotion Agent for an October webinar with 400 registrations as the goal and a small paid media budget.",
  questions: [
    "What is the event date and URL?",
    "What is the registration or attendance goal?",
    "What budget is available for paid support?",
    "Which audiences or personas should be prioritized?",
    "Which milestone needs earliest human review?",
  ],
  assumptions: [
    "The event is 12 weeks away with a 400-registration target.",
    "Paid support is limited and requires project leader approval.",
  ],
  assetBlocks: [
    {
      title: "12-Week Promotion Calendar",
      body: [
        "| Week | Milestone | Owner Review |",
        "| --- | --- | --- |",
        "| -12 | Confirm positioning, audience, landing page, UTM plan | Project leader |",
        "| -10 | Send announcement email and publish first social wave | Marketing owner |",
        "| -8 | Launch partner/sponsor amplification and retargeting test | Partner and paid owners |",
        "| -6 | Publish speaker/topic content and second email wave | Project leader |",
        "| -4 | Increase social cadence, compare registration pace to target | Events owner |",
        "| -2 | Final conversion push, waitlist plan, reminder emails | Events owner |",
        "| -1 | Speaker reminders, attendee prep email, social countdown | Project leader |",
      ].join("\n"),
    },
    {
      title: "Wave 1 Email Draft",
      body: [
        "Subject: Register for the October cloud native operations webinar",
        "Preview: A practical roadmap session for teams evaluating open source infrastructure patterns.",
        "Body: Join project maintainers for a live walkthrough of adoption patterns, roadmap priorities, and the questions teams should ask before standardizing cloud native operations. The session is built for technical evaluators, contributors, and operators who want a practical path into the project.",
        "CTA: Register for the webinar.",
      ].join("\n"),
    },
    {
      title: "Paid Budget And Forecast",
      body: [
        "Budget recommendation: 60% LinkedIn retargeting, 25% search intent, 15% sponsor/community amplification.",
        "Pace target: 80 registrations by week -8, 180 by week -5, 300 by week -2, 400 final.",
        "Red flag: fewer than 120 registrations by week -5 or conversion rate below 9% from landing page visits.",
      ].join("\n"),
    },
  ],
  approvalChecklist: [
    "Project leader approves registration goal and budget.",
    "Events owner approves milestone calendar.",
    "Marketing owner approves email and social cadence.",
    "Paid media owner approves spend threshold before launch.",
  ],
  approvalModel: {
    ownerRole: "Events Owner",
    requiredApprovers: ["Project Leader", "Events Owner", "Marketing Owner", "Paid Media Owner"],
    decisionType: "confirm_budget",
  },
  dashboard: {
    workstream: "events",
    ownerRole: "Events Owner",
    approvalStatus: "plan_ready",
    decisionRequired: "Approve milestone calendar, audience priority, registration goal, and paid threshold.",
    blockers: ["Paid media threshold approval", "Landing page URL", "Audience prioritization"],
    nextAction:
      "Approve the milestone calendar and paid threshold before any email, social, or ad drafts are created in live systems.",
    metrics: [
      { key: "registration_goal", label: "Registration goal", value: 400, unit: "registrants" },
      { key: "forecasted_attendance", label: "Forecasted attendance", value: 260, unit: "attendees" },
      { key: "weeks_to_event", label: "Weeks to event", value: 12, unit: "weeks" },
    ],
    sourceConfidence: "fixture_assumption",
    downstreamAgents: ["newsletter-composition", "social-content", "campaigns-paid-media", "campaign-performance"],
  },
  dashboardSignals: {
    event_promotion_status: "plan_ready",
    weeks_to_event: 12,
    registration_goal: 400,
    forecasted_attendance: 260,
    red_flag_threshold: "120 registrations by week -5",
  },
  adapters: [
    ["HubSpot", "Create campaign emails and schedule approved waves."],
    ["Sprout Social", "Queue approved event-promotion posts."],
    ["LinkedIn Ads", "Create draft paid campaign for approval."],
    ["Cvent", "Pull live registration pace and update forecast."],
  ],
  nextAction:
    "Approve the milestone calendar and paid threshold before any email, social, or ad drafts are created in live systems.",
};
