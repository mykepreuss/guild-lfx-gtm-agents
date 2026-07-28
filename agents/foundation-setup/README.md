# Guild Marketing OS Company Context Builder

Guild package: `guild-marketing-os-company-context-builder`
Package owner: `michaelpreuss`

## Purpose

Turns raw company context into approved context artifact drafts, entity facts, proof points, AEO readiness gaps, a compact Guild workspace context brief, approval checkpoints, and next-agent routing.

Launcher routes first-run company-context setup here. The Builder should make a
project leader feel like the system is processing their company context, not
routing them through a separate setup menu.

## Contract

This is the first structured Guild Marketing OS agent. It uses a canonical text input/output schema for Guild chat compatibility, then validates an internal Zod-backed context packet before rendering the review Markdown.

Accepted input:

- required `type: "text"` and `text` for Guild workspace chat compatibility.
- readable company/source text pasted into the message. If a user attaches a PDF or file without pasted text, the agent must explain that it cannot draft context from unread file contents in the current chat run.

Returned output:

- canonical `type: "text"` and `text`
- full Markdown review packet containing approved context artifact drafts, approved facts and missing evidence, approval gates, AEO readiness, status payload, and downstream handoff
- persistence state and exact source/artifact references showing whether the
  packet is stored, approved, staged, blocked, or published to Guild workspace
  context
- short inline review summary at the top of the Markdown packet

## Guild Usage

Users should start here, paste readable company/source text, review the Company Context Approval Packet, approve it, then send exactly `publish approved context to workspace context` when the compact workspace context brief is ready to publish.

## Operating Boundary

Review-first. This agent does not schedule, install, spend, sync, trigger, change visibility, or modify external live systems.

Its only runtime mutations are tenant-bound context persistence and the explicit
workspace-context publication flow:

1. Store the exact readable source as an encrypted raw-source revision and the
   complete Company Context Approval Packet as a review-ready artifact.
   Raw source text is not retained in Builder session state; it is read back
   from the encrypted revision only for approved context compaction.
2. User approves the exact artifact revision in a follow-up turn. The service
   records the user's exact approval text.
3. User sends exactly `publish approved context to workspace context`.
4. The agent compacts the approved source corpus, audits the compacted brief,
   and sends only the managed block plus approved artifact/source provenance to
   the `guild-marketing-os-state` integration.
5. The state service verifies delegated organization/workspace identity,
   optimistic context revision, approved artifact revision, and the exact
   publication phrase before its workspace-scoped publisher replaces only the
   managed block and records rollback metadata.

Version 1.2.0 is source-ready but not installed in the private workspace. The
browser-proven 1.1.2 Builder remains installed until Guild supplies a trusted
outbound tenant identity and the managed state service is deployed.

## Test

From this package directory:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```

Run repo verification from the repository root:

```sh
npm run verify
```
