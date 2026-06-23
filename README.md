# GTM Marketing OS Agents

Local-first workspace for an open-source Marketing OS agent suite for GTM teams.

This repository is intentionally safe to share: private source notes, meeting context, and client-specific material belong in `_private/`, which is ignored by Git.

## Purpose

Build and test the proposed Marketing OS agents locally before creating any remote agent records.

Working thesis:

> Build nine separate marketing agents plus an orchestrator/router, with fixture-backed outputs that can later be packaged for Guild's Agent Hub.

## Current Status

- Local only.
- No remote agent records are created from this repo.
- No workspace installs or publishing.
- The local lab models the nine future agents and generates fixture-backed demo packets.
- All nine local-only Agent Hub exemplars model future per-agent package boundaries without lifecycle config.
- Marketplace target is Guild's Agent Hub, but the project is still iterating toward that acceptance bar.
- License: Apache-2.0.
- Eventual live integrations are TBD. Current packets document future adapter handoffs only.
- The dashboard is expected to become the logged-in state a user sees in Guild.ai.

## Guild References

The Guild CLI is available locally for approved checks and future packaging work. Current observed CLI version: `0.13.0`.

Primary references:

- Guild docs: https://docs.guild.ai
- Agent Hub docs: https://docs.guild.ai/platform/publish-to-agent-hub#agent-hub
- Guild glossary: https://www.guild.ai/glossary

Use the docs for platform, CLI, SDK, Agent Hub, workspace, agent, session, credential, and integration behavior. Use the glossary to keep public-facing terminology aligned with Guild language. CLI availability does not change the local-first boundary in this repo.

## Agent Hub Readiness

Guild's Agent Hub publishes validated agent versions so other users can install them. This repo is not ready for that lifecycle yet.

Source: https://docs.guild.ai/platform/publish-to-agent-hub#agent-hub

Before any Agent Hub packaging work starts:

- Split the local lab into real agent directories with platform lifecycle files.
- Confirm each agent directory has the required `guild.json` and `agent.ts` structure.
- Pass local repo verification and Guild validation.
- Decide whether each published version should remain Team-installable inside an organization first or become public On-Hub.
- Confirm the Agent Hub listing fields and metadata source, since the current public docs do not specify that mapping.
- Keep all fixture, docs, and generated packets public-safe before any save, publish, or visibility change.

## Product Direction

This repo should become more than a collection of workflow demos. The intended Marketing OS loop is:

1. A project leader starts with an outcome, campaign, event, or operating question.
2. The orchestrator chooses an agent, asks for clarification, or later proposes a multi-agent plan.
3. The selected agent generates reviewable work using public-safe fixture context.
4. The project leader or owner approves, edits, rejects, or routes the work.
5. Future integrations execute only after approval and only when live systems are explicitly in scope.
6. The Guild.ai dashboard reflects status, blockers, decisions, performance signals, and next actions.

The flagship demo should stay generic and open-source cloud native. It should still feel specific enough for a serious GTM operator to evaluate.

## Agent Suite

1. Foundation Setup Agent
2. Newsletter Composition Agent
3. Social Content Agent
4. Event Creation Agent
5. Event Promotion Agent
6. Audience Segmentation Agent
7. Owned Media Production Agent
8. Campaign Performance Agent
9. Campaigns and Paid Media Agent

The orchestrator/router helps a project leader choose the right agent or clarify ambiguous requests.

Additional GTM loops may become new agents if they are important enough to the operating system. Candidate future loops include proof/customer evidence, market signal and voice-of-customer, web and AEO optimization, lifecycle nurture, and partner or sponsor marketing.

## Commands

```sh
cd /Users/mp/Code/guild/marketing-os
npm install
npm run verify
npm run generate:demos
```

`npm run verify` is non-mutating. It runs smoke tests and checks that generated demo packets are current.

`npm run generate:demos` rewrites local demo packets under `delivery/local-demo-packets/`.

The generated demo packets are committed on purpose as reviewable artifacts. If agent definitions change, regenerate demos and run `npm run verify` before committing.

## Folder Map

- `research/source-pages/` - public source captures only, if needed later.
- `work/` - local implementation workspace.
- `work/local-agent-lab/` - local-only TypeScript agent definitions, orchestrator, tests, and demo generation.
- `work/agent-hub-exemplars/` - local-only per-agent TypeScript package exemplars for future Guild packaging.
- `submission/` - sendable material only.
- `delivery/local-demo-packets/` - generated fixture packets for the orchestrator and nine agents.
- `_private/` - local-only private notes, ignored by Git.

## Working Rules

- Keep raw transcripts, meeting notes, client materials, and relationship context in `_private/`.
- Keep confidential source material out of `submission/`, `delivery/`, and public docs.
- Separate the V1 starter-kit scope from any production deployment.
- Treat the repo as open source under Apache-2.0.
- Keep ownership, license, maintenance, and public-use rights explicit before public sharing.
- Do not run remote agent lifecycle commands until scope and review path are confirmed.
- Do not add platform lifecycle config files to this repo until remote packaging is approved.
- Keep Agent Hub exemplars free of `guild.json` until packaging is explicitly approved.
- Do not publish Team-installable or public On-Hub versions until the Agent Hub acceptance checklist is complete.
