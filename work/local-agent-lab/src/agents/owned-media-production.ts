import type { AgentDefinition } from "../types.js";

export const ownedMediaProductionAgent: AgentDefinition = {
  id: "owned-media-production",
  hubName: "marketing-os-owned-media-production",
  displayName: "Owned Media Production Agent",
  order: 7,
  aliases: ["owned media", "podcast", "youtube", "recording", "show notes", "content plan"],
  keywords: ["transcript", "episode", "riverside", "transistor", "clip", "distribution"],
  trigger: "New recording upload or content plan update.",
  summary:
    "Transforms an approved topic or recording into show notes, episode descriptions, social clips, distribution schedule, and newsletter teaser.",
  demoPrompt:
    "Turn a maintainer interview recording into show notes, episode descriptions, social clips, and a newsletter teaser.",
  questions: [
    "What recording, transcript, or topic should be processed?",
    "Who is the intended audience?",
    "Which quote or theme must be preserved?",
    "Which owned channels should receive distribution assets?",
  ],
  assumptions: [
    "A 30-minute maintainer interview has been uploaded.",
    "Distribution should reinforce an upcoming release and event.",
  ],
  assetBlocks: [
    {
      title: "Show Notes",
      body: [
        "Episode theme: what platform teams should know before adopting the project.",
        "Key sections: release context, adoption pattern, common migration concern, contributor path, webinar CTA.",
        "Pull quote candidate: The best adoption stories start small, prove operational fit, and then bring the community into the roadmap conversation.",
      ].join("\n"),
    },
    {
      title: "Episode Descriptions",
      body: [
        "Podcast: A maintainer-led conversation about practical adoption patterns, current roadmap priorities, and how contributors can get involved without waiting for perfect context.",
        "YouTube: Watch a project maintainer explain what changed in the latest release, where platform teams should start, and which community channels are best for deeper technical questions.",
      ].join("\n"),
    },
    {
      title: "Distribution Schedule",
      body: [
        "Day 0: publish podcast and YouTube metadata.",
        "Day 1: LinkedIn post with maintainer quote.",
        "Day 2: newsletter teaser linking to episode and webinar.",
        "Day 4: short social clip focused on adoption path.",
        "Day 7: recap post with community question prompt.",
      ].join("\n"),
    },
    {
      title: "Newsletter Teaser",
      body:
        "New maintainer interview: how teams are evaluating the project, what changed in the latest release, and the contributor path worth knowing before the October webinar.",
    },
  ],
  approvalChecklist: [
    "Project leader approves technical accuracy and sensitive quotes.",
    "Content owner approves episode title and description.",
    "Social owner approves clip and post variants.",
    "Distribution owner confirms schedule.",
  ],
  dashboardSignals: {
    owned_media_asset_status: "ready_for_review",
    episode_ready_for_review: true,
    clip_count: 2,
    distribution_channels: 4,
    newsletter_teaser_ready: true,
  },
  adapters: [
    ["Riverside or AssemblyAI", "Transcribe uploaded recordings."],
    ["Transistor and YouTube", "Create draft episode metadata."],
    ["Sprout Social and Beehiiv", "Queue approved distribution assets."],
  ],
  nextAction:
    "Review show notes and selected quote first; those decisions drive episode and distribution assets.",
};
