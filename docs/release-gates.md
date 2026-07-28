# Public V1 Release Gates

Status on 2026-07-28: **blocked — private alpha only**

Public visibility is treated as permanent. No Launcher or capability package
may be made public while any blocking row below remains open.

| Gate | Current evidence | Status |
| --- | --- | --- |
| Baseline preserved | Default-routing failure `019fa97a-b109-351a-0000-5168d89d276b`; direct Messaging success `019fa97b-db59-351a-0000-d76602123c7e` | Pass |
| Minimal Launcher → Messaging proof | Complete coded-Launcher result returned in normal Chat `019faa08-43e5-351a-0000-9235d92b0dff` | Pass in private alpha |
| Coded allowlist / hostile request | Launcher 0.2.5 blocked self-delegation and publication, then recovered to Messaging in the same Chat `019faa23-8838-351a-0000-b674324cbf8e` | Pass in private alpha |
| Coded clear-intent routing | Builder plus all seven specialist routes passed in fresh normal Chats; failures and fixes are retained in browser evidence | Pass in private alpha |
| Coded child result return | Complete specialist output returned to the originating Launcher Chat for every route | Pass in private alpha |
| Public task-local agent binding | SDK 0.4.2 dynamic helper adds every workspace agent to a mutable toolset and has no allowlist; private Launcher remains statically allowlisted | **Blocked on targeted SDK/self-managed proof; Guide fallback selected if unreliable** |
| Guide fallback | Ambiguous request returned Marketing OS Guide with no specialist task in `019faa25-d311-351a-0000-92e3d5c2ba7a` | Pass in private alpha |
| Browser normal-Chat UX | Launcher 0.2.5 is the private workspace default; onboarding, Builder, seven specialists, safety recovery, and ambiguity pass | Pass in private alpha |
| Browser specialist selection | Automatic Launcher delegation removes the prior `@mention` dependency | Pass in private alpha |
| Cross-session cockpit persistence | Launcher 0.3.0 source now creates durable runs before delegation, preserves both attempts, finalizes artifact/workstream/handoff state, resumes an incomplete route across sessions, renders cockpit status, and durably approves one unambiguous artifact revision with exact approval text and partial-sync recovery; memory and PostgreSQL/JWT/HTTP rehearsals pass locally | **Blocked on authenticated managed deployment and private browser acceptance of 0.3.0** |
| Delegated workspace context publication | Online docs list context operations, but published SDK 0.4.2 does not contain them; the live integration creator offers API key/OAuth/OAuth M2M/no auth, not a Guild-signed tenant caller identity; old bridge uses maintainer identity | **Blocked on shipped Guild authorization** |
| Self-install onboarding | One-at-a-time install request and default verification code implemented | **Blocked on public versions and clean-org test** |
| No private Skills dependency | All live 1.1.x capability packages are self-contained | Pass in private alpha |
| Tenant isolation | Forced PostgreSQL RLS, production-adapter cross-tenant rehearsal, and full HTTP/JWKS tenant-spoof test pass locally | **Blocked on deployed Guild-issued identity spoof test** |
| Backup/restore, export, deletion | Encrypted export, confirmed purge, retained minimal deletion receipt, and audit-retention tests pass locally | **Blocked on Cloud SQL backup/restore rehearsal** |
| Context-size benchmark | `npm run benchmark:context -- --manifest <file>` enforces three variants, all seven routes, golden-fact retention, artifact completeness, unsupported-claim parity, and conflict-recall parity | **Blocked on complete live evaluation set** |
| Clean separate-organization rehearsal | `developers-at-guild/developer-sandbox` is visible but Guild reports `is_viewer_member: false`; no mutation was attempted | **Blocked on owner authorization** |
| Unaffiliated design-partner acceptance | Not run | **Blocked** |
| External execution | No publishing, scheduling, spend, CRM mutation, credential setup, or legal approval performed | Pass |

Local production-service evidence is recorded in
[`docs/validation/2026-07-28-state-service.md`](validation/2026-07-28-state-service.md).
The public Launcher binding decision is recorded in
[`docs/adr/0002-launcher-runtime-agent-binding.md`](adr/0002-launcher-runtime-agent-binding.md).

## Required rollout order

1. Keep Launcher and all eight capability packages private.
2. Publish private 1.1.x package versions only through the guarded release
   helper after repository commit/push approval.
3. The maintainer private-alpha installation and browser verification are
   complete; retain the evidence and all failed attempts.
4. Obtain and live-prove a Guild-signed service identity carrying organization,
   workspace, actor, session, and task claims, or a native Guild contract with
   equivalent isolation. The currently published SDK and custom-integration
   contract do not provide this.
5. Deploy the Cloud Run/Cloud SQL state service and pass tenant spoofing,
   concurrency, idempotency, workflow-resume, audit, backup/restore, export,
   and deletion tests. Then wire the private Launcher to the run/attempt API
   and repeat every route in normal Chat. No GCP project, Cloud SQL database,
   KMS key, or deploy identity is configured in the current workspace.
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
