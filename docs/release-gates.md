# Public V1 Release Gates

Status on 2026-07-28: **blocked, Guild-only private alpha**

Public visibility is treated as permanent. No Launcher or capability package
may be made public while any blocking row below remains open.

| Gate | Current evidence | Status |
| --- | --- | --- |
| Baseline preserved | Default-routing failure `019fa97a-b109-351a-0000-5168d89d276b`; direct Messaging success `019fa97b-db59-351a-0000-d76602123c7e` | Pass |
| Minimal Launcher to Messaging proof | Complete coded-Launcher result returned in normal Chat `019faa08-43e5-351a-0000-9235d92b0dff` | Pass in private alpha |
| Explicit suite allowlist | Launcher declares exactly eight static suite tools and never uses the unfiltered workspace-agent helper | Pass locally and in private browser; clean-org proof pending |
| Hostile request and recovery | Launcher 0.2.5 blocked self-delegation and publication, then recovered to Messaging in the same Chat `019faa23-8838-351a-0000-92e3d5c2ba7a` | Pass in private alpha |
| Clear-intent routing and child return | Builder plus all seven specialist routes returned complete results in normal Chat; failures and fixes are retained | Pass in private alpha |
| Guide fallback | Ambiguous request returned Marketing OS Guide with no specialist task in `019faa25-d311-351a-0000-92e3d5c2ba7a` | Pass in private alpha |
| Guild-only canonical cockpit | Launcher retains runs, attempts, artifacts, approvals, workstreams, handoffs, and audit entries in Guild task state, with a 6 MiB safety ceiling; session `019fabb1-c08e-351a-0000-bdc23f1e166c` restored state after browser reload | Pass locally and in private browser |
| Same-Chat resume | Canonical-Chat tests resume work without repasting or duplicating the run; browser reload restored Campaigns revision 1 | Pass locally and in private browser |
| New-Chat boundary is honest | A brand-new Chat renders a fresh cockpit and does not claim to reconstruct detailed state | Pass locally and in private browser |
| Summary-first result | Launcher 0.3.8 renders draft, state, evidence, included sections, saved revision, and next action before the unchanged complete specialist artifact | Pass locally and in private browser |
| Artifact approval | Exact artifact revision and exact user approval text transition artifact, run, handoff, and latest workstream idempotently; Campaigns revision 1 approved in session `019fabb1-c08e-351a-0000-bdc23f1e166c` | Pass locally and in private browser |
| Cockpit export | Launcher returns the complete structured cockpit as a JSON Chat artifact | Pass locally and in private browser |
| Confirmed cockpit deletion | Two-step exact phrase deletes runs, attempts, artifact bodies, approvals, workstreams, handoffs, and their local index; receipt discloses that Guild history and published context are not deleted | Pass locally; private browser proof pending |
| Company Context lifecycle | Builder retains supplied source and draft in Guild Chat state; Launcher imports the validated artifact and owns approval and publication | Pass locally; private browser proof pending |
| Guild Workspace Context publication | Launcher uses authenticated Guild context list/create endpoints, preserves unmanaged context, detects an already-published artifact, and records the context version | Pass in fake-endpoint integration tests; **blocked on live private Guild proof** |
| Shared specialist contract and claim safety | All seven specialist 1.2.6 packages use one coded validator; Launcher independently validates; safety failures are never silently repaired; final live routes and the 21-run benchmark passed the hardened contract | Pass locally and in private live acceptance |
| Evidence mode | Market Signal and Social Monitoring disclose `source_supplied`, `connected_read_only`, or `live_monitoring`, coverage, observation time, and limitations | Pass locally and in prior private browser runs |
| Draft-only safety | No publishing, scheduling, spend, CRM mutation, credentials, or legal approval; Workspace Context publication is the only supported Guild product mutation and needs the exact second phrase | Pass locally and in prior private browser runs |
| Self-install onboarding | One-at-a-time installation request and installed-suite verification are implemented | **Blocked on public versions and clean-org test** |
| Default Launcher | Private workspace already uses Launcher as default; customer UI instruction remains required because SDK exposes only default reads | Pass privately; clean-org UI proof pending |
| No private Skills dependency | Capability packages are self-contained; private skills remain maintainer assets only | Pass |
| No external runtime service | Launcher and Builder declare no Cloud, database, bridge, or Marketing OS integration tools; `npm run verify` excludes contingency-service tests | Pass locally |
| Context-size benchmark | Final 21-run benchmark selected compressed at ~1,789 tokens: 7/7 complete, no lost golden facts, zero unqualified sensitive claims, conflict recall 1; current was 5/7 and pointer minimum lost six required facts | Pass; exact approval/publication to working Workspace Context pending |
| Clean separate-organization rehearsal | Created empty `developers-at-guild/marketing-os-clean-rehearsal-20260728` and opened it in Guild. Private user-owned Launcher returned zero Agent Hub results and cross-owner installation was rejected by the Guild service. Production packages remained private. | **Blocked on supported organization-private sharing, organization-owned rehearsal copies, or staged public visibility** |
| Unaffiliated design-partner acceptance | Not run | **Blocked** |
| Public Agent Hub visibility | All packages remain private | **Blocked until every prior gate passes** |

The Guild-only persistence decision is recorded in
[`docs/adr/0001-public-v1-persistence-boundary.md`](adr/0001-public-v1-persistence-boundary.md).
The explicit suite-binding decision is recorded in
[`docs/adr/0002-launcher-runtime-agent-binding.md`](adr/0002-launcher-runtime-agent-binding.md).

## Required rollout order

1. Keep Launcher and all eight capability packages private.
2. Publish new private test versions through the guarded release helper.
3. Run the canonical-cockpit browser suite in
   `michaelpreuss/guild-marketing-os`: onboarding, context setup, artifact
   approval, exact context publication, each specialist, status, same-Chat
   resume, handoff, export, confirmed deletion in a disposable Chat, missing
   package, timeout, malformed output, stale context, hostile request, and
   ambiguity.
4. Prepare the selected compressed brief as an approved Company Context
   artifact and publish it only after the exact two-step user gate.
5. Resolve private cross-owner package availability, then complete the
   existing empty `developers-at-guild/marketing-os-clean-rehearsal-20260728`
   rehearsal through the normal Agent Hub and Launcher onboarding path.
6. Run unaffiliated design-partner acceptance with no maintainer CLI or
   infrastructure credentials.
7. Only then consider public Agent Hub visibility.

## Evidence handling

`scripts/capture-guild-evidence.mjs` writes complete, permission-restricted JSON
records to ignored `_private/evidence`. Every attempt is retained, including
false blocks, tool failures, incomplete callbacks, retries, and successful
runs. A successful rerun never replaces failed evidence.

## Release command boundary

`npm run verify` is non-mutating. Live Guild tests create remote ephemeral
versions and sessions and remain explicit. Saving, publishing, installing,
changing the default agent, or changing visibility is a separate lifecycle
step. Workspace Context publication is exercised only in the dedicated private
acceptance flow with an approved disposable test artifact.
