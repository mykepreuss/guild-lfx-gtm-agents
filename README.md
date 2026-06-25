# Guild Marketing OS Agents

Guild-native source workspace for an open-source Guild Marketing OS agent suite for GTM teams.

This repository is safe to share: private source notes, meeting context, and client-specific material belong in `_private/`, which is ignored by Git.

## Current Status

- Guild-native V1 source build.
- Guild package initialization and testing are approved for this implementation.
- Active Guild test workspace: `michaelpreuss/guild-marketing-os`.
- Agent package records are initialized under the `michaelpreuss` owner to align with the active workspace.
- All eight package directories include Guild-managed `guild.json` records and source-ready `agent.ts` prompts.
- No workspace installs, triggers, publishing, save steps, credentials, or visibility changes have been run.
- All eight V1 agents are committed deliverables.
- Old local labs, generated demo packets, and local-only exemplars have been removed.
- The Context Hub scaffold is present under `context-hub/`.
- License: Apache-2.0.

## V1 Goal

Create the smallest useful bridge from a clean Guild workspace to high-quality Guild Marketing OS agents:

1. A user enters business context into the Company Context Builder.
2. The Company Context Builder drafts approved Context Hub artifacts.
3. The workspace keeps a concise always-on context summary.
4. Specialized methods later move into Guild Skills.
5. Additional Guild Marketing OS agents reuse the approved context instead of carrying customer-specific facts inside their package code.

## Guild Architecture

Use Guild surfaces this way:

- **Agent package**: reusable behavior. The source starts in `agents/<agent>/agent.ts`.
- **Workspace Context**: short project summary and routing instructions that every agent should see.
- **Context Hub**: approved project artifacts owned by the user or workspace.
- **Skills**: reusable methods, tone guides, review rubrics, and playbooks activated only when relevant.
- **Triggers**: later scheduled or event-based runs, including a future read-only Context Steward.

Do not dump the whole Context Hub into Workspace Context. Keep Workspace Context concise because Guild injects it into every agent run.

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

Allowed only when intentionally reinitializing one of the existing V1 package records:

```sh
guild agent init --name <guild-marketing-os-name> --agent-type GUILD_TYPESCRIPT --template LLM --owner michaelpreuss --directory agents/<agent>
```

Not allowed until separately approved:

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

- `agents/catalog.json` - suite contract and per-agent Context Hub requirements.
- `agents/<agent>/` - Guild-native source packages.
- `context-hub/` - lightweight shared project context artifacts.
- `workspace-context/` - concise Guild Workspace Context draft.
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

The orchestrator/router remains a product pattern for later. For V1, the suite contract in `agents/catalog.json` is enough.

## Commands

```sh
npm run verify
npm run check:context
```

`npm run verify` is non-mutating. It validates the Guild-native scaffold and Context Hub contract.

## Guild Setup

Initialize or repair package directories with the Guild CLI and let Guild create `guild.json`:

```sh
guild agent init --name guild-marketing-os-company-context-builder --agent-type GUILD_TYPESCRIPT --template LLM --owner michaelpreuss --directory agents/foundation-setup
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```

Do not save, publish, install, configure credentials, or create triggers until those lifecycle steps are separately approved.

## References

- Guild docs: https://docs.guild.ai
- Guild CLI reference: https://docs.guild.ai/cli/getting-started
- Workspace Context: https://docs.guild.ai/platform/context
- Guild Skills: https://docs.guild.ai/platform/skills
- Agent Hub publishing: https://docs.guild.ai/platform/publish-to-agent-hub
