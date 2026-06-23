# GTM Marketing OS Agents

Guild-native source workspace for an open-source Marketing OS agent suite for GTM teams.

This repository is safe to share: private source notes, meeting context, and client-specific material belong in `_private/`, which is ignored by Git.

## Current Status

- Guild-native Phase 1 local setup.
- No remote agent records are created from this repo unless explicitly approved.
- No workspace installs, triggers, publishing, or visibility changes have been run.
- The first platform-facing package is `agents/foundation-setup/`.
- The old local lab, generated demo packets, and local-only exemplars have been removed.
- The Context Hub scaffold is present under `context-hub/`.
- License: Apache-2.0.

## Phase 1 Goal

Create the smallest useful bridge from a clean Guild workspace to high-quality Marketing OS agents:

1. A user enters business context into Foundation Setup.
2. Foundation Setup drafts approved Context Hub artifacts.
3. The workspace keeps a concise always-on context summary.
4. Specialized methods later move into Guild Skills.
5. Additional Marketing OS agents reuse the approved context instead of carrying customer-specific facts inside their package code.

## Guild Architecture

Use Guild surfaces this way:

- **Agent package**: reusable behavior. The source starts in `agents/<agent>/agent.ts`.
- **Workspace Context**: short project summary and routing instructions that every agent should see.
- **Context Hub**: approved project artifacts owned by the user or workspace.
- **Skills**: reusable methods, tone guides, review rubrics, and playbooks activated only when relevant.
- **Triggers**: later scheduled or event-based runs, including a future read-only Context Steward.

Do not dump the whole Context Hub into Workspace Context. Keep Workspace Context concise because Guild injects it into every agent run.

## Important Guild Boundary

The Guild CLI is installed locally for informational checks and future packaging work. Current observed CLI version: `0.13.0`.

Allowed without additional approval:

```sh
guild --version
guild agent init --help
guild agent test --help
npm run verify
```

Not allowed until explicitly approved:

```sh
guild agent init
guild agent save
guild agent publish
guild agent unpublish
guild workspace context publish
guild trigger create
```

`guild.json` is managed by Guild and should not be hand-written in this repo.

## Folder Map

- `agents/catalog.json` - suite contract and per-agent Context Hub requirements.
- `agents/foundation-setup/` - first Guild-native source package.
- `context-hub/` - lightweight shared project context artifacts.
- `workspace-context/` - concise Guild Workspace Context draft.
- `guild-skills/` - source markdown for future Guild Skills.
- `docs/` - setup and operating docs.
- `scripts/` - local non-mutating validation.
- `research/` - public or approved source captures only.
- `submission/` - sendable material only.
- `delivery/` - optional future delivery artifacts.
- `_private/` - local-only private notes, ignored by Git.

## Agent Suite

Phase 1 package:

1. Foundation Setup Agent

Planned next agents:

2. Newsletter Composition Agent
3. Social Content Agent
4. Event Creation Agent
5. Event Promotion Agent
6. Audience Segmentation Agent
7. Owned Media Production Agent
8. Campaign Performance Agent
9. Campaigns and Paid Media Agent

The orchestrator/router remains a product pattern for later. For Phase 1, the suite contract in `agents/catalog.json` is enough.

## Commands

```sh
npm run verify
npm run check:context
```

`npm run verify` is non-mutating. It validates the Guild-native scaffold and Context Hub contract.

## Future Guild Setup

When the user explicitly approves creating the first remote Guild agent record, use the CLI from the Foundation Setup directory and let Guild create `guild.json`. This may generate starter files; preserve the reviewed `agent.ts` source in Git if the CLI rewrites anything:

```sh
cd agents/foundation-setup
guild agent init --name marketing-os-foundation-setup --agent-type GUILD_TYPESCRIPT --template LLM --directory .
guild agent test
```

Do not save, publish, install, or create triggers until those lifecycle steps are separately approved.

## References

- Guild docs: https://docs.guild.ai
- Guild CLI reference: https://docs.guild.ai/cli/getting-started
- Workspace Context: https://docs.guild.ai/platform/context
- Guild Skills: https://docs.guild.ai/platform/skills
- Agent Hub publishing: https://docs.guild.ai/platform/publish-to-agent-hub
