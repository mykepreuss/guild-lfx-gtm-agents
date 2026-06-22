# Contributing

This project is intended to become an open-source local-first Marketing OS agent suite.

This project is licensed under Apache-2.0. See `LICENSE`.

## Contribution Goals

Contributions should improve one of these areas:

- Agent quality: clearer workflows, better generated assets, stronger approval checks, or more useful dashboard signals.
- Operating-system coherence: stronger cross-agent flow, routing, project-leader experience, or weekly GTM cadence.
- Local-first safety: deterministic generation, non-mutating verification, fixture-backed demos, or public-share hygiene.
- Marketplace readiness: clearer Agent Hub packaging boundaries, acceptance criteria, or future adapter contracts.
- Demo quality: richer generic open-source cloud-native examples that remain public-safe.

Use TypeScript for local lab source changes under `work/local-agent-lab/src/`. The generated `dist/` directory is ignored and should not be committed.

## Public-Safety Rules

- Do not add private source notes, meeting transcripts, deck-derived details, relationship notes, buyer assumptions, NDA material, credentials, tokens, or client-specific details.
- Keep private local context in `_private/` only.
- Keep local prototype material in `_local-guild-agent-prototype/` only.
- Do not inspect, summarize, quote, stage, or depend on ignored private folders unless explicitly asked by the repository owner.
- Use generic fixture projects, generic roles, and generic platform labels unless a real detail is explicitly approved for public use.

## Local-First Rules

- Do not run remote agent lifecycle commands.
- Do not add platform lifecycle config files until Agent Hub packaging is approved.
- Do not publish, install, sync, schedule, spend, or modify live systems from this repo.
- Keep `npm run verify` non-mutating.
- Use `npm run generate:demos` as the only expected path for rewriting generated demo packets.

## Guild References

The Guild CLI is available locally for approved checks and future packaging work. Current observed CLI version: `0.13.0`.

Use these sources when changing platform-facing terminology, packaging notes, or Agent Hub readiness criteria:

- Guild docs: https://docs.guild.ai
- Agent Hub docs: https://docs.guild.ai/platform/publish-to-agent-hub#agent-hub
- Guild glossary: https://www.guild.ai/glossary

The CLI being installed does not make lifecycle commands in scope. Packaging, install, publish, visibility, credential, workspace, or live-integration commands still require explicit approval.

## Development Workflow

From the repo root:

```sh
npm install
npm run verify
```

When changing agent definitions, routing, runtime output, or packet format:

```sh
npm run generate:demos
npm run verify
```

Commit source changes and generated `delivery/local-demo-packets/` updates together.

## Quality Bar

The marketplace target is Guild's Agent Hub. The acceptance bar is excellence, but the suite is still iterating.

Before an agent is considered ready for Agent Hub packaging, it should have:

- A distinct GTM job and clear project-leader trigger.
- Public-safe fixture inputs.
- Generated assets that are specific, reviewable, and strategically useful.
- Approval checks that map to real stakeholder workflows.
- Dashboard signals that can support the logged-in Guild.ai experience.
- Future adapter notes that describe handoffs without implying live execution.
- Smoke tests and demo packet checks that pass locally.

## Agent Hub Packaging Notes

Agent Hub publishing is a versioned lifecycle. The public Guild docs describe saving, validating, and publishing agent versions, with published agents becoming installable.

Source: https://docs.guild.ai/platform/publish-to-agent-hub#agent-hub

Treat these as future packaging requirements, not current repo commands:

- Each package will need to be a real agent directory with `guild.json`.
- Validation should be run with a wait step before any publish decision.
- A first publish is Team-installable by default, restricted to the organization.
- Public On-Hub availability is a separate visibility state and should require a public-safety review.
- The public docs do not currently define which source fields populate the Hub listing, so maintain an explicit metadata checklist before packaging.
- Published-agent updates should be handled as new saved versions with clear version messages.
