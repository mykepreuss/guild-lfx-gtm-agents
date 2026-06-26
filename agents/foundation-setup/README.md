# Guild Marketing OS Company Context Builder

Guild package: `guild-marketing-os-company-context-builder`
Package owner: `michaelpreuss`

## Purpose

Turns raw company or project context into approved context artifact drafts, entity facts, proof points, AEO readiness gaps, a Guild workspace context update, approval checkpoints, and next-agent routing.

## Contract

This is the first structured Guild Marketing OS agent. It uses Zod-backed input and output schemas instead of a prompt-only `llmAgent()` implementation.

Accepted input:

- `type: "text"` and `text` for Guild workspace chat compatibility.
- `prompt` for Guild CLI compatibility.
- `projectName`, `rawContext`, `sourceLabels`, `requestedArtifacts`, and `operatingConstraints` for structured use.

Returned output:

- typed approved context artifact drafts
- approved facts and missing evidence
- approval gates
- AEO readiness
- status payload
- downstream handoff
- `markdownPacket` for human review

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
