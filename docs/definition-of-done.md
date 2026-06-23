# Definition Of Done

This document defines when the Marketing OS agent suite is done for a V1 local open-source release.

V1 is a local-first release. It proves the public agent surface, orchestration model, dashboard contract, demo quality, and future Agent Hub package boundaries without creating remote Guild agent records.

## Done Means

V1 is done when every checklist item below is true and verified.

### 1. Open-Source Release Surface

- The repository is licensed under Apache-2.0.
- `README.md` explains the product direction, local-only status, Agent Hub target, and current command surface.
- `CONTRIBUTING.md` explains contribution goals, public-safety rules, local-first rules, and Agent Hub packaging boundaries.
- Public docs do not depend on private transcripts, meeting notes, relationship context, client materials, credentials, tokens, or NDA material.
- Ignored private folders remain untracked.

Evidence:

- `LICENSE`
- `README.md`
- `CONTRIBUTING.md`
- `git status --short --ignored`
- public-safety text scan excluding ignored private and build folders

### 2. Agent Suite Complete

- The nine planned GTM agents exist as separate TypeScript source modules.
- The orchestrator/router can show the menu, route clear requests, and ask for clarification on ambiguous requests.
- Each agent has a distinct GTM job, trigger, future Agent Hub name, aliases, keywords, questions, assumptions, generated asset blocks, approval checklist, dashboard contract, adapter notes, and next action.
- Missing GTM loops are documented as future candidates, not hidden inside the V1 scope.

Evidence:

- `work/local-agent-lab/src/agents/`
- `work/local-agent-lab/src/agent-catalog.ts`
- `work/local-agent-lab/src/runtime.ts`
- `work/local-agent-lab/scripts/smoke-test.mjs`
- `npm run verify`

### 3. TypeScript Contract Complete

- The local lab source is TypeScript.
- The shared contract defines `AgentDefinition`, `ApprovalModel`, `DashboardPayload`, Agent Hub readiness, dashboard metrics, source confidence, and agent ids.
- TypeScript declarations are emitted locally so per-agent exemplars can consume the shared contract without duplicating it.
- The ordered catalog is only a registry; the agent definitions live in per-agent modules.

Evidence:

- `work/local-agent-lab/src/types.ts`
- `work/local-agent-lab/src/agents/`
- `work/local-agent-lab/tsconfig.json`
- `npm run build --prefix work/local-agent-lab`

### 4. Per-Agent Package Boundary Complete

- Every V1 agent has a local-only package exemplar under `work/agent-hub-exemplars/`.
- Each exemplar includes `src/agent.ts`, `package.json`, `tsconfig.json`, `scripts/smoke-test.mjs`, and `README.md`.
- Each exemplar imports the compiled local lab contract and returns typed text plus dashboard payload.
- Each exemplar verifies `liveExecution: false`.
- Each exemplar verifies Agent Hub readiness remains `not_packaged`, `not_run`, and `draft_only`.
- No exemplar includes `guild.json` until packaging is explicitly approved.

Evidence:

- `work/agent-hub-exemplars/`
- `npm run verify:exemplars`
- `find work/agent-hub-exemplars -name guild.json -print`

### 5. Demo Surface Complete

- The flagship demo remains generic open-source cloud native.
- Generated demo packets exist for the orchestrator and all nine agents.
- Packets include substantive generated assets, approval checks, dashboard payloads, future adapter notes, and local-only boundaries.
- Packets are committed as reviewable release artifacts.
- Demo packets are regenerated only through `npm run generate:demos`.

Evidence:

- `delivery/local-demo-packets/`
- `npm run generate:demos`
- `npm run verify`

### 6. Dashboard Contract Complete

- Every agent emits dashboard-ready fields for the logged-in Guild.ai direction: owner, workstream, approval status, decision required, blockers, next action, metrics, source confidence, downstream agents, and Agent Hub readiness.
- Dashboard payloads are fixture-backed and do not imply live execution.
- Dashboard data remains structured enough to become the future logged-in product state.

Evidence:

- `work/local-agent-lab/src/types.ts`
- `work/local-agent-lab/src/runtime.ts`
- `delivery/local-demo-packets/*.md`
- `work/local-agent-lab/scripts/smoke-test.mjs`

### 7. Agent Hub Readiness Complete

- The suite is ready for future Agent Hub packaging only after every agent has a proven local package boundary.
- Metadata is sufficient to support future listing work: name, category, tags, primary user, trigger, summary, workflow questions, output shape, approval model, and safety posture.
- Agent Hub publishing remains a later lifecycle step that requires approved `guild.json`, approved Guild SDK wrapper, validation, version message, installability decision, and visibility decision.
- No `guild agent save`, `guild agent publish`, install, credential, workspace, or visibility-changing command is part of V1.

Evidence:

- `work/local-agent-lab/src/agent-hub-readiness.ts`
- `work/agent-hub-exemplars/`
- `README.md`
- `CONTRIBUTING.md`
- `AGENTS.md`

### 8. Local Verification Complete

- `npm run verify` passes from the repository root.
- The verify command builds the local lab, runs local smoke tests, checks demo packet freshness, and verifies all Agent Hub exemplars.
- `git diff --check` reports no whitespace errors.
- Local build output remains ignored and uncommitted.
- The worktree has no uncommitted tracked changes at release time.

Evidence:

- `package.json`
- `npm run verify`
- `git diff --check`
- `git status --short --ignored`

## Explicitly Not Done In V1

These are not required for the V1 local open-source release:

- Real Guild agent directories with `guild.json`.
- Guild SDK wrappers.
- `guild agent save`, validation, publishing, installation, or visibility changes.
- Live integrations with CRM, email, ad, analytics, event, social, video, or CMS platforms.
- A separate production dashboard application.
- Public On-Hub availability.

These become the next phase after V1 local release is done and packaging is explicitly approved.

## Completion Status

The known V1 package-boundary gap is closed when `npm run verify:exemplars` reports nine local-only Agent Hub exemplars and `find work/agent-hub-exemplars -name guild.json -print` returns no files.

At release time, completion still requires the full evidence set above: root verification passing, no whitespace errors, no tracked private/build output, and no uncommitted tracked changes.
