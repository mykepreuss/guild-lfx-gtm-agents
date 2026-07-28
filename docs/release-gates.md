# Public V1 Release Gates

Status on 2026-07-28: **blocked — private alpha only**

Public visibility is treated as permanent. No Launcher or capability package
may be made public while any blocking row below remains open.

| Gate | Current evidence | Status |
| --- | --- | --- |
| Baseline preserved | Default-routing failure `019fa97a-b109-351a-0000-5168d89d276b`; direct Messaging success `019fa97b-db59-351a-0000-d76602123c7e` | Pass |
| Minimal Launcher → Messaging proof | Complete result returned in `019fa9a3-34ca-f268-0000-4ec269f78a74` | Pass for LLM spike only |
| Coded allowlist / hostile request | Self-delegation and publish override blocked in `019fa9af-a2ca-f268-0000-f81d1536ed06` | Pass |
| Coded clear-intent routing | Workspace-context injection initially caused false blocks; failures retained in evidence and regression-covered | Pass locally |
| Coded child result return | Messaging child completed but Launcher root stayed dispatched in `019fa9c8-ad2b-f268-0000-f68fd684971d` | **Blocked** |
| Guide fallback | Returns route, context fingerprint, package/version, status, and handoff prompt without invoking a child | Pass in private alpha |
| Browser normal-Chat UX | Fresh session `019fa9dc-6323-351a-0000-2515aeeb30d1` reproduced the installed Builder context/readiness failure; Launcher remains an uninstalled draft | **Blocked on private rollout** |
| Browser specialist selection | `@mess` exposed no visible or accessible agent option; workspace agent cards open administration instead of a specialist Chat | **Blocked on reliable handoff path** |
| Cross-session cockpit persistence | Provider-neutral contract/reference adapter and PostgreSQL schema implemented | **Blocked on deployed service** |
| Delegated workspace context publication | SDK 0.4.2 has reads but no agent-facing publish; old bridge uses maintainer identity | **Blocked on Guild authorization** |
| Self-install onboarding | One-at-a-time install request and default verification code implemented | **Blocked on public versions and clean-org test** |
| No private Skills dependency | All 1.1.0 source packages are self-contained; current installed 1.0.x specialists still use Skills | Pass in source; **blocked on private rollout** |
| Tenant isolation | Forced PostgreSQL RLS/schema and reference tests implemented | **Blocked on deployed cross-tenant test** |
| Backup/restore, export, deletion | Contract and local export/deletion tests pass | **Blocked on Cloud SQL rehearsal** |
| Context-size benchmark | `npm run benchmark:context -- --manifest <file>` enforces three variants, all seven routes, golden-fact retention, artifact completeness, unsupported-claim parity, and conflict-recall parity | **Blocked on complete live evaluation set** |
| Clean separate-organization rehearsal | Not run; requires workspace-owner authorization | **Blocked** |
| Unaffiliated design-partner acceptance | Not run | **Blocked** |
| External execution | No publishing, scheduling, spend, CRM mutation, credential setup, or legal approval performed | Pass |

## Required rollout order

1. Keep Launcher and all eight capability packages private.
2. Publish private 1.1.x package versions only through the guarded release
   helper after repository commit/push approval.
3. Install the private Launcher and capability versions in the maintainer alpha
   workspace; verify Guide fallback, onboarding status, Builder context reads,
   and all seven direct handoffs.
4. Deploy the Cloud Run/Cloud SQL state service and pass tenant, concurrency,
   idempotency, audit, backup/restore, export, and deletion tests.
5. Obtain and verify delegated workspace-scoped Guild authorization for context
   publication.
6. Run a clean organization rehearsal in
   `developers-at-guild/developer-sandbox` only with the workspace owner’s
   authorization, or use a newly created team-controlled organization.
7. Run unaffiliated design-partner acceptance with no maintainer CLI or
   infrastructure credentials.
8. Only then consider public Agent Hub visibility.

## Evidence handling

`scripts/capture-guild-evidence.mjs` writes complete, permission-restricted JSON
records to ignored `_private/evidence`. Every attempt is retained, including
false blocks, tool failures, incomplete callbacks, retries, and successful
runs. A successful rerun never replaces failed evidence.

## Release command boundary

`npm run verify` is non-mutating. Live Guild tests create remote ephemeral
versions and sessions and must remain explicit. Saving, publishing, installing,
changing the default agent, configuring credentials, or changing visibility
requires separate lifecycle authorization.
