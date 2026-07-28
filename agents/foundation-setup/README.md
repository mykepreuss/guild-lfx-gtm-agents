# Guild Marketing OS Company Context Builder

Guild package: `guild-marketing-os-company-context-builder`

Status: Guild Chat context lifecycle source ready for private-alpha proof.

## Purpose

Company Context Builder turns readable source text into a Company Context
Approval Packet containing company facts, audiences, messaging sources, brand
guidance, channel scope, proof constraints, dashboard signals, missing
evidence, AEO readiness, and a compact Workspace Context candidate.

Launcher routes first-run context setup here. For downstream marketing requests
Builder identifies itself as context-only and sends the user to Launcher or the
named specialist.

## Chat State

In a direct Builder Chat, the source text, artifact reference, revision, and
approval state are kept in Guild task state. No external state service is
required.

When Builder runs through Launcher, Launcher is the durable artifact owner and
records the packet, approval, publication provenance, workstream, and handoff
in the canonical cockpit.

## Approval And Publication

The lifecycle remains deliberately two-step:

1. Review and approve the exact Company Context artifact revision.
2. Send exactly `publish approved context to workspace context`.

Direct Builder Chat does not publish Workspace Context. It directs the user
back to the canonical Launcher Chat so the separate publication gate and its
provenance stay in one cockpit.

Launcher performs the workspace-scoped Guild publication, preserving unmanaged
manual context and recording the resulting context ID and revision.

## Operating Boundary

Builder is review-first and context-only. It does not schedule, install, spend,
sync, trigger, change public visibility, mutate external systems, or turn
artifact approval into execution approval.

Readable source text must be available in the Chat. If an attachment cannot be
read by the running Guild agent, Builder asks for the relevant text instead of
inventing context.

## Verification

From the repository root:

```sh
npm run test:foundation-state
npm run verify
```

Private live Guild publication evidence is still required before public
release.
