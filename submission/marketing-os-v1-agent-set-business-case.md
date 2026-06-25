# Marketing OS V1 Agent Set And Business Case

Status: sendable draft

## The Environment

Most AI marketing workflows start too late.

They ask an agent to write a post, draft a campaign, or build a deck before the system understands the company, market, audience, proof, constraints, and approval rules.

That creates three predictable problems:

- output sounds generic
- messaging drifts across channels
- answer engines cannot easily identify, summarize, or trust the company story
- humans spend their review time fixing context instead of improving judgment

Marketing OS V1 starts earlier. It builds the operating context first, then uses that context to produce reviewable marketing work and answer-engine optimization (AEO) assets.

## Recommendation

Build eight Guild-native agents as a reusable Marketing OS starter pack:

1. Knowledge Graph / Company Context Builder
2. Market Signal Agent
3. ICP Agent
4. Audience Segmentation Agent
5. Messaging Agent
6. Branding And Pitch Deck Agent
7. Social Monitoring And Content Agent
8. Campaigns And Paid Media Agent

The through-line is compound value. Each agent produces context or artifacts that make the next agent better.

That product shape also fits Guild's public platform model: a [control plane](https://www.guild.ai/) where agents are [built](https://www.guild.ai/platform/build), [deployed](https://www.guild.ai/platform/deploy), [governed](https://www.guild.ai/platform/govern), and [shared](https://www.guild.ai/platform/share) as reusable software artifacts.

## Why This Is Grounded

This set is not a literal row-by-row translation of a requirements list. That would create a long list of narrow workflow agents before the shared marketing context is ready.

The V1 set keeps the reusable pieces that matter most:

- foundation setup
- market and community signal
- ICP and Fit/Warmth logic
- audience segmentation and suppression rules
- messaging, AEO, and AI-readiness assets
- brand, web presence, entity clarity, and pitch story
- social, owned content, and digest workflows
- campaign, paid media, and performance loops
- dashboard or status updates from every agent

It also pushes back on the parts that are better later. Event execution, event setup, sponsor workflows, CFP operations, podcast setup, and YouTube channel setup are useful, but they depend on customer-specific systems, calendars, ownership, and approvals. They are Phase 2 workflows, not the right foundation for a reusable starter pack.

Market Signal is the deliberate addition. It is the listening layer that keeps ICP, messaging, content, and campaigns from being built around internal opinion.

## The Operating System

```text
Company context
  -> market signal
  -> ICP
  -> audience segments
  -> messaging
  -> brand and pitch
  -> social content
  -> campaigns and paid media
```

The workflow is deliberately focused:

```text
User supplies context
  -> agent drafts a reviewable artifact
  -> agent marks assumptions and missing evidence
  -> user approves, edits, or rejects
  -> agent recommends context updates and next actions
```

Decision rights stay with the human. Agents can draft, inspect, reason, package, and recommend. They do not publish, spend, activate CRM lists, approve brand identity, or make legal claims in V1.

## Suite-Level Value

- Faster setup: scattered context becomes approved artifacts and next-agent routing.
- Better consistency: downstream agents reuse the same source of truth.
- Lower hallucination risk: facts, proof points, assumptions, and unknowns are separated before execution work starts.
- Stronger AEO readiness: entity facts, proof-backed claims, answer-ready language, and web recommendations come from the same approved context.
- Reusable product surface: the agents are starter-pack assets that can be forked, configured, and shared with customer-owned context.
- Clear control plane: every agent declares what it does, works through governed access, and stops at approval gates before risky live actions.
- More progress per token: context compounds instead of being rebuilt in every prompt.

## Proposed Agent Set

| Order | Agent | What It Does | Business Value |
| --- | --- | --- | --- |
| 1 | Knowledge Graph / Company Context Builder | Turns raw company or project context into approved Context Hub artifacts, a concise Workspace Context draft, entity facts, proof points, gaps, assumptions, and next-agent routing. | Creates the shared factual base. Reduces repeated onboarding, inconsistent assumptions, context loss, and weak entity clarity across agents. |
| 2 | Market Signal Agent | Summarizes external market, community, search, answer-engine, developer, and social signals. Separates evidence from inference and identifies themes, pains, objections, peer positioning, and content opportunities. | Grounds strategy in what the market is actually saying. Helps sales and marketing align around evidence instead of internal opinion. |
| 3 | ICP Agent | Defines personas, target audiences, pain points, objections, motivations, buying or adoption triggers, fit criteria, and disqualifiers. | Clarifies who the system is for. Prevents broad messaging and gives later agents a precise target. |
| 4 | Audience Segmentation Agent | Converts ICP strategy into segment definitions, inclusion and exclusion rules, suppressions, channel applicability, and list-building instructions. | Bridges strategy and execution. Gives campaigns, content, and paid media practical targeting logic without assuming live CRM or ad-platform access. |
| 5 | Messaging Agent | Produces positioning, narrative, message pillars, proof-backed claims, answer-ready blocks, elevator pitch, boilerplate, tone guidance, objection handling, and claim constraints. | Creates the reusable language layer for humans and answer engines. Reduces rewrite cycles and keeps content, pitch, and campaign work consistent. |
| 6 | Branding And Pitch Deck Agent | Turns approved messaging into brand architecture, voice and visual direction, web and AEO recommendations, pitch narrative, slide-by-slide story, and design production briefs. | Moves from strategy to customer-facing story. Helps teams create brand-aligned pitch and web materials without pretending the agent owns final identity or legal approval. |
| 7 | Social Monitoring And Content Agent | Combines social/community monitoring with content opportunities, weekly content plans, channel-specific post drafts, proof checks, and recommended engagement opportunities. | Closes the loop between listening and content. Produces timely drafts while keeping approval in front of replies, scheduling, and live posts. |
| 8 | Campaigns And Paid Media Agent | Builds campaign briefs, paid-media plans, audience-target mapping, creative variant matrices, test plans, landing-page recommendations, and reporting loops. | Turns approved context into revenue-facing execution plans. Creates a path toward performance optimization while keeping spend and account changes behind approval gates. |

## Tradeoffs

The upside is consistency and compounding context. The tradeoff is that V1 will be more useful as an approved-work generator than as a fully automated marketing platform.

That is the right tradeoff.

Live publishing, CRM activation, ad-account changes, legal approval, and production dashboarding create operational risk. They should come after the reusable agent behavior is validated.

This is also the stronger Guild-native product motion. The durable value is not a pile of one-off automations. It is a versioned starter pack with visible runs, governed credentials, typed inputs and outputs, and reusable patterns that improve as teams install, fork, and adapt them.

## V1 Scope Boundary

V1 should deliver working local Guild-native source agents and demoable outputs for the full suite, with package shapes suitable for later validation, versioning, and Agent Hub sharing once approved.

V1 should not claim:

- live publishing to social channels
- live ad account changes or automated spend optimization
- live CRM or list activation
- production legal, trademark, or brand identity approval
- full production deployment across customer systems
- real-time dashboards or data warehouse integration
- ongoing maintenance

Those become follow-on phases once the agent suite proves it can produce useful work behind approval gates.

## Success Metrics

The V1 is working if a reviewer can see:

- eight reusable Guild-native source agents
- clear context flow from one agent to the next
- substantive sample outputs, not placeholder responses
- explicit approval gates for risky actions
- clear separation between approved facts, assumptions, and missing evidence
- explicit AEO outputs for entity clarity, answer-ready messaging, and web recommendations
- future integration paths that are useful but not required for V1

The practical metrics:

- setup cycle time goes down
- review cycles go down
- message consistency goes up
- unsupported claims go down
- downstream agents need less repeated context
