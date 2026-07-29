# Marketing OS Launcher

Guild package: `guild-marketing-os-launcher`

Status: Guild-only canonical cockpit source ready for private-alpha proof.

Launcher is the default front door for a dedicated Marketing OS workspace. One
continuing Launcher Chat is the canonical cockpit.

## What It Does

- Routes clear requests deterministically across Company Context Builder and
  the seven specialists.
- Uses a strict enum-only LLM classification only when intent is ambiguous.
- Exposes exactly the eight suite packages as callable tools.
- Cannot call itself or an unrelated workspace agent.
- Reads the current Guild Workspace Context before deciding that context is
  missing.
- Uses one onboarding request to present the remaining native Guild installation
  approvals sequentially, stopping immediately on denial or failure.
- Creates a run in Guild task state before specialist delegation.
- Records every attempt, artifact revision, approval, workstream, handoff,
  error, and audit event.
- Allows one formatting repair and no silent substantive or safety retry.
- Returns the complete specialist artifact in the originating Chat.
- Publishes approved compact company context through the separate exact-phrase
  gate while preserving unmanaged Workspace Context.
- Exports the structured cockpit and supports confirmed deletion of its
  structured task state.

## Memory Boundary

Guild task state is scoped to this Chat. Resume this Chat to restore the
cockpit. A new Chat intentionally starts a new cockpit, although it still sees
published Workspace Context.

The implementation stays below a conservative 6 MiB limit. It does not use the
contingency external state service.

Confirmed cockpit deletion does not claim to erase Guild Chat history or a
published Workspace Context revision.

## Safety

V1 is draft-only. Launcher blocks publishing, scheduling, paid spend, CRM
mutation, credential setup, legal approval, recursive delegation, and other
external execution. Artifact approval is never execution approval.

## Verification

From the repository root:

```sh
npm run test:launcher-routing
npm run test:launcher-cockpit
npm run verify
```

Private live Guild and clean-organization evidence are still required before
public release.
