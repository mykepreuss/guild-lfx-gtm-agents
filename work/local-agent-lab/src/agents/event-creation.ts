import type { AgentDefinition } from "../types.js";
import { localLabAgentHubReadiness } from "../agent-hub-readiness.js";

export const eventCreationAgent: AgentDefinition = {
  id: "event-creation",
  hubName: "marketing-os-event-creation",
  displayName: "Event Creation Agent",
  order: 4,
  metadata: {
    category: "gtm-marketing-os",
    tags: ["event", "registration", "sponsor", "launch"],
    workstream: "events",
    primaryUser: "Project Leader",
    sourceSafetyLevel: "public_fixture_only",
    visibilityReadiness: "local_lab_only",
    agentHubReadiness: localLabAgentHubReadiness,
  },
  aliases: ["event setup", "event creation", "create event", "new event", "cvent page"],
  keywords: ["event", "registration", "capacity", "sponsor", "cfp", "cvent", "landing page"],
  trigger: "Project leader starts a create-new-event mission.",
  summary:
    "Builds the event creation packet: event record, registration page copy, capacity, sponsor tiers, confirmation email, and launch velocity signals.",
  demoPrompt:
    "Create a new regional meetup event with 150-person capacity, sponsor options, and a registration page.",
  questions: [
    "What is the event name, date, location, and format?",
    "What attendance goal and capacity should registration use?",
    "Are sponsor tiers required?",
    "What call to action should the page emphasize?",
    "Who approves the event page before launch?",
  ],
  assumptions: [
    "The event is a regional meetup with 150-person capacity.",
    "Registration and sponsor review must happen before promotion starts.",
  ],
  assetBlocks: [
    {
      title: "Event Record Draft",
      body: [
        "Event name: Cloud Native Operators Meetup",
        "Format: regional in-person meetup with livestream fallback.",
        "Capacity: 150 registrants, waitlist enabled at 140 confirmed.",
        "Goal: 110 attended, 35 new qualified project contacts, 10 contributor follow-ups.",
        "Owner: project leader approves content; events owner approves logistics.",
      ].join("\n"),
    },
    {
      title: "Registration Page Copy",
      body: [
        "Headline: Practical cloud native operations, led by the community.",
        "Subhead: Join project maintainers and local operators for a hands-on meetup covering roadmap priorities, deployment lessons, and ways to contribute.",
        "Primary CTA: Register for the meetup.",
        "Form fields: name, email, organization, role, project interest, dietary/accessibility needs, consent checkbox.",
      ].join("\n"),
    },
    {
      title: "Confirmation Email",
      body: [
        "Subject: You are registered for Cloud Native Operators Meetup",
        "Body: Thanks for registering. We will send venue details, agenda updates, and prep material before the event. Bring one operational challenge you want to discuss with maintainers and peers.",
      ].join("\n"),
    },
    {
      title: "Sponsor Tier Draft",
      body: [
        "Community supporter: logo on page and thank-you slide.",
        "Venue supporter: logo, welcome mention, and table space.",
        "Learning supporter: logo, table space, and post-event resource inclusion.",
      ].join("\n"),
    },
  ],
  approvalChecklist: [
    "Project leader confirms event details and capacity.",
    "Events owner approves registration form and confirmation email.",
    "Sponsor owner approves tier language if sponsors are included.",
    "Marketing owner approves launch copy and CTA.",
  ],
  approvalModel: {
    ownerRole: "Events Owner",
    requiredApprovers: ["Project Leader", "Events Owner", "Sponsor Owner", "Marketing Owner"],
    decisionType: "confirm_launch",
  },
  dashboard: {
    workstream: "events",
    ownerRole: "Events Owner",
    approvalStatus: "draft_ready",
    decisionRequired: "Confirm event details, registration form, sponsor language, and approval owner.",
    blockers: ["Event detail confirmation", "Sponsor tier review", "Registration form approval"],
    nextAction: "Confirm event details and approval owner, then prepare the event platform draft.",
    metrics: [
      { key: "capacity_target", label: "Capacity target", value: 150, unit: "registrants" },
      { key: "sponsor_tiers_defined", label: "Sponsor tiers defined", value: true },
      { key: "velocity_monitor_enabled", label: "Velocity monitor enabled", value: true },
    ],
    sourceConfidence: "fixture_assumption",
    downstreamAgents: ["event-promotion", "audience-segmentation", "campaigns-paid-media"],
  },
  dashboardSignals: {
    event_record_ready: true,
    registration_page_status: "draft_ready",
    capacity_target: 150,
    sponsor_tiers_defined: true,
    velocity_monitor_enabled: true,
  },
  adapters: [
    ["Cvent", "Create event, landing page, registration form, and confirmation email."],
    ["HubSpot Forms", "Create or sync approved registration fields."],
    ["Brand Vault", "Apply approved brand assets to event page."],
  ],
  nextAction:
    "Confirm event details and approval owner, then prepare the event platform draft.",
};
