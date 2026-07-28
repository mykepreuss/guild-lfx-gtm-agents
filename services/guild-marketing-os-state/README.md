# Marketing OS State Service

Status: provider-neutral contract, tested reference adapter, authenticated HTTP
boundary, and production PostgreSQL schema foundation

This package defines the durable state boundary for the Marketing OS cockpit.
The interface covers encrypted source retention, immutable artifact revisions,
artifact and context approvals, workstream status, handoffs, Launcher workflow
runs and invocation attempts, optimistic concurrency, idempotency, audit,
export, and confirmed deletion.

Raw source encryption preserves the exact supplied text instead of trimming
leading or trailing whitespace. Source revision review, hashes, and exports
therefore remain faithful to the customer's readable source.

`memory-adapter.mjs` is the executable contract reference and test double. It derives a tenant-specific AES-256-GCM key from a service master key and binds every operation to both organization and workspace. It is not the public production datastore.

`postgres/schema.sql` is the Cloud SQL target schema. It defines tenant-bound
records, forced PostgreSQL row-level security, revision and safety checks,
idempotency records, and an append-only audit table. `postgres/schema.test.mjs`
keeps the required controls in the normal verification path. The architecture
decision and native/Blaxel capability matrix are recorded in
`docs/adr/0001-public-v1-persistence-boundary.md`.

`http-service.mjs` exposes the adapter through a fail-closed JSON API.
`identity.mjs` verifies a delegated JWT through configured Guild issuer,
audience, algorithm, and JWKS values. Organization, workspace, actor, session,
task, and scopes come from verified claims. Body tenant fields are removed
after an exact-match check, and a mismatch is rejected. Context publication
requires a separate delegated publication scope and remains unavailable unless
a workspace-scoped publisher is explicitly injected.

`openapi.json` is the importable OpenAPI 3.0 contract for the managed
integration. It exposes every implemented route, requires delegated bearer
identity for every non-health operation, omits tenant and actor fields from
request schemas, keeps context publication on its separate scope, and encodes
the exact context-publication and workspace-deletion phrases. Its server URL is
intentionally a placeholder until a managed deployment passes the release
gates.

`postgres-adapter.mjs` implements the production adapter against PostgreSQL.
Every operation uses one checked-out client and one transaction, sets verified
tenant values through transaction-local PostgreSQL settings before accessing
RLS-protected tables, serializes mutable aggregates, preserves optimistic
revision checks, and appends hash-linked audit entries. The explicit
`npm run test:postgres:integration` command starts a disposable local
PostgreSQL server (or a disposable Docker container), exercises the production
adapter, and removes the temporary database afterward.

That disposable rehearsal now runs two layers against the same isolated
PostgreSQL instance. The first exercises the adapter directly. The second
starts a real HTTP server and local JWKS endpoint, signs short-lived RS256
delegated JWTs, and drives the authenticated service boundary end to end. It
proves wrong-audience and tenant-spoof rejection, trusted actor replacement,
encrypted storage, cross-tenant isolation, separate context-publication scope,
stale-publication rejection, export, confirmed deletion, and preservation of
the other tenant.

## Launcher workflow ledger

The workflow-run endpoints persist the evidence needed to resume and audit a
Launcher-mediated specialist request:

- the deterministic route, specialist, context revision, package name and
  version, task input envelope, current status, blocker, and next action;
- the complete initial specialist attempt, including output, validation
  errors, and tool or safety failure details;
- at most one second attempt, permitted only for formatting repair after a
  `format_invalid` first attempt; and
- the resulting artifact revision and handoff reference.

Every run begins at revision 1 in `running`. Attempts are immutable and may be
added only while the run remains `running`. A review-ready run requires a
successful final attempt and a review-ready or approved artifact. An approved
run requires the referenced artifact itself to be approved. Safety and tool
failures cannot be silently rewritten as formatting repairs. Both attempts
remain visible through run reads, workspace export, and the immutable audit
trail. Each append-only attempt event stores a stable hash of the complete
attempt record, so the audit chain attests the preserved input, output,
validation result, error, package version, context revision, and timestamp
without copying customer content into audit metadata.

The HTTP surface is:

