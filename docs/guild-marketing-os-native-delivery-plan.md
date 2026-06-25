# Guild Marketing OS Native Delivery Plan

Status: canonical implementation plan
Owner: Project Leader
Last reviewed: 2026-06-25

## Summary

Build the Guild Marketing OS as eight Guild-native, team-installable TypeScript LLM agents using the Guild CLI, Guild Agent SDK, Agent Hub lifecycle, and Workspace Context model.

The implementation uses `guild-marketing-os-*` as the Guild-facing package prefix and stops after package initialization and testing. Saving, publishing, workspace install, public visibility, credentials, triggers, live integrations, and production automations require separate approval.

## Agent Suite

| Order | Package Name | Agent | Primary Job |
| --- | --- | --- | --- |
| 1 | `guild-marketing-os-company-context-builder` | Knowledge Graph / Company Context Builder | Build approved Context Hub artifacts, entity facts, proof points, AEO gaps, Workspace Context draft, approval checkpoints, and next-agent routing. |
| 2 | `guild-marketing-os-market-signal` | Market Signal Agent | Turn approved source excerpts into evidence-labeled market, search, answer-engine, developer, community, and social signals. |
| 3 | `guild-marketing-os-icp` | ICP Agent | Convert context and signal into personas, pains, objections, motivations, triggers, fit criteria, disqualifiers, and audience answer priorities. |
| 4 | `guild-marketing-os-audience-segmentation` | Audience Segmentation Agent | Convert ICP strategy into segment definitions, inclusion/exclusion rules, suppression logic, channel applicability, and list-building instructions. |
| 5 | `guild-marketing-os-messaging` | Messaging Agent | Produce positioning, narrative, message pillars, proof-backed claims, answer-ready blocks, boilerplate, tone guidance, and objection handling. |
| 6 | `guild-marketing-os-branding-pitch-deck` | Branding And Pitch Deck Agent | Turn approved messaging into brand architecture, voice and visual direction, pitch narrative, slide story, design briefs, and web/AEO recommendations. |
| 7 | `guild-marketing-os-social-monitoring-content` | Social Monitoring And Content Agent | Rank social/content opportunities, create content plans, draft channel-specific posts, and keep engagement behind approval. |
| 8 | `guild-marketing-os-campaigns-paid-media` | Campaigns And Paid Media Agent | Produce campaign briefs, paid-media plans, audience-message matrices, creative tests, landing-page recommendations, and performance loops. |

## Guild Lifecycle

Use Guild natively for source package initialization and local testing:

```sh
guild agent init --template LLM --agent-type GUILD_TYPESCRIPT --name <package-name> --directory <agent-dir>
guild agent test --workspace guild-marketing-os-starter-pack
```

Do not run these lifecycle steps until separately approved:

```sh
guild agent save
guild agent publish
guild agent unpublish
guild workspace agent add
guild workspace context publish
guild trigger create
guild credentials
```

## Context And Output Contract

All agents must use the same reviewable output frame:

- consumed context
- produced artifact
- assumptions and missing evidence
- approval gate
- AEO or AI-readiness contribution where relevant
- status or dashboard payload
- downstream handoff

The shared Context Hub artifacts are:

- `project-context`
- `messaging-source`
- `brand-kit`
- `audience-segments`
- `channel-registry`
- `proof-and-constraints`
- `dashboard-signals`

## Reference Project Rules

Internal reference projects may be used only for reusable implementation patterns: context graphs, evidence ledgers, signal scoring, social monitoring safety, and dashboard/status payload structures.

Do not copy private facts, private customer names, local filesystem paths, source filenames, or implementation-specific business context into public docs, package prompts, sample outputs, or committed artifacts.

## Design Guidance

Any generated demo surface, deck brief, web brief, or visual direction should follow Guild's public marketing site style at `guild.ai`:

- product-control-plane framing
- off-white surfaces with black or dark product panels
- restrained borders and 8-12px radii
- compact navigation, buttons, cards, and tables
- orange CTAs, active states, and attention markers
- mono-style pills and code/product cards
- clear build, deploy, govern, and share language

The Branding And Pitch Deck Agent should use this as the default Guild Marketing OS visual direction unless the user supplies an approved customer brand system.

## V1 Boundaries

V1 agents draft, reason, package, inspect, and recommend. They do not:

- publish social posts
- schedule content
- change ad spend
- activate CRM or audience lists
- approve legal, trademark, privacy, security, compliance, pricing, or performance claims
- deploy website/schema/metadata changes
- create production dashboards or live data warehouse integrations
- install into a Guild workspace or publish to Agent Hub without separate approval

## Implementation Order

1. Create this canonical plan file and delete superseded plan files.
2. Rename Guild-facing assets and references to `guild-marketing-os-*`.
3. Initialize or normalize all eight Guild agent packages with the Guild CLI.
4. Implement each agent as a multi-turn `llmAgent`.
5. Update verification to require initialized Guild package shape.
6. Run local repo checks and Guild init/test checks.

## Verification

Run:

```sh
npm run verify
npm run check:context
node scripts/context-hub-check.mjs
guild --version
guild auth status
guild doctor
```

Run `guild agent test --workspace guild-marketing-os-starter-pack` for each package when workspace access allows it. Stop before `save`, `publish`, workspace install, credentials, triggers, or visibility changes.
