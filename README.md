# Guild Marketing OS Agents

Guild-native source workspace for an open-source Guild Marketing OS agent suite for GTM teams.

This repository is safe to share: private source notes, meeting context, and client-specific material belong in `_private/`, which is ignored by Git.

## Current Status

- Guild-native V1 source build.
- Guild package initialization and testing are approved for this implementation.
- Active Guild test workspace: `michaelpreuss/guild-marketing-os`.
- Agent package records are initialized under the `michaelpreuss` owner to align with the active workspace.
- All eight deliverable package directories plus the chat-native intake entrypoint include Guild-managed `guild.json` records and source-ready `agent.ts` files.
- `guild-marketing-os-intake` is the workspace-friendly default chat entrypoint; it is a deterministic coded router that responds immediately, routes setup requests, collects minimum missing context, and can run Firecrawl-backed public-source research when explicitly requested.
- The Company Context Builder is a structured Zod-backed `agent()` that returns typed context artifacts plus a chat-renderable Markdown approval packet.
- The other seven V1 agents use Guild-validating one-shot review-packet mode; missing context is returned as focused questions and `TBD` markers rather than live follow-up turns.
- The seven prompt-only review agents explicitly set `useWorkspaceAgents: false` for deterministic behavior before autonomous orchestration is designed.
- A committed Guild smoke/adversarial test harness is available under `scripts/run-guild-e2e.mjs`.
- Current private/team workspace package publish and install steps have been run for testing in `michaelpreuss/guild-marketing-os`; no triggers, credentials, workspace context publish, or public visibility changes have been run.
- All eight V1 agents are committed deliverables.
- Old local labs, generated demo packets, and local-only exemplars have been removed.
- Approved context artifact templates are present under `context-hub/`.
- License: Apache-2.0.

## V1 Goal

Create the smallest useful bridge from a clean Guild workspace to high-quality Guild Marketing OS agents:

1. A user enters business context into the Company Context Builder.
2. The Company Context Builder returns typed approved context artifact drafts, approval gates, AEO readiness, a status payload, and downstream handoffs.
3. Guild workspace context keeps a concise always-on Platform Context summary.
4. Specialized methods later move into Guild Skills.
5. Additional Guild Marketing OS agents reuse the approved context instead of carrying customer-specific facts inside their package code.

## Guild Architecture

Use Guild surfaces this way:

- **Agent package**: reusable behavior. The source starts in `agents/<agent>/agent.ts`.
- **Guild workspace context**: short Platform Context summary and routing instructions that every agent receives at runtime.
- **Approved Context Artifacts**: reviewable project artifacts owned by the user or workspace; the starter source lives in `context-hub/`.
- **Skills**: reusable methods, tone guides, review rubrics, and playbooks activated only when relevant.
- **Triggers**: later scheduled or event-based runs, including a future read-only Context Steward.

Do not dump full context artifacts into Guild workspace context. Keep it concise because Guild injects workspace context into every agent run.

## Important Guild Boundary

The Guild CLI is installed locally for package initialization and testing. Current observed CLI version: `0.14.0`.

Allowed for this implementation and package maintenance:

```sh
guild --version
guild auth status
guild doctor
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
npm run verify
```

Allowed only when intentionally reinitializing one of the existing V1 package records or the intake entrypoint:

```sh
guild agent init --name <guild-marketing-os-name> --agent-type GUILD_TYPESCRIPT --template LLM --owner michaelpreuss --directory agents/<agent>
```

Not allowed until separately approved for the specific lifecycle change:

```sh
guild agent save
guild agent publish
guild agent unpublish
guild workspace agent add
guild workspace context publish
guild credentials
guild trigger create
```

`guild.json` is managed by Guild and should not be hand-written or edited by hand in this repo.

## Folder Map

- `agents/catalog.json` - suite contract and per-agent approved context artifact requirements.
- `agents/<agent>/` - Guild-native source packages.
- `context-hub/` - approved context artifact starter templates, not the always-injected runtime context.
- `workspace-context/` - concise Guild workspace context draft.
- `guild-skills/` - source markdown for future Guild Skills.
- `scripts/` - local non-mutating validation.
- `_private/` - local-only private notes, ignored by Git.

## Agent Suite

Confirmed V1 suite order:

1. Knowledge Graph / Company Context Builder
2. Market Signal Agent
3. ICP Agent
4. Audience Segmentation Agent
5. Messaging Agent
6. Branding And Pitch Deck Agent
7. Social Monitoring And Content Agent
8. Campaigns And Paid Media Agent

All eight agents are committed V1 deliverables. Use `agents/catalog.json` as the source of truth for package names, order, context requirements, and operating boundaries.

The Company Context Builder is the structured root of the suite. It uses Zod schemas to force a typed packet for approved context artifact drafts, evidence status, approval gates, AEO readiness, status payloads, and downstream handoffs. The downstream agents remain prompt-only review agents until their inputs or outputs need the same contract.

The Intake package is the current chat-native entrypoint and first-run router. It uses a coded `agent()` response instead of an LLM call so first-run setup guidance is immediate. When the user explicitly asks for public-source research, Intake attempts a Firecrawl search/scrape and returns URLs plus source snippets for approval. It does not call other agents or approve researched facts automatically. Autonomous orchestration remains a future product pattern.

## Production Readiness Boundary

V1 is a Guild-native review-agent starter pack, not a production autonomous marketing system.

Safe V1 behavior:

- Draft reviewable marketing artifacts from user-supplied or approved context.
- Mark missing facts as `TBD` and separate evidence from assumptions.
- Recommend approval gates, downstream handoffs, and AEO/readiness inputs.
- Block live publishing, scheduling, paid spend, CRM activation, credentials, workspace install, triggers, and visibility changes.

Not yet production autonomous:

- No durable shared state or production context database.
- No source connectors, CRM/ad platform/social publishing adapters, or credentialed actions.
- No autonomous agent-to-agent orchestration.
- No production load, concurrency, permission, or workspace-composition validation for hundreds of users.

Before broad production use, add explicit orchestration, broader structured contracts where needed, durable context storage, connector permission models, operational observability, and load/security review.

## Commands

```sh
npm run verify
npm run check:context
npm run test:guild-smoke
npm run test:guild-adversarial
```

`npm run verify` is non-mutating. It validates the Guild-native scaffold and approved context artifact contract.

The Guild test commands require an authenticated Guild CLI session and run live ephemeral tests against the configured workspace. Use `GUILD_WORKSPACE=<owner/workspace>` to override the default workspace.

## Guild Setup

Initialize or repair package directories with the Guild CLI and let Guild create `guild.json`:

```sh
guild agent init --name guild-marketing-os-company-context-builder --agent-type GUILD_TYPESCRIPT --template LLM --owner michaelpreuss --directory agents/foundation-setup
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```

Do not save, publish, install, configure credentials, publish workspace context, change visibility, or create triggers unless that lifecycle step is explicitly approved for the current change.

## References

- Guild docs: https://docs.guild.ai
- Guild CLI reference: https://docs.guild.ai/cli/getting-started
- Guild Platform Context / workspace context: https://docs.guild.ai/platform/context
- Guild Skills: https://docs.guild.ai/platform/skills
- Agent Hub publishing: https://docs.guild.ai/platform/publish-to-agent-hub
