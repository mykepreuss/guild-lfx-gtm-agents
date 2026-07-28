# Launcher Durable Cockpit Validation — 2026-07-28

## Result

Marketing OS Launcher 0.3.0 source is connected to the provider-neutral state
service contract and passes local end-to-end workflow tests. It has not been
published to Guild. The browser-proven Launcher 0.2.5 remains the private
workspace default until trusted Guild tenant identity and a managed service
deployment are available.

## Implemented behavior

- The Launcher creates a tenant-bound workflow run before calling a specialist.
  If durable run creation fails, no specialist is invoked.
- Every specialist call is recorded as an immutable initial or format-repair
  attempt with route, context revision, package, version, input, output,
  validation result, and error provenance.
- A format-invalid initial result permits exactly one explicit
  `FORMAT REPAIR ONLY` attempt. Safety and tool failures are retained and are
  never silently retried.
- A validated result is stored as a `ready_for_review` artifact with the V1
  draft-only safety envelope. The Launcher then creates the return handoff and
  updates both the workflow run and specialist workstream.
- A new Launcher session can resume a retained format-invalid run without
  creating a duplicate workflow run or requiring the user to paste the prior
  artifact.
- A cockpit request renders all eight workstreams with state, latest artifact,
  blocker, and next action. It does not invoke a specialist.
- The customer-visible result includes the complete specialist artifact plus a
  compact receipt for artifact revision, run ID, specialist version, and context
  revision.

## Test evidence

`npm run test:launcher-cockpit` builds the compiled Launcher and exercises it
against the real in-memory state adapter:

1. malformed Messaging output followed by one successful format repair;
2. durable artifact, handoff, run, workstream, and session-state finalization;
3. cockpit status from a separate Launcher session;
4. cross-session continuation of a pre-existing format-invalid run;
5. fail-closed behavior when durable run creation is unavailable; and
6. safety-failed output retained as a blocked run with no repair attempt.

The same state contract already has PostgreSQL, JWT/JWKS HTTP, tenant isolation,
idempotency, optimistic concurrency, audit, export, deletion, encryption, and
deployment-foundation coverage through the state-service test suite.

## Live release boundary

The Launcher references a Guild service integration named
`guild-marketing-os-state`. No such production integration has been installed,
and 0.3.0 has not been published. Live Guild testing would fail closed before
specialist delegation until all of these are true:

1. the service is deployed behind its managed PostgreSQL and KMS boundary;
2. Guild supplies a verifiable outbound identity bound to the calling
   organization and workspace;
3. the integration is installed without exposing infrastructure credentials to
   the customer; and
4. the private browser suite is rerun for all routes, resume, cockpit, failure,
   export, and deletion behavior.

This boundary prevents a local test identity, maintainer token, or
customer-supplied tenant field from being mistaken for production isolation.
