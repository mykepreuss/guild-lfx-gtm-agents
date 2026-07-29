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
| Clear-intent routing and child return | Builder plus all seven specialist routes returned complete results in normal Chat; Launcher 0.3.14 also routes coordinated negated safety clauses correctly while blocking affirmative pivots and separate restricted operations | Pass in private alpha |
| Guide fallback | Ambiguous request returned Marketing OS Guide with no specialist task in `019faa25-d311-351a-0000-92e3d5c2ba7a` | Pass in private alpha |
| Guild-only canonical cockpit | Launcher retains runs, attempts, artifacts, approvals, workstreams, handoffs, and audit entries in Guild task state, with a 6 MiB safety ceiling; session `019fabb1-c08e-351a-0000-bdc23f1e166c` restored state after browser reload | Pass locally and in private browser |
| Same-Chat resume | Canonical-Chat tests resume work without repasting or duplicating the run; browser reload restored Campaigns revision 1 | Pass locally and in private browser |
| New-Chat boundary is honest | A brand-new Chat renders a fresh cockpit and does not claim to reconstruct detailed state | Pass locally and in private browser |
| Summary-first result | Launcher 0.3.14 renders artifact title, state, evidence, relevant included sections, saved revision, and next action before the unchanged complete specialist artifact | Pass locally and in private browser |
| Artifact approval | Exact artifact revision and exact user approval text transition artifact, run, handoff, and latest workstream idempotently; Campaigns revision 1 approved in session `019fabb1-c08e-351a-0000-bdc23f1e166c` | Pass locally and in private browser |
| Cockpit export | Launcher returns the complete structured cockpit as a JSON Chat artifact | Pass locally and in private browser |
| Confirmed cockpit deletion | Disposable normal Chat `019fac05-f2b9-351a-0000-bf20c4cff828` retained Messaging revision 1 until exact confirmation, then showed all workstreams `not_started`; export contained empty runs, artifacts, workstreams, and handoffs plus only the deletion receipt | Pass locally and in private browser |
| Company Context lifecycle | Builder retains supplied source and draft in Guild Chat state; final normal Chat `019fabfd-dfb0-351a-0000-185605586cc2` imported validated artifact `945ceece-2a87-41cd-b7ee-5c5056ee26d4` revision 1 as `ready_for_review`; approval and publication remain separate | Pass locally and in private browser |
| Guild Workspace Context publication | Launcher uses authenticated Guild context list/create endpoints, preserves unmanaged context, detects an already-published artifact, and records the context version. The staging run left live context revision `019f10b8-0faa-9b1f-0000-0f14b2f84fea` unchanged. | Pass in fake-endpoint integration tests; **blocked on exact user approval and live private Guild proof** |
| Shared specialist contract and claim safety | All seven specialist 1.2.6 packages use one coded validator; Launcher independently validates; safety failures are never silently repaired; final live routes and the 21-run benchmark passed the hardened contract | Pass locally and in private live acceptance |
| Evidence mode | Market Signal and Social Monitoring disclose `source_supplied`, `connected_read_only`, or `live_monitoring`, coverage, observation time, and limitations | Pass locally and in prior private browser runs |
| Draft-only safety | No publishing, scheduling, spend, CRM mutation, credentials, or legal approval; Workspace Context publication is the only supported Guild product mutation and needs the exact second phrase | Pass locally and in prior private browser runs |
| Self-install onboarding | One-at-a-time installation request and installed-suite verification are implemented | **Blocked on public versions and clean-org test** |
| Default Launcher | Private workspace already uses Launcher as default; customer UI instruction remains required because SDK exposes only default reads | Pass privately; clean-org UI proof pending |
| No private Skills dependency | Capability packages are self-contained; private skills remain maintainer assets only | Pass |
| No external runtime service | Launcher and Builder declare no Cloud, database, bridge, or Marketing OS integration tools; `npm run verify` excludes contingency-service tests | Pass locally |
| Context-size benchmark | Final serial confirmation selected compressed at ~1,805 tokens: 7/7 complete, no lost golden facts, zero unqualified sensitive claims, and zero validation errors; the candidate is staged as an unapproved cockpit artifact | Pass; exact approval/publication to working Workspace Context pending |
| Clean separate-organization rehearsal | The empty `developers-at-guild/marketing-os-clean-rehearsal-20260728` workspace remains untouched. Guild's Organization tab exposes eight existing `developers-at-guild` Marketing OS scaffolds, but each has only draft placeholder code and no published version; the organization-owned Launcher does not yet exist. The supported Guild-only path is to publish the validated eight capability builds into those private organization-owned packages, create a private organization-owned Launcher bound only to their package IDs, then install and onboard through the normal UI. | **Blocked on explicit authorization to update shared organization agents and create the private organization Launcher** |
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
4. Review the staged compressed Company Context artifact, approve its exact
   revision, and publish it only after the separate exact confirmation phrase.
5. With the organization owner's explicit authorization, publish the validated
   builds into the eight existing private `developers-at-guild` package
   scaffolds and create the missing private organization-owned Launcher. Bind
   that rehearsal Launcher only to the eight organization package IDs.
6. Complete the existing empty
   `developers-at-guild/marketing-os-clean-rehearsal-20260728` rehearsal
   through the normal Agent Hub and Launcher onboarding path.
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
versions and sessions and remain explicit. Saving, publishing, installing,
changing the default agent, or changing visibility is a separate lifecycle
step. Workspace Context publication is exercised only in the dedicated private
acceptance flow with an approved disposable test artifact.