- `POST /v1/runs`
- `GET /v1/runs`
- `GET /v1/runs/{runId}`
- `POST /v1/runs/{runId}/attempts`
- `PUT /v1/runs/{runId}`

These endpoints are the persistence boundary only. The private Launcher is not
yet calling them because no live Guild-signed tenant identity or managed state
service is available. Public cockpit persistence remains blocked until that
wiring is deployed and proven in normal Chat.

Sources are immutable revisions: correcting a source creates a new encrypted
revision and preserves the prior revision for audit until deletion. Confirmed
source deletion removes ciphertext, authentication material, and wrapped data
keys from every revision of that source.

Confirmed workspace deletion purges source ciphertext, artifacts, approvals,
workstreams, handoffs, workflow runs and attempts, idempotency records, and
that tenant's rate-limit buckets. It retains only the tombstoned tenant row,
hash-linked audit metadata (including the deletion event), and a minimal
deletion receipt. Those retained records contain opaque identifiers, actors,
timestamps, event types, hashes, and counts—not raw source or artifact bodies.

`server.mjs` and `Dockerfile` provide the Cloud Run ingress container. Startup
requires `DATABASE_URL`, `KMS_KEY_NAME`, `GUILD_DELEGATED_ISSUER`,
`GUILD_DELEGATED_AUDIENCE`, and `GUILD_DELEGATED_JWKS_URL`. Cloud KMS calls use
the assigned Cloud Run service identity through the metadata server; no service
account key or maintainer Guild token is accepted. `/healthz` is a liveness
check and `/readyz` verifies database connectivity. Authenticated calls use a
tenant-scoped PostgreSQL rate limiter, defaulting to 120 requests per 60
seconds; deployments may set `RATE_LIMIT_MAX_REQUESTS` and
`RATE_LIMIT_WINDOW_SECONDS`.

`deploy/gcp` contains the production-shaped Google Cloud Terraform module and
deployment runbook. It keeps the runtime and migration identities separate,
uses private regional Cloud SQL with backups and point-in-time recovery,
scopes database secrets to their consumers, pins the service image by digest,
and gives source envelope encryption and Cloud SQL separate KMS keys. The
module can be initialized and validated without deploying, but it must not be
applied with placeholder Guild identity values.

Apply the schema with a separate migration identity before starting the
service:

```bash
DATABASE_ADMIN_URL='postgresql://...' \
DATABASE_APP_ROLE='marketing_os_app' \
DATABASE_ADMIN_SSL=require \
npm run migrate
```

`DATABASE_ADMIN_URL` and `DATABASE_APP_ROLE` are accepted only by the migration
command. The named application role must already exist and must not be a
superuser or have `BYPASSRLS`; the migration grants only the required schema,
table, and tenant-function access. The running container uses `DATABASE_URL`,
so the higher-privilege migration credential does not need to be present in the
Cloud Run service.

Context publication intentionally remains blocked in this container until
Guild supplies the delegated workspace-scoped publisher contract. The state
service can be deployed and tested without that mutation path, but public
release cannot proceed while it is disabled.

When that publisher is supplied, the adapter validates the exact approval,
approved artifact, expected current revision, and idempotency record while
holding the context transaction lock before invoking it. The publisher must
honor the same idempotency key: if the external Guild mutation succeeds but the
database commit is interrupted, a retry must return the original Guild context
result rather than publishing a second version.

The production implementation must preserve these semantics on managed PostgreSQL:

- derive tenant identity from delegated Guild authorization, never from an untrusted request body;
- scope every query by organization and workspace;
- encrypt raw source before storage;
- use unique idempotency constraints and database transactions;
- use expected-revision checks for every mutable aggregate;
- append hash-linked audit entries;
- preserve immutable Launcher attempts and allow only one format-only repair;
- support customer export and confirmed source/workspace deletion;
- keep context publication separate from artifact approval and require the exact phrase `publish approved context to workspace context`;
- reject all execution-mode or external-mutation requests in V1.

Public rollout remains blocked until the production service has delegated workspace-scoped Guild authorization and passes clean-organization tenant-isolation, backup/restore, export, and deletion tests.
