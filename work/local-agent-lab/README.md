# Local Agent Lab

Local-only workspace for the GTM Marketing OS agent suite.

This is not a remote agent package and intentionally has no platform lifecycle config. It lets us develop the nine-agent deliverable locally before any remote agent records are created.

## Shape

- Nine independent Agent Hub agent definitions.
- One orchestrator/router that can choose among them.
- Shared fixture context so the agents feel like one Marketing OS.
- Substantive fixture-backed outputs for review.
- Local smoke tests and demo packet generation.
- Per-agent TypeScript definition modules under `src/agents/`, with `src/agent-catalog.ts` kept as the ordered registry.
- Compiled JavaScript under `dist/` is generated locally and ignored by Git.

The lab is iterating toward Guild's Agent Hub. The acceptance bar is excellence, not mechanical completeness. Future GTM loops can become new agents when they add a distinct operating job.

The current flagship demo context should remain a generic open-source cloud-native project. Future live integrations are TBD. Dashboard payloads should evolve toward the logged-in Guild.ai state a project leader would use to track approvals, blockers, decisions, and performance.

## Agent Hub Boundary

Agent Hub packaging is not active in this lab. The public Guild docs describe publishing validated agent versions from real agent directories, including validation through `guild agent save --wait --publish` or later publication with `guild agent publish`.

Source: https://docs.guild.ai/platform/publish-to-agent-hub#agent-hub

Related references:

- Guild docs: https://docs.guild.ai
- Guild glossary: https://www.guild.ai/glossary

Those commands are intentionally out of scope here. This lab should only prepare the source material, demo packets, routing behavior, dashboard contract, and public-safety posture needed before the nine agents are split into real Agent Hub packages.

## Commands

```sh
npm install
npm run build
npm run verify
npm run generate:demos
```

Run `npm install` from the repository root so npm installs the local lab workspace dependencies.

`npm run build` compiles TypeScript from `src/` to ignored `dist/`.

`npm run verify` builds TypeScript, runs local-only tests, and checks that demo packets are current.

`npm run generate:demos` writes demo packets to:

`../../delivery/local-demo-packets/`

## Non-Goals

- No `guild agent init`.
- No `guild agent save`.
- No publishing.
- No workspace install.
- No live SaaS execution.

After scope is approved, each definition can be copied into real agent packages.
