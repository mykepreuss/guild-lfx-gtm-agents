import type { AgentDefinition } from "../types.js";

export const newsletterCompositionAgent: AgentDefinition = {
  id: "newsletter-composition",
  hubName: "marketing-os-newsletter-composition",
  displayName: "Newsletter Composition Agent",
  order: 2,
  aliases: ["newsletter", "email newsletter", "weekly newsletter", "substack", "beehiiv"],
  keywords: ["email", "digest", "subject line", "subscriber", "send list", "campaign"],
  trigger: "Weekly or on demand when the project leader asks for this week's newsletter.",
  summary:
    "Aggregates activity and drafts a ready-to-review newsletter with subject lines, sections, send list, and scheduling recommendation.",
  demoPrompt:
    "Draft this week's newsletter for contributors and technical evaluators with a release update, event CTA, and community highlight.",
  questions: [
    "What is the primary story this week?",
    "Which GitHub, blog, social, or event sources should be included?",
    "Which audience segment should receive the send?",
    "Should the tone be technical, executive, community, or sponsor-oriented?",
  ],
  assumptions: [
    "The release update is the lead story.",
    "The send should go to contributors and technical evaluators, excluding recent event-only registrants.",
  ],
  assetBlocks: [
    {
      title: "Subject Line Options",
      body: [
        "A. New release patterns for reliable cloud native operations",
        "B. This week: release notes, maintainer call, and October webinar",
        "C. What changed this week in the project",
      ].join("\n"),
    },
    {
      title: "Newsletter Draft",
      body: [
        "Lede: This week the project shipped a release focused on operational clarity, better deployment examples, and a cleaner path for first-time contributors.",
        "",
        "Section 1 - Release update: The latest release improves setup guidance, expands deployment examples, and closes several documentation gaps raised by the community.",
        "",
        "Section 2 - Community highlight: Maintainers reviewed three first-time contributor PRs this week. The strongest signal is that onboarding friction is now visible enough to improve.",
        "",
        "Section 3 - Event CTA: Join the October webinar for a practical walkthrough of the project roadmap and adoption patterns.",
        "",
        "CTA: Register for the webinar and bring one question about your current platform workflow.",
      ].join("\n"),
    },
    {
      title: "Send Plan",
      body: [
        "Segment: active contributors, documentation subscribers, and technical evaluators who engaged in the last 120 days.",
        "Suppressions: unsubscribed contacts, sponsor-only contacts, and people who received two event emails in the last seven days.",
        "Recommended send: Tuesday 09:30 recipient-local time.",
      ].join("\n"),
    },
  ],
  approvalChecklist: [
    "Project leader approves subject line and lead story.",
    "Marketing owner confirms segment and suppressions.",
    "Community owner confirms project activity is accurate.",
    "Final reviewer confirms links, dates, and calls to action.",
  ],
  dashboardSignals: {
    newsletter_draft_ready: true,
    subscriber_segment_size: 4200,
    scheduled_send_time: "Tuesday 09:30 recipient-local",
    open_rate_target: "34%",
    click_rate_target: "5.5%",
  },
  adapters: [
    ["GitHub", "Pull merged PRs, releases, issues, and contributor highlights."],
    ["Beehiiv or HubSpot", "Create draft email and queue approved sends."],
    ["Member Data Platform", "Resolve active member and contributor segments."],
  ],
  nextAction:
    "Approve one subject line and mark any sections that should be shortened before scheduling.",
};
