# Contributing

This project is intended to become an open-source Guild-native Guild Marketing OS agent suite.

This project is licensed under Apache-2.0. See `LICENSE`.

## Contribution Goals

Contributions should improve one of these areas:

- Guild-native agent quality: clearer prompts, better approval packets, safer source policy, and stronger user review loops.
- Context quality: useful approved context artifacts, concise Guild workspace context, and clear missing-context behavior.
- Operating-system coherence: stronger cross-agent flow, project-leader experience, or weekly GTM cadence.
- Marketplace readiness: clearer Guild packaging boundaries, acceptance criteria, and future Agent Hub metadata.
- Public-share hygiene: generic examples that remain safe to share.

## Source Layout

- `agents/catalog.json` is the suite contract.
- `agents/<agent>/agent.ts` files are the Guild-native agent sources.
- `context-hub/` contains starter templates for approved company context artifacts.
- `workspace-context/guild-marketing-os-workspace-context.md` is the draft always-on Guild workspace context.
- `guild-skills/` contains source markdown for future Guild Skills.

Do not recreate the old local lab, generated demo packets, or local-only exemplar packages.

## Public-Safety Rules

- Do not add confidential source notes, relationship notes, buyer assumptions, NDA material, credentials, tokens, or client-specific details.
- Keep private local context in `_private/` only.
- Keep local prototype material in `_local-guild-agent-prototype/` only.
- Do not inspect, summarize, quote, stage, or depend on ignored private folders unless explicitly asked by the repository owner.
- Use generic fixture projects, generic roles, and generic platform labels unless a real detail is explicitly approved for public use.

## Guild Lifecycle Rules

- `guild agent init` and `guild agent test` are approved for this V1 implementation.
- Use `michaelpreuss/guild-marketing-os` for Guild agent tests unless the project owner changes the active workspace.
- Do not run `guild agent save`, `guild agent publish`, `guild agent unpublish`, install agents into workspaces, create triggers, publish workspace context, configure credentials, or change visibility without explicit approval.
- Do not hand-write or hand-edit `guild.json`. It is managed by the Guild CLI.
- Keep `npm run verify` non-mutating.

## Development Workflow

From the repo root:

```sh
npm run verify
```

When changing approved context artifacts, agent catalog entries, platform context, skill source, or Guild-native agent source, run verification before committing.

For agent prompt or behavior changes, run the fast Guild smoke while iterating. It covers the Company Context Builder/chat UX paths and avoids the slower all-agent LLM packet suite:

```sh
npm run test:guild-smoke
```

Before release-style publishes or broad workspace validation, run the full smoke and adversarial checks when Guild authentication is available:

```sh
npm run test:guild-smoke:full
npm run test:guild-adversarial
```

## Quality Bar

Before an agent is considered ready for Guild validation, it should have:

- A distinct GTM job and clear project-leader trigger.
- A concise Guild-native `agent.ts` source file.
- No customer-specific facts embedded in reusable package behavior.
- Clear approved context artifacts it expects.
- Missing-context behavior that asks or marks `TBD` instead of inventing facts.
- Structured contracts where they materially reduce ambiguity; the Company Context Builder is the first Zod-backed root agent.
- Deterministic prompt-only review-agent behavior with `useWorkspaceAgents: false` unless orchestration has been explicitly designed.
- Approval checks that map to real stakeholder workflows.
- Output that is specific, reviewable, and safe to approve or edit.

## Agent Hub Packaging Notes

Agent Hub publishing is a versioned lifecycle. The public Guild docs describe saving, validating, and publishing agent versions, with published agents becoming installable.

Source: https://docs.guild.ai/platform/publish-to-agent-hub

Treat these as future packaging requirements, not current repo commands:

- Each package will need a Guild-managed `guild.json`.
- Validation should be run with a wait step before any publish decision.
- A first publish is Team-installable by default, restricted to the organization.
- Public On-Hub availability is a separate visibility state and should require a public-safety review.
- Published-agent updates should be handled as new saved versions with clear version messages.
