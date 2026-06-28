# Guild Marketing OS Repo Instructions

This repository is the source workspace for the Guild-native Marketing OS agent suite. Work from this repo root before running Git, package, Guild CLI, or verification commands.

## Operating Rules

- Use `michaelpreuss/guild-marketing-os` as the active Guild workspace for project tests unless the user specifies another workspace.
- Re-run `guild agent init` only when intentionally repairing or reinitializing an existing package record.
- `guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json` is allowed for package validation.
- Do not run save, publish, unpublish, workspace install, direct CLI workspace-context publish, trigger setup, credential setup, or visibility-changing Agent Hub commands unless the user explicitly asks for that lifecycle step.
- The Company Context Builder has one approved runtime persistence path: after a draft is approved, the user must send exactly `publish approved context to workspace context`; the agent then publishes only the managed compact workspace-context brief through the host-controlled `michaelpreuss~guild-marketing-os-workspace-context@1.0.1` bridge.
- Do not add or edit `guild.json` by hand. Guild manages it when an agent directory is initialized through the CLI.
- Informational Guild checks such as `guild --version`, `guild auth status`, `guild doctor`, and `guild agent init --help` are acceptable.
- Use `https://docs.guild.ai` for current Guild platform, CLI, SDK, workspace context, Skills, and Agent Hub behavior. Use `https://www.guild.ai/glossary` for Guild terminology.
- Keep confidential source material, client-specific context, generated bundles, and local experiments out of tracked repo files. Use sanitized fixtures and generic examples unless the user explicitly approves a real detail for the repo.

## Suite Shape

- `agents/catalog.json` is the suite contract: agent ids, intended Guild names, package directories, operating boundaries, and required approved context artifacts.
- The suite contains eight source packages under `agents/`.
- `agents/foundation-setup/` is the Knowledge Graph / Company Context Builder. It is the structured Zod-backed `agent()` root and must keep input/output schemas explicit, reviewable, and chat-compatible.
- The seven downstream agents are prompt-only review agents. They must set `useWorkspaceAgents: false` unless explicit orchestration is designed and approved.
- `context-hub/` holds source-controlled templates for approved context artifacts. These are not the runtime injection layer.
- `workspace-context/` holds maintainer reference text for Guild workspace context. Managed compact company-context briefs are owned by the Company Context Builder publish flow.
- `guild-skills/` holds source markdown and catalog records for private Guild Skills. Skills contain reusable methods, not customer-specific facts.
- `services/workspace-context-publish-bridge/` holds the host-controlled Blaxel bridge used for chat-native workspace-context publishing.

## Workspace Context And Artifacts

- Guild workspace context is the Platform Context runtime layer injected into every agent run. Keep it concise and do not turn it into a raw source corpus.
- The Company Context Builder drafts approved context artifacts and can publish a managed Guild workspace-context block after the exact two-step confirmation.
- The full approved source corpus remains in Company Context Builder session state for audit. Do not publish the raw corpus into Guild workspace context.
- The bridge handles workspace resolution, unmanaged-context preservation, managed-block replacement, draft creation, publish, and rollback metadata. The deployed agent should not call raw internal Guild workspace-context endpoints.
- Downstream agents treat sources in this order: published Guild workspace context, approved context artifacts, current-session user input, activated Skills for methods, and approved connected data.
- Do not embed customer-specific facts into Agent Hub package behavior.
- Run `npm run check:context` when changing `context-hub/`.

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
- Agent sources preserve the required structured Company Context Builder contract or shared review-agent output frame.
- Public source files avoid known private path markers.
- Removed local-lab directories are not recreated.

## Operating Boundaries

Marketing OS is a Guild-native review-agent suite, not an autonomous marketing execution system.

Supported behavior:

- Draft reviewable marketing artifacts from user-supplied or approved context.
- Mark missing facts as `TBD` and separate evidence from assumptions.
- Recommend approval gates, downstream handoffs, and AEO/readiness inputs.
- Persist approved company context to Guild workspace context through the Company Context Builder's exact two-step confirmation flow and host-controlled publish bridge.
- Block live publishing, scheduling, paid spend, CRM activation, credentials, workspace install, triggers, and visibility changes.

Not autonomous:

- No production context database beyond Guild workspace context and per-session Company Context Builder state.
- No source connectors, CRM/ad platform/social publishing adapters, or credentialed actions.
- No autonomous agent-to-agent orchestration.
- No production load, concurrency, permission, or workspace-composition validation for hundreds of users.

Before broad production use, add explicit orchestration, broader structured contracts where needed, durable context storage, connector permission models, operational observability, and load/security review.

## Public-Safety Rules

- Keep public docs generic: do not name confidential source artifacts, private people, buyers, or unconfirmed client details.
- Keep `agents/`, `context-hub/`, `workspace-context/`, `guild-skills/`, and `services/` free of confidential source material.
- If a detail came from private context, generalize it or keep it out of the repo.
- Prefer fixture project names and generic platform labels over real client systems unless approved.
