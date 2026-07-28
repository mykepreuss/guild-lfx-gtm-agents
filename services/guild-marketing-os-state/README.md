# Marketing OS State Service

Status: provider-neutral contract, tested reference adapter, authenticated HTTP
boundary, and production PostgreSQL schema foundation

This package defines the durable state boundary for the Marketing OS cockpit. The interface covers encrypted source retention, immutable artifact revisions, artifact and context approvals, workstream status, handoffs, optimistic concurrency, idempotency, audit, export, and confirmed deletion.

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

`postgres-adapter.mjs` implements the production adapter against PostgreSQL.
Every operation uses one checked-out client and one transaction, sets verified
tenant values through transaction-local PostgreSQL settings before accessing
RLS-protected tables, serializes mutable aggregates, preserves optimistic
revision checks, and appends hash-linked audit entries. The explicit
`npm run test:postgres:integration` command starts a disposable local
PostgreSQL server (or a disposable Docker container), exercises the production
adapter, and removes the temporary database afterward.

Sources are immutable revisions: correcting a source creates a new encrypted
revision and preserves the prior revision for audit until deletion. Confirmed
source deletion removes ciphertext, authentication material, and wrapped data
keys from every revision of that source.

Confirmed workspace deletion purges source ciphertext, artifacts, approvals,
workstreams, handoffs, idempotency records, and that tenant's rate-limit
buckets. It retains only the tombstoned tenant row, hash-linked audit metadata
(including the deletion event), and a minimal deletion receipt. Those retained
records contain opaque identifiers, actors, timestamps, event types, hashes,
and counts—not raw source or artifact bodies.

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
- support customer export and confirmed source/workspace deletion;
- keep context publication separate from artifact approval and require the exact phrase `publish approved context to workspace context`;
- reject all execution-mode or external-mutation requests in V1.

Public rollout remains blocked until the production service has delegated workspace-scoped Guild authorization and passes clean-organization tenant-isolation, backup/restore, export, and deletion tests.
