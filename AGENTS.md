# GTM Marketing OS Repo Instructions

This repository is for a local-first GTM Marketing OS agent suite.

## Current Posture

- Work locally until scope is confirmed.
- Do not run remote agent lifecycle commands, install into a workspace, publish, or make public without explicit approval.
- Treat transcripts, meeting notes, and client-specific materials as private context.
- Keep raw private source material in `_private/`, which is ignored by Git.

## Deliverable Shape

- Nine separate future marketplace/workspace agents.
- One orchestrator/router that can help project leaders choose and use the nine agents together.
- Fixture-backed outputs until live integrations are explicitly in scope.
- Open-source posture is acceptable, but license preference should be confirmed before public release.

## Verification

For the local-only agent lab:

```sh
npm run verify
```

`npm run verify` should be run from the repo root and must not create Guild-side records.
It must also leave `_private/` untracked.
