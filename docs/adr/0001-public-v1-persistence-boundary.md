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
| Revisioned artifact/source database | No agent-facing contract found | No | Implemented and locally exercised |
| Workspace-scoped context draft/publish | The current docs describe operations that the published 0.4.2 package does not contain | Technically possible, but uses one maintainer token | Blocked until a shipped, live-proven Guild authorization contract exists |
| Tenant isolation | No durable store to assess | Fail: fixed workspace/host identity assumptions | PostgreSQL RLS plus verified server-side tenant binding |
| Idempotency and optimistic concurrency | No durable store to assess | Partial context-only behavior | Production adapter and database rehearsal pass |
| Immutable audit, export, explicit deletion | No durable store to assess | No | Production adapter and database rehearsal pass |
| Managed PostgreSQL backups and recovery | Not applicable | Not provided by the bridge | Cloud SQL managed backup/PITR configuration |
| Customer credential exposure | Not applicable | Blaxel credential is hidden, but maintainer Guild token is shared | No infrastructure credentials are customer-visible |

## Native ceiling spike

The packages compile and validate against the current published
`@guildai/agents-sdk` 0.4.2. Its generated `GuildService` exposes workspace,
installed-agent, default-agent, session, and compiled-context reads. It does not
expose an agent-facing database contract.

Guild's current online Task documentation lists `get_workspace_contexts`,
`create_workspace_context`, `experimental_fetch`, and
`experimental_fetch_async`. The npm registry still reports 0.4.2 as latest,
and the installed 0.4.2 generated service interface contains none of those four
operations. The package documentation explicitly says the package is ground
truth. Public V1 therefore cannot depend on the online-only surface until a
published SDK exposes it and a private live spike proves the authorization and
revision behavior.

Guild custom integrations currently document API key, OAuth, and OAuth M2M
credential injection at the organization level. The published contract does
not document a Guild-signed outbound identity carrying organization,
workspace, actor, session, and task claims, nor a Guild JWKS/issuer contract
for a customer service to verify. Passing workspace identifiers in an agent
request body is insufficient because a malicious or compromised agent could
spoof them.

This means native Guild state is useful for deterministic context reads and
installation verification, but it cannot currently be the V1 system of record.
It may become the context-publication path after the documented operations ship
and pass the live authorization spike.

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

## Implementation and local production proof

The Cloud Run service source is complete enough for an authenticated deployment:

- `PostgresMarketingOsStateAdapter` uses one checked-out client per transaction,
  transaction-local tenant settings, forced RLS, aggregate locks, idempotency
  locks, optimistic revision checks, and hash-linked audit entries.
- Raw sources use AES-256-GCM data keys wrapped through Cloud KMS. The Cloud Run
  implementation obtains KMS access from its service identity metadata token;
  it accepts no service-account key.
- Source corrections create new immutable encrypted revisions. A confirmed
  source deletion clears ciphertext and wrapped-key material from every
  revision, not only the latest.
- Artifact approval cannot be bypassed by storing an approved revision or using
  a generic status change. PostgreSQL also rejects an approved row without its
  matching approval record.
- Authenticated requests consume a tenant-and-actor-scoped PostgreSQL rate
  bucket, so limits remain effective across Cloud Run instances.
- The container listens on `0.0.0.0:$PORT`, exposes liveness/readiness checks,
  uses a non-root runtime user, and handles shutdown.
- `npm run migrate` applies and verifies the schema with a separate
  `DATABASE_ADMIN_URL`; the running service does not accept that credential.
  The migration refuses a superuser or `BYPASSRLS` runtime role and grants only
  the explicit application tables and tenant helper functions.
- `npm run test:postgres:integration` starts a disposable PostgreSQL instance
  and passes concurrent idempotency, revision conflicts, forced RLS isolation,
  envelope-encrypted export, audit immutability, approval integrity, confirmed
  deletion, and deletion-receipt checks.
- Production dependencies currently report zero known npm vulnerabilities.

No managed GCP environment is configured in this workspace, so backup/restore,
private networking, KMS IAM, Cloud Run identity, load, and failover evidence
remain deployment gates rather than local claims.

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

The private alpha and browser acceptance may continue. Public visibility,
self-install onboarding, durable multi-session cockpit use, and public context
publication remain blocked until Guild supplies a verifiable workspace-scoped
service identity (or ships an equivalent native contract), and a production
Cloud SQL deployment passes the release matrix.

## Evidence

- Guild SDK package tested locally at version 0.4.2.
- Guild SDK Task documentation:
  <https://docs.guild.ai/sdk/task-object>
- Guild custom integration documentation:
  <https://docs.guild.ai/services/create-an-integration>
- Guild workspace-context documentation:
  <https://docs.guild.ai/platform/context>
- Guild live sessions and complete task/event evidence are stored under the
  ignored `_private/evidence` directory.
- Blaxel API authentication documentation:
  <https://docs.blaxel.ai/api-reference/introduction>
- Blaxel workspace tenancy documentation:
  <https://docs.blaxel.ai/api-reference/workspaces/create-workspace-tenant>
- Blaxel access-token and service-account guidance:
  <https://docs.blaxel.ai/Security/Access-tokens>
