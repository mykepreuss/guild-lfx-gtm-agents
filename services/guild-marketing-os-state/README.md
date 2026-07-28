# Marketing OS State Service

Status: provider-neutral contract, tested reference adapter, and production
PostgreSQL schema foundation

This package defines the durable state boundary for the Marketing OS cockpit. The interface covers encrypted source retention, immutable artifact revisions, artifact and context approvals, workstream status, handoffs, optimistic concurrency, idempotency, audit, export, and confirmed deletion.

`memory-adapter.mjs` is the executable contract reference and test double. It derives a tenant-specific AES-256-GCM key from a service master key and binds every operation to both organization and workspace. It is not the public production datastore.

`postgres/schema.sql` is the Cloud SQL target schema. It defines tenant-bound
records, forced PostgreSQL row-level security, revision and safety checks,
idempotency records, and an append-only audit table. `postgres/schema.test.mjs`
keeps the required controls in the normal verification path. The architecture
decision and native/Blaxel capability matrix are recorded in
`docs/adr/0001-public-v1-persistence-boundary.md`.

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
