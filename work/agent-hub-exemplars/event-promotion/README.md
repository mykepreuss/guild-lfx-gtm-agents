# Event Promotion Exemplar

Local-only TypeScript package for the Event Promotion Agent.

This exemplar proves the future per-agent package boundary without creating a publishable Guild package:

- No `guild.json`.
- No Guild lifecycle commands.
- No live SaaS reads, writes, spend, scheduling, or publishing.
- No Agent Hub visibility changes.

The package keeps its source in `src/agent.ts` and imports the compiled contract and runtime from `../../local-agent-lab/dist/`.

