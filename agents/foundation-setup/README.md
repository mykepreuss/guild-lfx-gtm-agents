# Guild Marketing OS Company Context Builder

Guild package: `guild-marketing-os-company-context-builder`
Package owner: `michaelpreuss`

## Purpose

Turns raw company context into approved context artifact drafts, entity facts, proof points, AEO readiness gaps, a compact Guild workspace context brief, approval checkpoints, and next-agent routing.

This is the default first-run workspace agent for the V1 Marketing OS. It should make a project leader feel like the system is processing their company context, not routing them through a separate setup menu.

## Contract

This is the first structured Guild Marketing OS agent. It uses a canonical text input/output schema for Guild chat compatibility, then validates an internal Zod-backed context packet before rendering the review Markdown.

Accepted input:

- required `type: "text"` and `text` for Guild workspace chat compatibility.
- readable company/source text pasted into the message. If a user attaches a PDF or file without pasted text, the agent must explain that it cannot draft context from unread file contents in the current chat run.

Returned output:

- canonical `type: "text"` and `text`
- full Markdown review packet containing approved context artifact drafts, approved facts and missing evidence, approval gates, AEO readiness, status payload, and downstream handoff
- persistence state showing whether the packet is drafted, approved, staged, blocked, or published to Guild workspace context
- short inline review summary at the top of the Markdown packet

## V1 Boundary

Review-first. This agent does not schedule, install, spend, sync, trigger, change visibility, or modify external live systems.

The only runtime mutation it may perform is the explicit workspace-context persistence flow:

1. Draft company context from readable source text.
2. User approves the draft in a follow-up turn.
3. User sends exactly `publish approved context to workspace context`.
4. The agent compacts the approved source corpus, audits the compacted brief, replaces its managed workspace-context block, and publishes that Guild context revision.

## Test

From this package directory:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```

Run repo verification from the repository root:

```sh
npm run verify
```
