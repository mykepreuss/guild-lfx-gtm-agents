export const sharedContext = {
  project: "Open Source Cloud Native Project",
  projectLeader: "Project Leader",
  primaryAudience: "contributors, technical evaluators, sponsors, and project-adjacent operators",
  tone: "clear, practical, technically credible, and community-respectful",
  reviewState: "ready_for_project_leader_review",
  mode: "fixture-backed-local-v1",
  liveExecution: false,
  dateContext: "2026 planning fixture",
};

export const agents = [
  {
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
  },
  {
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
  },
  {
    id: "social-content",
    hubName: "marketing-os-social-content",
    displayName: "Social Content Agent",
    order: 3,
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
  },
  {
    id: "event-creation",
    hubName: "marketing-os-event-creation",
    displayName: "Event Creation Agent",
    order: 4,
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
  },
  {
    id: "event-promotion",
    hubName: "marketing-os-event-promotion",
    displayName: "Event Promotion Agent",
    order: 5,
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
  },
  {
    id: "audience-segmentation",
    hubName: "marketing-os-audience-segmentation",
    displayName: "Audience Segmentation Agent",
    order: 6,
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
  },
  {
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
  },
  {
    id: "campaign-performance",
    hubName: "marketing-os-campaign-performance",
    displayName: "Campaign Performance Agent",
    order: 8,
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
  },
  {
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
  },
];
