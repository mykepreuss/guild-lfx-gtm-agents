import type { AgentDefinition } from "../types.js";
import { localLabAgentHubReadiness } from "../agent-hub-readiness.js";

export const socialContentAgent: AgentDefinition = {
  id: "social-content",
  hubName: "marketing-os-social-content",
  displayName: "Social Content Agent",
  order: 3,
  metadata: {
    category: "gtm-marketing-os",
    tags: ["social", "content", "distribution", "community"],
    workstream: "content",
    primaryUser: "Project Leader",
    sourceSafetyLevel: "public_fixture_only",
    visibilityReadiness: "local_lab_only",
    agentHubReadiness: localLabAgentHubReadiness,
  },
  aliases: ["social", "social content", "social posts", "linkedin posts", "x posts"],
  keywords: ["posts", "linkedin", "twitter", "mastodon", "bluesky", "sprout", "youtube"],
  trigger: "Weekly, with a Monday queue of five to ten post drafts.",
  summary:
    "Turns current project activity into platform-specific social drafts, mentions, hashtags, and a reviewable posting queue.",
  demoPrompt:
    "Create this week's social queue for a release update, maintainer quote, and October webinar CTA.",
  questions: [
    "Which announcement or community milestone matters most this week?",
    "Which platforms should be included?",
    "Are there accounts, maintainers, sponsors, or partner projects to mention?",
    "Should posts optimize for contributors, users, sponsors, or event attendance?",
  ],
  assumptions: [
    "LinkedIn and X are priority channels.",
    "One maintainer quote is approved for use in public copy.",
  ],
  assetBlocks: [
    {
      title: "Social Queue",
      body: [
        "| Channel | Draft | CTA | Review Note |",
        "| --- | --- | --- | --- |",
        "| LinkedIn | The latest project release makes the adoption path clearer for platform teams evaluating cloud native operations. The update adds deployment examples, contributor guidance, and cleaner docs for production review. | Read the release notes | Confirm maintainer quote before posting |",
        "| X | New release: clearer deployment examples, better contributor guidance, and docs built for teams evaluating production use. | Read more | Add release URL |",
        "| Mastodon | We shipped documentation and setup improvements shaped by community feedback. First-time contributors should now have a cleaner path into the project. | Join the contributor call | Confirm community meeting date |",
        "| LinkedIn | Join the October webinar for a practical walkthrough of adoption patterns, roadmap priorities, and ways to contribute. | Register | Confirm webinar landing page |",
        "| YouTube Community | New maintainer walkthrough coming this week: what changed in the release and how teams should evaluate the project. | Subscribe for the walkthrough | Confirm video publish timing |",
      ].join("\n"),
    },
    {
      title: "Tags And Mentions",
      body: [
        "Hashtags: #OpenSource, #CloudNative, #PlatformEngineering",
        "Mention queue: project account, lead maintainer, event account, foundation account.",
        "Risk note: sponsor mentions require explicit approval before scheduling.",
      ].join("\n"),
    },
  ],
  approvalChecklist: [
    "Project leader approves technical accuracy and community tone.",
    "Marketing owner approves platform formatting.",
    "Sponsor or partner mentions are confirmed before publication.",
    "Sensitive release timing is cleared.",
  ],
  approvalModel: {
    ownerRole: "Social Owner",
    requiredApprovers: ["Project Leader", "Marketing Owner", "Sponsor or Partner Owner"],
    decisionType: "approve_or_edit",
  },
  dashboard: {
    workstream: "content",
    ownerRole: "Social Owner",
    approvalStatus: "ready_for_review",
    decisionRequired: "Approve, edit, or reject each platform post before future scheduling.",
    blockers: ["Maintainer quote confirmation", "Release URL", "Community meeting date", "Sponsor mention approval"],
    nextAction:
      "Review technical accuracy first, then approve or reject each post before any scheduling adapter is connected.",
    metrics: [
      { key: "posts_waiting_for_review", label: "Posts waiting for review", value: 5, unit: "posts" },
      { key: "platform_count", label: "Platforms", value: 4, unit: "channels" },
      { key: "mentions_to_confirm", label: "Mentions to confirm", value: 2, unit: "mentions" },
    ],
    sourceConfidence: "fixture_assumption",
    downstreamAgents: ["newsletter-composition", "event-promotion", "campaign-performance"],
  },
  dashboardSignals: {
    social_queue_ready: true,
    posts_waiting_for_review: 5,
    platform_count: 4,
    engagement_target: "3.5%",
    mentions_to_confirm: 2,
  },
  adapters: [
    ["Sprout Social", "Create draft posts and schedule approved posts."],
    ["LinkedIn, X, Mastodon, Bluesky, YouTube", "Publish or queue approved platform variants."],
  ],
  nextAction:
    "Review technical accuracy first, then approve or reject each post before any scheduling adapter is connected.",
};
