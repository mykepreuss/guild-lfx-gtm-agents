# ADR 0001: Public V1 Persistence Boundary

- Status: Accepted for implementation; public-release gate remains blocked
- Date: 2026-07-28
- Owners: Guild Marketing OS maintainers

## Decision

Marketing OS uses the provider-neutral `MarketingOsStateAdapter` contract in
`services/guild-marketing-os-state`. The production target is Cloud Run backed
by Cloud SQL for PostgreSQL. Native Guild storage and the existing
single-workspace context bridge are not eligible for public V1.

The service must derive the organization and workspace binding from a verified,
short-lived Guild-issued identity. It must not accept an organization or
workspace supplied only by an agent request body. Every database transaction
sets both tenant identifiers locally and PostgreSQL row-level security enforces
the same binding.

Context publication remains disabled for public release until Guild provides a
delegated, workspace-scoped authorization that the service can verify and use
without a maintainer token. The exact approval phrase remains
`publish approved context to workspace context`, but the phrase is necessary,
not sufficient: the approved artifact revision, expected current revision,
idempotency key, actor, and delegated workspace authorization must also match.

## Capability matrix

| Requirement | Guild SDK 0.4.2 | Existing Blaxel bridge | Cloud Run + Cloud SQL target |
| --- | --- | --- | --- |
| Resolve session to workspace | Pass | Pass through maintainer Guild token | Pass once delegated Guild identity is available |
| Read compiled workspace context | Pass | Pass through maintainer Guild token | Pass once delegated Guild identity is available |
| Revisioned artifact/source database | No agent-facing contract found | No | Yes |
| Workspace-scoped context draft/publish | No agent-facing SDK operation found | Technically possible, but uses one maintainer token | Blocked until delegated Guild authorization exists |
| Tenant isolation | No durable store to assess | Fail: fixed workspace/host identity assumptions | PostgreSQL RLS plus verified server-side tenant binding |
| Idempotency and optimistic concurrency | No durable store to assess | Partial context-only behavior | Contract and schema enforce both |
| Immutable audit, export, explicit deletion | No durable store to assess | No | Contract and schema provide all three |
| Managed PostgreSQL backups and recovery | Not applicable | Not provided by the bridge | Cloud SQL managed backup/PITR configuration |
| Customer credential exposure | Not applicable | Blaxel credential is hidden, but maintainer Guild token is shared | No infrastructure credentials are customer-visible |

## Native ceiling spike

The packages compile and validate against `@guildai/agents-sdk` 0.4.2. The SDK
exposes session, workspace, installed-agent, and default-agent reads. It does
not expose an agent-facing database contract or workspace-context draft/publish
operations meeting the required revision, isolation, audit, export, and
deletion contract.

This means native Guild state is useful for deterministic context reads and
installation verification, but it cannot be the V1 system of record.

## Why not the current Blaxel bridge

Blaxel supports workspace isolation, API keys/service accounts, OAuth for its
own APIs, private workloads, and observability. Its current CLI and public
resource surface do not provide the complete managed PostgreSQL lifecycle
required here. More importantly, the existing bridge authenticates to Guild
with a maintainer token and is bound to one maintainer workspace. That fails
the delegated tenant-authentication requirement regardless of where the
service runs.

The existing bridge remains a private compatibility path only while the
replacement is built. It must not be used by a public package.

## Required production controls

- Cloud Run accepts only authenticated requests from the configured Guild
  integration.
- A verifier validates issuer, audience, signature, expiry, actor,
  organization, workspace, and session/task linkage.
- Request-body tenant claims are ignored unless they exactly match the verified
  identity.
- Cloud SQL uses private connectivity, encryption in transit, customer-managed
  encryption at rest where required, automated backups, point-in-time recovery,
  and restore rehearsals.
- PostgreSQL row-level security is forced on every tenant table.
- Raw source uses envelope encryption before insertion; a per-tenant data key is
  wrapped by KMS. Deletion removes ciphertext and schedules wrapped-key
  destruction when the workspace is deleted.
- Audit entries are append-only and hash-linked. Application roles cannot
  update or delete them.
- Export and deletion are authenticated, rate-limited, audited, and require
  exact confirmation text for destructive operations.
- Logs contain opaque IDs and error codes, never raw source, artifact bodies,
  access tokens, or direct personal contact/payment identifiers.

## Rollback

The adapter boundary permits switching providers without changing agent
contracts. A migration must:

1. quiesce writes per tenant;
2. export and verify hashes and record counts;
3. import into the replacement;
4. compare context/artifact revisions and the audit head;
5. change the tenant routing record;
6. retain the prior encrypted copy for the agreed rollback window; and
7. delete it only after customer-confirmed cutover.

Context publication itself uses the expected-current-revision check and keeps
the prior published context identifier as its rollback reference.

## Release consequence

The codebase may proceed through private alpha with the in-memory conformance
adapter and private Launcher tests. Public visibility, self-install onboarding,
and public context publication remain blocked until delegated Guild
authorization and a production Cloud SQL deployment pass the release matrix.

## Evidence

- Guild SDK package tested locally at version 0.4.2.
- Guild live sessions and complete task/event evidence are stored under the
  ignored `_private/evidence` directory.
- Blaxel API authentication documentation:
  <https://docs.blaxel.ai/api-reference/introduction>
- Blaxel workspace tenancy documentation:
  <https://docs.blaxel.ai/api-reference/workspaces/create-workspace-tenant>
- Blaxel access-token and service-account guidance:
  <https://docs.blaxel.ai/Security/Access-tokens>
