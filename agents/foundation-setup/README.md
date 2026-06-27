# Guild Marketing OS Company Context Builder

Guild package: `guild-marketing-os-company-context-builder`
Package owner: `michaelpreuss`

## Purpose

Turns raw company or project context into approved context artifact drafts, entity facts, proof points, AEO readiness gaps, a Guild workspace context update, approval checkpoints, and next-agent routing.

This is the default first-run workspace agent for the V1 Marketing OS. It should make a project leader feel like the system is processing their company context, not routing them through a separate setup menu.

## Contract

This is the first structured Guild Marketing OS agent. It uses a canonical text input/output schema for Guild chat compatibility, then validates an internal Zod-backed context packet before rendering the review Markdown.

Accepted input:

- required `type: "text"` and `text` for Guild workspace chat compatibility.

Returned output:

- canonical `type: "text"` and `text`
- full Markdown review packet containing approved context artifact drafts, approved facts and missing evidence, approval gates, AEO readiness, status payload, and downstream handoff
- short visible review summary via `ui_notify`

## V1 Boundary

Review-only. This agent does not publish, schedule, install, spend, sync, update platform context, or modify live systems.

## Test

From this package directory:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```

Run repo verification from the repository root:

```sh
npm run verify
```
