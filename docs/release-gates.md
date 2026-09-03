# Public V1 Release Gates

Status on 2026-09-02: **public Agent Hub availability; draft-only public alpha**

Public visibility is intentional and permanent for Launcher and the eight
capability packages. Open gates below block broader promotion,
production-readiness claims, and execution capabilities; they do not block
continued public availability of the draft-only suite.

| Gate | Current evidence | Status |
| --- | --- | --- |
| Baseline preserved | Default-routing failure `019fa97a-b109-351a-0000-5168d89d276b`; direct Messaging success `019fa97b-db59-351a-0000-d76602123c7e` | Pass |
| Minimal Launcher to Messaging proof | Complete coded-Launcher result returned in normal Chat `019faa08-43e5-351a-0000-9235d92b0dff` | Pass in private alpha |
| Explicit suite allowlist | Launcher declares exactly eight static suite tools and never uses the unfiltered workspace-agent helper. Normal clean-organization Chats returned one Launcher root and one intended specialist child with no unrelated call. | Pass locally and in clean-organization browser acceptance |
| Hostile request and recovery | Launcher 0.2.5 blocked self-delegation and publication, then recovered to Messaging in the same Chat `019faa23-8838-351a-0000-92e3d5c2ba7a` | Pass in private alpha |
| Clear-intent routing and child return | Builder plus all seven specialist routes returned complete results in normal Chat; Launcher 0.3.14 also routes coordinated negated safety clauses correctly while blocking affirmative pivots and separate restricted operations | Pass in private alpha |
| Guide fallback | Ambiguous request returned Marketing OS Guide with no specialist task in `019faa25-d311-351a-0000-92e3d5c2ba7a` | Pass in private alpha |
| Guild-only canonical cockpit | Launcher retains runs, attempts, artifacts, approvals, workstreams, handoffs, and audit entries in Guild task state, with a 6 MiB safety ceiling; session `019fabb1-c08e-351a-0000-bdc23f1e166c` restored state after browser reload | Pass locally and in private browser |
| Same-Chat resume | Canonical-Chat tests resume work without repasting or duplicating the run; browser reload restored Campaigns revision 1 | Pass locally and in private browser |
| New-Chat boundary is honest | A brand-new Chat renders a fresh cockpit and does not claim to reconstruct detailed state | Pass locally and in private browser |
| Summary-first result | Launcher 0.3.15 renders artifact title, state, evidence, relevant included sections, saved revision, and next action before the unchanged complete specialist artifact | Pass locally and in private browser |
| Artifact approval | Exact artifact revision and exact user approval text transition artifact, run, handoff, and latest workstream idempotently; Campaigns revision 1 approved in session `019fabb1-c08e-351a-0000-bdc23f1e166c` | Pass locally and in private browser |
| Cockpit export | Launcher returns the complete structured cockpit as a JSON Chat artifact | Pass locally and in private browser |
| Confirmed cockpit deletion | Disposable normal Chat `019fac05-f2b9-351a-0000-bf20c4cff828` retained Messaging revision 1 until exact confirmation, then showed all workstreams `not_started`; export contained empty runs, artifacts, workstreams, and handoffs plus only the deletion receipt | Pass locally and in private browser |
| Company Context lifecycle | Builder retains supplied source and draft in Guild Chat state; final normal Chat `019fabfd-dfb0-351a-0000-185605586cc2` imported validated artifact `945ceece-2a87-41cd-b7ee-5c5056ee26d4` revision 1 as `ready_for_review`; approval and publication remain separate | Pass locally and in private browser |
| Guild Workspace Context publication | Clean-organization browser acceptance retained the failed coded-agent call where Guild SDK 0.4.2 returned `Unauthorized — Not authenticated` before any mutation. Launcher then prepared one approved compact block, the marketer published native Context version `019faf95-9f10-9b1f-0000-a07a9fa6f690`, and new ordinary Chats reused fingerprint `2b09fd7fe30cd304` without a repaste. | Pass through the accepted native Guild Context-screen handoff |
| Shared specialist contract and claim safety | All seven specialists use one coded validator; Launcher independently validates; every failed and repaired attempt is retained. Final clean-organization browser routes passed on Market Signal 1.2.7, ICP/Audience/Messaging 1.2.6, Branding 1.2.8, Social 1.2.9, and Campaigns 1.2.11. | Pass locally and in private live acceptance |
| Evidence mode | Market Signal and Social Monitoring disclose `source_supplied`, `connected_read_only`, or `live_monitoring`, coverage, observation time, and limitations | Pass locally and in prior private browser runs |
| Draft-only safety | No publishing, scheduling, spend, CRM mutation, credentials, or legal approval; Workspace Context publication is the only supported Guild product mutation and needs the exact second phrase | Pass locally and in prior private browser runs |
| Self-install onboarding | One-at-a-time installation requests, approval, denial/resume behavior, and installed-suite verification completed in the clean organization without marketer CLI use | Pass privately; public versions remain a separate release decision |
| Default Launcher | Launcher 0.3.29 is verified as the clean rehearsal workspace default; the administrator UI step remains required because SDK exposes only default reads | Pass privately and in clean-organization UI |
| No private Skills dependency | Capability packages neither import nor declare the Guild Skills integration | Pass |
| No external runtime service | Launcher and Builder declare no Cloud, database, bridge, or Marketing OS integration tools; `npm run verify` excludes contingency-service tests | Pass locally |
| Context-size benchmark | Final serial confirmation selected compressed at ~1,805 tokens: 7/7 complete, no lost golden facts, zero unqualified sensitive claims, and zero validation errors; the candidate is staged as an unapproved cockpit artifact | Pass; exact approval/publication to working Workspace Context pending |
| Clean separate-organization rehearsal | `developers-at-guild/marketing-os-clean-rehearsal-20260728` completed private package installation, default-agent setup, company-context approval/publication, new-Chat context reuse, all seven specialist routes, presentation creation, content planning, and integrated-campaign creation. | Pass |
| Unaffiliated design-partner acceptance | Not run | **Blocked** |
| Public Agent Hub visibility | All nine packages report public, ready, and active; public availability is intentional so other Guild users can install and fork the suite. | **Pass by product-owner decision on 2026-09-02** |

The Guild-only persistence decision is recorded in
[`docs/adr/0001-public-v1-persistence-boundary.md`](adr/0001-public-v1-persistence-boundary.md).
The explicit suite-binding decision is recorded in
[`docs/adr/0002-launcher-runtime-agent-binding.md`](adr/0002-launcher-runtime-agent-binding.md).

## Required rollout order

1. Keep Launcher and all eight capability packages public and draft-only.
2. Publish updates through the guarded release helper after local verification.
3. Run the canonical-cockpit browser suite in
   `michaelpreuss~guild-marketing-os`: onboarding, context setup, artifact
   approval, exact context publication, each specialist, status, same-Chat
   resume, handoff, export, confirmed deletion in a disposable Chat, missing
   package, timeout, malformed output, stale context, hostile request, and
   ambiguity.
4. Review the staged compressed Company Context artifact, approve its exact
   revision, and publish it only after the separate exact confirmation phrase.
5. Preserve the completed clean-organization rehearsal evidence for
   `developers-at-guild/marketing-os-clean-rehearsal-20260728`.
6. Run unaffiliated design-partner acceptance with no maintainer CLI or
   infrastructure credentials.
7. Only then consider broader promotion or production-readiness claims.

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
