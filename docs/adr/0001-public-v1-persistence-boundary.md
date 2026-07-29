# ADR 0001: Public V1 Persistence Boundary

- Status: Accepted for implementation; supersedes the external-service decision
- Date: 2026-07-28
- Owners: Guild Marketing OS maintainers

## Decision

Public V1 is Guild-only.

Marketing OS uses one continuing Launcher Chat as the canonical cockpit. The
Launcher stores structured workflow runs, every specialist attempt, artifact
revisions, exact-text approvals, workstream status, handoffs, context
publication handoff provenance, and an append-only audit trail with Guild task state
through `task.save()` and `task.restore()`.

Guild Workspace Context stores only the latest approved compact company brief
and operating rules needed by every agent. It is not an artifact database and
must not contain the complete source corpus, specialist history, or raw
cockpit export.

No public agent depends on Cloud Run, Cloud SQL, Blaxel, a maintainer Guild
token, a custom Marketing OS integration, or customer infrastructure
credentials. The existing external adapter and deployment source remain
private contingency and reference work. They are excluded from the public
runtime and from `npm run verify`.

## Product contract

The customer creates or selects a dedicated Marketing OS workspace, installs
Launcher, and uses one Launcher Chat as the cockpit. Launcher explicitly tells
the customer that this is the canonical Chat and that resuming it preserves
workstreams, artifacts, approvals, and handoffs.

The cockpit supports:

- deterministic and strictly classified routing;
- one initial specialist attempt and at most one format-only repair;
- retention of tool, format, and safety failures;
- review-ready artifact revisions;
- exact artifact approval;
- workstream and handoff status;
- a complete structured JSON export in Chat;
- two-step confirmed deletion of structured cockpit state; and
- approved compact Workspace Context publication after the exact phrase
  `publish approved context to workspace context`.

The deletion command is
`delete marketing os cockpit state from this chat`. It deletes runs, attempts,
artifact bodies, approvals, handoffs, workstreams, and their local index from
the saved task state. It does not claim to delete Guild's own session history
or previously published Workspace Context.

## Capability matrix

| Requirement | Guild-only V1 |
| --- | --- |
| Durable work within the cockpit | Guild task state retained across tool calls and resumption of the canonical Chat |
| Detailed artifact revisions | Stored in Launcher task state |
| Attempts and honest failure history | Stored before retry or finalization |
| Approvals | Exact user text stored on the exact artifact revision |
| Workstreams and handoffs | Stored and rendered by Launcher |
| Shared approved company context | Versioned Guild Workspace Context |
| Context publication | Approved compact block prepared by Launcher and published by the marketer in Guild's native Context screen |
| Export | Complete structured state returned as a JSON Chat artifact |
| Deletion | Exact-confirmation purge of structured Launcher state |
| Tenant boundary | Guild organization, workspace, session, task, and authenticated interactive-user boundaries |
| External credentials | None |
| Cross-new-Chat reconstruction | Not supported in V1; the user resumes the canonical Chat |

## State ceiling and guardrail

Guild limits serialized task state to 8 MiB. Launcher applies a conservative
6 MiB ceiling before every save. Above that ceiling, it fails closed and asks
the customer to export or delete older work before adding another artifact.

The cockpit stores task-relevant requests and validated outputs. Workspace
Context stores only a compact brief. Large source files remain part of the
Guild conversation and attachment history; Marketing OS does not claim a
separate encrypted blob lifecycle or unlimited retention.

## Workspace Context publication

Launcher owns publication because it owns the approved Company Context
artifact revision in the canonical cockpit.

Publication requires:

1. a validated Company Context result imported into Launcher;
2. approval of the exact artifact revision;
3. the exact second phrase
   `publish approved context to workspace context`;
4. a compact managed block containing only the approved artifact;
5. explicit instruction to keep all unmanaged manual context;
6. publication by the marketer through the native Guild Context screen; and
7. verification in a new Chat that the published managed block is injected.

Live private acceptance proved that Guild SDK 0.4.2's interactive `/api/*`
tools do not receive a delegated user identity in the clean organization Chat:
`guild_get_session` returned `Unauthorized — Not authenticated`. The runtime
surface provides installed-agent reads but no workspace-context write. Launcher
therefore fails closed and uses the native Context screen instead of requesting
a customer token, embedding a maintainer token, or depending on an external
service. This preserves the Guild-only product boundary and makes the final
mutation visible and user controlled.

Direct Company Context Builder sessions remain outside the canonical cockpit.
They retain their own draft and approval state in that Guild Chat, but they
route publication back to Launcher and never claim that direct-session state
was imported automatically.

## Audit and concurrency

Every cockpit mutation appends a sequenced event with timestamp, action,
entity, revision, status, and bounded metadata. Artifact bodies and attempts
remain on their own records rather than being duplicated into the audit log.

Idempotency keys are stored in task state. Run, artifact, handoff, approval,
workstream, and context-publication retries return the existing result when the
same key or approved artifact is seen again. Expected revisions reject stale
run, handoff, and workstream transitions.

V1 has one canonical writer: the continuing Launcher Chat. Multi-Chat or
multi-user optimistic concurrency is not represented as supported.

## Security and safety consequence

Removing the external service removes an additional tenant-authentication
boundary, external credential lifecycle, customer-data database, KMS
integration, managed deployment, backup system, and incident surface.

The tradeoff is explicit:

- V1 does not provide a workspace-wide artifact database.
- A brand-new Chat cannot reconstruct detailed state.
- Marketing OS deletion does not delete Guild's platform-owned session logs.
- Marketing OS export covers structured cockpit state, not every Guild event or
  attachment.

These limits must remain visible in onboarding, cockpit status, export, and
deletion receipts.

## External contingency

`services/guild-marketing-os-state` and its Cloud Run/Cloud SQL deployment
source remain as non-runtime contingency work. Reintroducing that boundary
requires a new ADR, a verified Guild-issued tenant identity, a new security
review, and explicit product approval that the external operational burden is
worth the cross-Chat persistence it provides.

## Release consequence

The private alpha can now advance without provisioning external
infrastructure. Public release remains blocked until:

- Guild-native Context-screen publication and new-Chat reuse pass live private
  browser testing;
- canonical-Chat resume, approval, export, and deletion pass in the browser;
- all specialist versions pass claim-safety and context-quality gates;
- clean-organization onboarding passes without CLI intervention;
- an unaffiliated design partner accepts the canonical-Chat model; and
- the public package visibility and installation gates pass.

## Evidence

- Guild State documentation: <https://docs.guild.ai/guide/state>
- Guild execution limits: <https://docs.guild.ai/reference/limits>
- Guild Workspace Context documentation: <https://docs.guild.ai/platform/context>
- Guild Task documentation: <https://docs.guild.ai/sdk/task-object>
- Guild-only Launcher tests: `scripts/test-launcher-cockpit.mjs`
- Company Context state tests: `scripts/test-foundation-state.mjs`
- Browser evidence: `docs/validation/2026-07-28-browser-ux.md`
