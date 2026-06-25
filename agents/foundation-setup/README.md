# Knowledge Graph / Company Context Builder

First Guild-native Marketing OS source package. The directory is still named `foundation-setup` because it predates the confirmed V1 agent naming, but the intended Agent Hub-facing name is `marketing-os-company-context-builder`.

This directory intentionally omits `guild.json`. Guild creates and manages that file when the user explicitly approves CLI initialization.

## Purpose

The Company Context Builder turns a clean workspace and a user's raw business context into a reviewable Marketing OS context graph:

- Context Hub artifact drafts.
- A concise Guild Workspace Context draft.
- Missing-context and approval checklist.
- Recommended next agents in the confirmed V1 order.

## Local Checks

From the repository root:

```sh
npm run verify
```

## Future Guild Lifecycle

Only after explicit approval:

```sh
cd agents/foundation-setup
guild agent init --name marketing-os-company-context-builder --agent-type GUILD_TYPESCRIPT --template LLM --directory .
guild agent test
```

The directory is source-ready, not CLI-initialized. If the CLI generates or rewrites starter files during initialization, review the diff and preserve this `agent.ts` behavior before testing.

Do not save, publish, install, or create triggers without separate approval.
