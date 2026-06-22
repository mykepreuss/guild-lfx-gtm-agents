import type { AgentDefinition } from "../types.js";

export const foundationSetupAgent: AgentDefinition = {
  id: "foundation-setup",
  hubName: "marketing-os-foundation-setup",
  displayName: "Foundation Setup Agent",
  order: 1,
  aliases: ["foundation", "brand setup", "brand kit", "web setup", "ai readiness"],
  keywords: ["brand", "messaging", "website", "boilerplate", "llms", "schema", "okr"],
  trigger: "First login or major project refresh.",
  summary:
    "Creates the initial marketing foundation: brand direction, messaging source, site plan, social channel registry, OKRs, and dashboard setup.",
  demoPrompt:
    "Run the Foundation Setup Agent for a cloud native project that needs clearer messaging, a refreshed project site, and a first dashboard for project leaders.",
  questions: [
    "What is the project mission in one sentence?",
    "Which audiences matter most this quarter?",
    "What brand, legal, or trademark constraints must be preserved?",
    "Which web and social channels should be active at launch?",
    "Which three OKRs should appear on the first dashboard?",
  ],
  assumptions: [
    "Project has an active community but inconsistent public messaging.",
    "The first dashboard should emphasize readiness, blockers, and weekly marketing momentum.",
  ],
  assetBlocks: [
    {
      title: "Messaging Source",
      body: [
        "25-word overview: Build and operate cloud native systems with an open source project that helps teams ship reliable infrastructure without locking themselves into one vendor.",
        "",
        "50-word overview: This project gives platform and infrastructure teams a community-led foundation for building reliable cloud native systems. It combines open governance, practical implementation patterns, and a contributor ecosystem so adopters can move faster while preserving choice, transparency, and long-term operational control.",
        "",
        "Boilerplate: The project is an open source cloud native initiative for teams that need reliable infrastructure patterns, transparent governance, and an active contributor community.",
      ].join("\n"),
    },
    {
      title: "Brand Kit Direction",
      body: [
        "- Visual posture: technical, dependable, community-led.",
        "- Palette: deep green for reliability, signal blue for infrastructure, neutral gray for documentation.",
        "- Typography: clear developer-documentation feel; avoid playful consumer styling.",
        "- Banner guidance: show system diagrams, contributor activity, and deployment pathways rather than abstract gradients.",
      ].join("\n"),
    },
    {
      title: "Website Launch Outline",
      body: [
        "Homepage sections: mission, who it is for, why now, getting started, production examples, community calls, contributor path, sponsor/member CTA.",
        "Primary CTA: Read the getting-started guide.",
        "Secondary CTA: Join the community meeting.",
        "Launch blockers: approved logo, final one-sentence mission, trademark review, maintainer quotes, analytics tags.",
      ].join("\n"),
    },
    {
      title: "Initial OKRs",
      body: [
        "1. Increase qualified project awareness among technical evaluators.",
        "2. Convert community interest into recurring participation.",
        "3. Give project leadership a weekly signal view across content, events, social, and campaigns.",
      ].join("\n"),
    },
  ],
  approvalChecklist: [
    "Project leader approves mission, audiences, and OKRs.",
    "Marketing advisor approves messaging source and channel plan.",
    "Design stakeholder approves brand direction before reuse.",
    "Legal or trademark owner confirms naming and logo constraints.",
    "Dashboard owner confirms first status signals.",
  ],
  dashboardSignals: {
    foundation_status: "needs_project_leader_review",
    brand_assets_approved: false,
    website_launch_readiness: "blocked_on_brand_and_trademark",
    channel_registry_complete: false,
    okr_count: 3,
  },
  adapters: [
    ["Content Hub", "Write approved messaging and brand artifacts to canonical project records."],
    ["CMS", "Create draft homepage and getting-started pages after approval."],
    ["Jira", "Open design, legal, and web launch tasks for the responsible owners."],
  ],
  nextAction:
    "Project leader should approve or edit the messaging source before design, web, or channel setup work begins.",
};
