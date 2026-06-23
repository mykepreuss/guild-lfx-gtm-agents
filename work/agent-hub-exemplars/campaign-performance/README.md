# Campaign Performance Exemplar

Local-only TypeScript package for the Campaign Performance Agent.

This is the first migration slice from the monolithic local lab toward per-agent Guild packages. It is intentionally not a publishable Guild package yet:

- No `guild.json`.
- No Guild lifecycle commands.
- No live SaaS reads, writes, spend, scheduling, or publishing.
- No Agent Hub visibility changes.

The package keeps its source in `src/agent.ts` and imports the compiled contract and runtime from `../../local-agent-lab/dist/`. That keeps the exemplar aligned with the shared `AgentDefinition` and `DashboardPayload` contracts while we prove the per-agent package boundary.

## Commands

Run from the repository root:

```sh
npm run verify:exemplars
```

Or run this package directly:

```sh
npm run verify --prefix work/agent-hub-exemplars/campaign-performance
```

The build step compiles the local lab first so this package can consume its generated JavaScript and TypeScript declarations.

## Future Packaging Step

When Agent Hub packaging is explicitly approved, this exemplar can become the source for a real Guild agent directory. That later step should add the approved Guild SDK wrapper and lifecycle config, then run validation before any publish or visibility decision.
