# Durable Company Context Validation — 2026-07-28

> Superseded architecture evidence. The active Guild-only validation is
> `2026-07-28-guild-native-cockpit.md`; the external state-service references
> below are retained to preserve the intermediate evidence trail.

## Result

Company Context Builder 1.2.0 source now uses the same tenant-bound Marketing OS
state service as Launcher 0.3.0. The source is locally verified but is not
published to Guild. Builder 1.1.2 remains installed in the browser-proven
private workspace until the managed service and trusted Guild caller identity
exist.

## Lifecycle

1. The Builder derives stable tenant-safe UUIDs from the session and exact
   source fingerprint.
2. It stores the exact readable source, including meaningful leading or
   trailing whitespace, as an encrypted raw-source revision.
   Builder session state retains only source/artifact references, never a
   second unencrypted copy of the raw source.
3. It stores the complete Company Context Approval Packet as a
   `ready_for_review` artifact linked to the source revision and the V1
   draft-only safety envelope.
4. A follow-up approval reads that exact artifact revision and stores the
   user's exact approval text. A failed durable approval clears the publishable
   approved session state.
5. The exact phrase `publish approved context to workspace context` triggers
   compaction and audit, reads the current durable context revision, and calls
   the state-service publication endpoint with optimistic concurrency.
6. The state service independently requires the approved artifact, exact
   publication phrase, delegated context-publication scope, and a configured
   workspace-scoped publisher before recording the new context snapshot.

The raw source is never included in the compact Guild context payload. It
remains encrypted until an explicit customer deletion operation.

## Test evidence

`npm run test:foundation-state` now runs the Builder against the real in-memory
state adapter and proves:

- exact raw-source round-trip through the tenant-bound encrypted adapter;
- absence of raw source text from Builder session state and on-demand source
  retrieval only during approved compaction;
- review-ready artifact creation with exact source provenance;
- durable artifact approval with exact approval text;
- the separate exact context-publication approval phrase;
- compact context publication with source, artifact, and rollback provenance;
- fail-closed behavior when source storage or artifact approval is unavailable;
- blocking before compaction or publication when the encrypted approved source
  cannot be read;
- compaction regeneration and unsupported-claim blocking before any context
  publication; and
- delegated publisher failure leaves the approved artifact staged for retry.

The PostgreSQL integration suite separately verifies the same exact raw-source
preservation and encrypted storage behavior.

## Live boundary

The old maintainer-token workspace-context bridge is no longer referenced by
Builder 1.2.0. Publishing this source before the `guild-marketing-os-state`
integration is deployed and tenant-authenticated would intentionally make
context setup fail closed. For that reason, live browser acceptance follows the
identity and deployment gate rather than preceding it.
