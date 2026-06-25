# Guild Marketing OS Company Context Builder

Guild package: `guild-marketing-os-company-context-builder`
Package owner: `michaelpreuss`

## Purpose

Turns raw company or project context into approved Context Hub drafts, entity facts, proof points, AEO readiness gaps, a Workspace Context update, approval checkpoints, and next-agent routing.

## V1 Boundary

Review-only. This agent does not publish, schedule, install, spend, sync, update workspace context, or modify live systems.

## Test

From this package directory:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```

Run repo verification from the repository root:

```sh
npm run verify
```
