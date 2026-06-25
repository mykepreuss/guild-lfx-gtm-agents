# GTM Marketing OS Repo Instructions

This repository is the local source workspace for Guild-native Marketing OS agents.

## Current Posture

- Work locally until the user explicitly approves a Guild lifecycle step.
- Do not run remote agent lifecycle commands, install into a workspace, publish, or make public without explicit approval.
- Do not run `guild agent init`, `guild agent save`, `guild agent publish`, `guild agent unpublish`, workspace install, trigger setup, credential setup, or visibility-changing Agent Hub commands unless the user explicitly asks for that lifecycle step.
- Do not add or edit `guild.json` by hand. Guild manages it when an agent directory is initialized through the CLI.
- The Guild CLI may be installed locally. Informational checks such as `guild --version` and `guild agent init --help` are acceptable.
- Use https://docs.guild.ai for current Guild platform, CLI, SDK, and Agent Hub behavior. Use https://www.guild.ai/glossary for Guild terminology.
- Treat confidential source materials and client-specific context as private.
- Keep raw private source material in `_private/`, which is ignored by Git.
- Never commit `_private/`, `_local-guild-agent-prototype/`, `dist/`, or generated bundles.

## Guild-Native Phase 1 Shape

- `agents/catalog.json` is the suite contract: agent ids, intended Guild names, status, package directories, and required Context Hub artifacts.
- `agents/foundation-setup/` is the first Guild-native source package. It intentionally omits `guild.json` until CLI initialization is explicitly approved.
- `context-hub/` holds lightweight user-owned project context artifacts.
- `workspace-context/marketing-os-workspace-context.md` is the concise Guild Workspace Context draft. Keep it short because Guild injects workspace context into every agent run.
- `guild-skills/` holds source markdown for future Guild Skills. Skills should contain reusable methods, not customer-specific facts.
- The old local lab, generated packets, and local-only Agent Hub exemplars have been removed.

## Verification

Run from the repo root:

```sh
npm run verify
```

`npm run verify` must be non-mutating and must not create remote agent records.

The verifier checks:

- Context Hub required files exist and have basic structure.
- Every agent-declared Context Hub artifact maps to a real `context-hub/<artifact>.md` file.
- Guild-native agent source directories declared in `agents/catalog.json` have the expected local files and do not include `guild.json`.
- Public source files avoid known private path markers.
- Removed local-lab directories are not recreated.

## Context Hub

- The Context Hub is lightweight user-owned project context, not a formal knowledge graph.
- Foundation Setup creates or updates approved Context Hub artifacts; other agents reuse them through Guild workspace context, user input, approved artifacts, and future skills.
- Do not embed customer-specific context into public Agent Hub package behavior.
- Keep customer-specific source material out of public Context Hub files. Put private source material in `_private/` only.
- Run `npm run check:context` when changing `context-hub/`.

## Public-Safety Rules

- Keep public docs generic: do not name confidential source artifacts, private people, buyers, or unconfirmed client details.
- Keep `submission/`, `delivery/`, `agents/`, `context-hub/`, `workspace-context/`, and `guild-skills/` free of confidential source material.
- If a detail came from private context, either generalize it or keep it in `_private/`.
- Prefer fixture project names and generic platform labels over real client systems unless approved.
