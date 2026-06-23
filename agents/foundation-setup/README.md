# Foundation Setup Agent

First Guild-native Marketing OS source package.

This directory intentionally omits `guild.json`. Guild creates and manages that file when the user explicitly approves CLI initialization.

## Purpose

Foundation Setup turns a clean workspace and a user's raw business context into a reviewable Marketing OS foundation:

- Context Hub artifact drafts.
- A concise Guild Workspace Context draft.
- Missing-context and approval checklist.
- Recommended next agents.

## Local Checks

From the repository root:

```sh
npm run verify
```

## Future Guild Lifecycle

Only after explicit approval:

```sh
cd agents/foundation-setup
guild agent init --name marketing-os-foundation-setup --template LLM --directory .
guild agent test
```

The directory is source-ready, not CLI-initialized. If the CLI generates or rewrites starter files during initialization, review the diff and preserve this `agent.ts` behavior before testing.

Do not save, publish, install, or create triggers without separate approval.
