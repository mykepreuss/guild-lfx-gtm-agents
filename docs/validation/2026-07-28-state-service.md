# Marketing OS State Service Validation — 2026-07-28

## Scope

This record covers the production PostgreSQL adapter, authenticated HTTP
boundary, envelope encryption, Cloud Run container entrypoint, schema
migration, local disposable-database rehearsal, production-shaped GCP
Terraform, and the importable OpenAPI integration contract. It does not claim
a managed GCP deployment or a shipped Guild delegated-identity contract.

## Automated result

`npm run verify` passed from the repository root. The command now includes the
disposable PostgreSQL production-adapter rehearsal in addition to all existing
suite checks.

The state-service package also passed `npm audit --omit=dev` with zero reported
vulnerabilities.

Terraform 1.5.7 initialized the locked Google 6.50.0 and Random 3.9.0
providers, and `terraform validate` passed. The downloaded provider cache was
moved outside the repository before the full verifier ran. Redocly CLI 1.34.5
validated `openapi.json` with its recommended rules and no warnings.

## Rehearsed controls

- Verified organization/workspace binding is applied to every transaction
  through transaction-local settings and forced PostgreSQL row-level security.
- A tenant cannot read another tenant's source or rate-limit bucket.
- Raw source is encrypted before insertion with AES-256-GCM and an envelope
  data key; exports decrypt only inside the authenticated adapter boundary.
- Source corrections create immutable encrypted revisions. Confirmed source
  deletion removes ciphertext and wrapped-key material from every revision.
- Concurrent replay of one idempotency key returns one result.
- Concurrent artifact revisions permit one winner and return an explicit
  revision conflict for the stale attempt.
- Artifact approval cannot be created through a new revision or generic status
  change. PostgreSQL rejects an approved row without its matching approval
  record.
- Stale context publication is rejected before the external publisher callback
  runs. A failed publisher leaves no published state record.
- The exact context-publication phrase is enforced in both the contract and
  database approval constraint.
- Audit entries are ordered, hash-linked, and protected from update/delete.
- Authenticated request rate limits are stored per tenant and actor in
  PostgreSQL, so they are shared across service instances.
- Confirmed workspace deletion purges source ciphertext, artifacts, approvals,
  workstreams, handoffs, idempotency records, and that tenant's rate-limit
  buckets. It retains only minimal tombstone, audit, and deletion-receipt
  metadata.
- The schema migration is idempotent and succeeds when applied twice.
- The disposable PostgreSQL process and temporary data directory are removed
  after the run.

## Container and migration boundary

- The image installs from the committed lockfile, runs as the non-root `node`
  user, and starts the service on `0.0.0.0:$PORT`.
- `/healthz` reports liveness and whether context publication is configured.
- `/readyz` verifies database availability.
- Cloud KMS access uses the Cloud Run service identity metadata token. No
  service-account key is accepted by the application.
- `npm run migrate` requires `DATABASE_ADMIN_URL`. The running service uses
  only `DATABASE_URL`, keeping the migration credential out of runtime. The
  migration also rejects a runtime role that is a superuser or has
  `BYPASSRLS`, then grants only the explicit application tables and tenant
  helper functions.

## Managed deployment and integration contracts

- The Terraform module pins the container by image digest and provisions a
  separate Cloud Run migration job and identity.
- Cloud SQL uses PostgreSQL 16, regional availability, private networking,
  SSD, backups, point-in-time recovery, query insights, deletion protection,
  and a dedicated customer-managed KMS key.
- Runtime and migration database URLs are separate Secret Manager values and
  are readable only by their corresponding service identities.
- Source envelope encryption uses a different KMS key readable only by the
  runtime identity.
- Terraform variables require the real Guild issuer, audience, and JWKS URL;
  the runbook forbids applying with placeholder or maintainer credentials.
- The OpenAPI contract covers every implemented route by reading the runtime
  route manifest in its test. Every non-health operation inherits delegated
  bearer-JWT security, request schemas omit tenant/actor identity, and context
  publication retains its separate scope and exact phrase.

## Remaining external gates

The official Guild Task documentation currently lists workspace-context
version operations, but the npm registry's latest
`@guildai/agents-sdk` (0.4.2) does not contain those operations in its generated
service interface. Guild's public custom-integration documentation also does
not specify a signed outbound identity carrying organization, workspace,
actor, session, and task claims.

The current environment has no Google Cloud CLI, application-default
credentials, project, Cloud SQL URL, or KMS key configured. Therefore:

- no Cloud Run/Cloud SQL/KMS deployment was attempted;
- no managed backup/restore or failover rehearsal was claimed;
- no public integration was created;
- no customer or clean-organization data was written; and
- public release remains blocked.
