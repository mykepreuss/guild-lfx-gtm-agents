# GTM Marketing OS Agents

Local-first workspace for a Marketing OS agent suite for GTM teams.

## Purpose

Build and test the proposed Marketing OS agents locally before creating any remote agent records.

Working thesis:

> Build nine separate marketing agents plus an orchestrator/router, with fixture-backed outputs that can later be packaged for an agent marketplace or private workspace.

## Current Status

- Local only.
- No remote agent records are created from this repo.
- No workspace installs or publishing.
- The local lab models the nine future agents and generates fixture-backed demo packets.

## Commands

```sh
npm run verify
npm run generate:demos
```

`npm run verify` is non-mutating. It runs smoke tests and checks that generated demo packets are current.

`npm run generate:demos` rewrites local demo packets under `delivery/local-demo-packets/`.

## Folder Map

- `research/source-pages/` - public source captures only, if needed later.
- `work/` - local implementation workspace.
- `work/local-agent-lab/` - local-only agent definitions, orchestrator, tests, and demo generation.
- `submission/` - sendable material only.
- `delivery/` - demos, proof-room assets, or packaged artifacts.
- `_private/` - local-only private notes, ignored by Git.

## Working Rules

- Keep raw transcripts, meeting notes, client materials, and relationship context in `_private/`.
- Keep confidential source material out of `submission/`, `delivery/`, and public docs.
- Separate the V1 starter-kit scope from any production deployment.
- Keep ownership, license, maintenance, and public-use rights explicit before work starts.
- Do not run remote agent lifecycle commands until scope and review path are confirmed.
