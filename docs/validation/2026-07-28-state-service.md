# Marketing OS State Service Validation — 2026-07-28

## Scope

This record covers the production PostgreSQL adapter, authenticated HTTP
boundary, envelope encryption, Cloud Run container entrypoint, schema
migration, and local disposable-database rehearsal. It does not claim a
managed GCP deployment or a shipped Guild delegated-identity contract.

## Automated result

`npm run verify` passed from the repository root. The command now includes the
disposable PostgreSQL production-adapter rehearsal in addition to all existing
suite checks.

The state-service package also passed `npm audit --omit=dev` with zero reported
vulnerabilities.

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
