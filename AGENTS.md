# Guild Marketing OS Repo Instructions

This repository is the source workspace for the Guild-native Guild Marketing OS agent suite.

## Current Posture

- The user has explicitly approved Guild package initialization and testing for the eight V1 deliverable source packages.
- Re-running `guild agent init` and `guild agent test` is allowed only when maintaining these existing package records.
- Use `michaelpreuss/guild-marketing-os` as the active Guild workspace for project tests.
- Do not run save, publish, unpublish, workspace install, direct CLI workspace context publish, trigger setup, credential setup, or visibility-changing Agent Hub commands unless the user explicitly asks for that lifecycle step.
- The Company Context Builder has one approved runtime persistence path: after a draft is approved, the user must send exactly `publish approved context to workspace context` before the agent publishes its managed workspace-context block.
- Do not add or edit `guild.json` by hand. Guild manages it when an agent directory is initialized through the CLI.
- The Guild CLI may be installed locally. Informational checks such as `guild --version` and `guild agent init --help` are acceptable.
- Use https://docs.guild.ai for current Guild platform, CLI, SDK, and Agent Hub behavior. Use https://www.guild.ai/glossary for Guild terminology.
- Treat confidential source materials and client-specific context as private.
- Keep raw private source material in `_private/`, which is ignored by Git.
- Never commit `_private/`, `_local-guild-agent-prototype/`, `dist/`, or generated bundles.

## Guild-Native V1 Shape

- `agents/catalog.json` is the suite contract: agent ids, intended Guild names, status, package directories, and required approved context artifacts.
- All eight V1 deliverable source packages live under `agents/` after Guild CLI initialization.
- The package records are initialized under the `michaelpreuss` owner so they can test against the `michaelpreuss/guild-marketing-os` workspace.
- The Company Context Builder is the structured Zod-backed `agent()` root. Keep its input/output schemas explicit and keep its output reviewable.
- The seven downstream prompt-only review agents must set `useWorkspaceAgents: false` to avoid implicit agent-to-agent calls before orchestration is explicitly designed.
- `context-hub/` holds starter templates for approved user-owned company context artifacts.
- `workspace-context/guild-marketing-os-workspace-context.md` is the concise Guild workspace context draft. Keep unmanaged text short because Guild injects workspace context into every agent run; managed compact company-context briefs are owned by the Company Context Builder publish flow.
- `guild-skills/` holds source markdown for future Guild Skills. Skills should contain reusable methods, not customer-specific facts.
- Old local labs, generated delivery packets, and local-only Agent Hub exemplars have been removed.

## Verification

Run from the repo root:

```sh
npm run verify
```

`npm run verify` must be non-mutating and must not create remote agent records.

The verifier checks:

- Required approved context artifact files exist and have basic structure.
- Every agent-declared approved context artifact maps to a real `context-hub/<artifact>.md` file.
- Guild-native agent source directories declared in `agents/catalog.json` have the expected local files, including CLI-generated `guild.json`.
- Agent sources preserve the required structured foundation contract or review-agent output frame and deterministic workspace-agent boundary.
- Public source files avoid known private path markers.
- Removed local-lab directories are not recreated.

## Production Boundary

Treat this repo as a Guild-native starter pack until explicit production-autonomous work is added. The Company Context Builder now has a structured output contract; the suite still drafts, recommends, asks for missing evidence, and blocks unsafe live action requests. It must not be described as an autonomous production system for broad user rollout until durable context storage, broader structured contracts, orchestration, connector permissions, observability, and load/security validation are implemented.

## Context Artifacts

- Guild workspace context is the Platform Context runtime layer injected into every agent run.
- `context-hub/` is a source-controlled starter set of approved context artifact templates, not the runtime injection layer.
- The Company Context Builder drafts approved context artifacts and can publish a managed Guild workspace context block after the exact two-step confirmation. Other agents treat published workspace context as their first source of truth, then approved artifacts, current-session input, skills, and approved connected data.
- Do not embed customer-specific context into public Agent Hub package behavior.
- Keep customer-specific source material out of public context artifact files. Put private source material in `_private/` only.
- Run `npm run check:context` when changing `context-hub/`.

## Public-Safety Rules

- Keep public docs generic: do not name confidential source artifacts, private people, buyers, or unconfirmed client details.
- Keep `agents/`, `context-hub/`, `workspace-context/`, and `guild-skills/` free of confidential source material.
- If a detail came from private context, either generalize it or keep it in `_private/`.
- Prefer fixture project names and generic platform labels over real client systems unless approved.
