# GTM Marketing OS Repo Instructions

This repository is for a local-first GTM Marketing OS agent suite.

## Current Posture

- Work locally until scope is confirmed.
- Do not run remote agent lifecycle commands, install into a workspace, publish, or make public without explicit approval.
- Do not add platform lifecycle config files to this repo until remote packaging is approved.
- Do not run `guild agent save --publish`, `guild agent publish`, or visibility-changing Agent Hub commands unless the user explicitly asks for that lifecycle step.
- The Guild CLI may be installed locally. Informational checks such as `guild --version` are acceptable; lifecycle, install, publish, or visibility-changing commands still require explicit approval.
- Use https://docs.guild.ai for current Guild platform, CLI, SDK, and Agent Hub behavior. Use https://www.guild.ai/glossary for Guild terminology.
- Treat transcripts, meeting notes, and client-specific materials as private context.
- Keep raw private source material in `_private/`, which is ignored by Git.
- Never commit `_private/` or `_local-guild-agent-prototype/`.

## Deliverable Shape

- Nine separate future marketplace/workspace agents.
- One orchestrator/router that can help project leaders choose and use the nine agents together.
- Fixture-backed outputs until live integrations are explicitly in scope.
- Open source under Apache-2.0.
- Marketplace target is Guild's Agent Hub.
- Missing GTM loops may become new agents if they strengthen the operating system.
- The flagship demo should remain generic open-source cloud native.
- Eventual live integrations are TBD.
- The dashboard direction is the logged-in Guild.ai state, not a separate live dashboard in this repo yet.
- Agent Hub publishing is version-based and validation-gated. Keep this repo local until packaging is explicitly approved.
- Do not publish Team-installable or public On-Hub versions from this repo without explicit approval.

## Verification

Run from the repo root:

```sh
npm run verify
```

`npm run verify` must not create remote agent records. It must also leave `_private/` untracked.

When changing agent definitions, generated assets, routing, or packet format:

1. Update files under `work/local-agent-lab/`.
2. Run `npm run generate:demos`.
3. Run `npm run verify`.
4. Commit the source changes and updated `delivery/local-demo-packets/` together.

## Public-Safety Rules

- Keep public docs generic: do not name private calls, transcripts, decks, people, buyers, or unconfirmed client details.
- Keep `submission/` and `delivery/` free of confidential source material.
- If a detail came from private context, either generalize it or keep it in `_private/`.
- Prefer fixture project names and generic platform labels over real client systems unless approved.
