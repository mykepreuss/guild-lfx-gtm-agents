# Guild-Native Cockpit Validation — 2026-07-28

## Scope

This evidence replaces the external state-service design as the active public
V1 architecture. The earlier state-service and bridge records remain intact as
historical and contingency evidence.

The active design uses:

- Guild task state in one continuing Launcher Chat for workflow durability;
- Guild Workspace Context for the compact approved company brief;
- static Guild agent tools for the exact eight-package suite allowlist;
- no external runtime persistence service.

This architecture is now proven in the private workspace. It requires no
Blaxel account, Cloud Run service, PostgreSQL database, shared maintainer Guild
API token, or customer-visible infrastructure credentials.

## Local Evidence

`scripts/test-launcher-cockpit.mjs` builds the production Launcher and verifies:

- one canonical Chat with saved runs, attempts, artifacts, workstreams,
  handoffs, approvals, and audit events;
- complete retention of malformed output and the single formatting repair;
- no retry for substantive safety or specialist-tool failures;
- same-Chat resume and a deliberately fresh cockpit in a new Chat;
- exact, idempotent artifact approval;
- structured export;
- two-step confirmed cockpit-state deletion;
- fail-closed behavior when state cannot be saved before delegation;
- approved Company Context publication through the workspace-scoped Guild
  context surface;
- unmanaged Workspace Context preservation and idempotent repeat publication;
- a stored context publication receipt containing the resulting Guild context
  ID and artifact provenance;
- cockpit size below the conservative 6 MiB ceiling.

`scripts/test-foundation-state.mjs` builds Company Context Builder and verifies:

- current published Workspace Context is read before readiness claims;
- the July 28 false-missing-context regression is fixed;
- direct Builder Chat retains its draft source and approval state in Guild task
  state;
- direct publication is blocked and handed back to canonical Launcher;
- downstream requests route to Launcher or the appropriate specialist without
  generating a new context packet or treating instructions as a company name.

The standard `npm run verify` path no longer runs the external state adapter or
private bridge. `scripts/check-guild-native.mjs` rejects a public Launcher or
Builder runtime dependency on those integrations.

## Honest Boundaries

- Guild task state is Chat-scoped, not a cross-Chat workspace database.
- A new Chat receives published Workspace Context but not the old cockpit.
- The canonical continuing Launcher Chat is therefore the durable V1 cockpit.
  Returning to that Chat restores its artifacts, approvals, workstreams,
  handoffs, and audit trail; starting a different Chat deliberately starts a
  different cockpit.
- Export is delivered in Chat; it is not a separate downloadable storage
  product.
- Confirmed deletion clears the structured cockpit state but does not claim to
  erase Guild-retained Chat history or published Workspace Context.
- Static package bindings still require a clean-organization installation and
  concurrency rehearsal.

## Live Guild Evidence

All packages remained private during validation:

- Launcher `0.3.7` is the workspace default.
- Company Context Builder is `1.2.0`.
- All seven specialists are `1.2.6`.
- Every package has automatic updates enabled.

Final session `019faba7-0e57-351a-0000-79b14e75b6fc` started as a brand-new
ordinary Guild Chat. It loaded a fresh Launcher cockpit, returned complete
Campaigns And Paid Media and Market Signal artifacts from their allowlisted
specialist child tasks, retained both artifacts as revision 1, showed both
workstreams in status, and exported the complete structured cockpit state.

The final Campaigns run installed version
`019faba5-c8da-cf83-0000-503fce919ad3`; the final Market Signal run installed
version `019faba0-2f9e-cf83-0000-10d529d10d0d`. Both consumed compiled context
revision `fingerprint:606a94119f7de719`, recorded
`external_mutation_requested: false`, and performed no external action.

The final full `npm run verify` passed before publication. It covers the
Guild-native cockpit, Builder state, all specialist contracts, exact allowlist,
router table, state transitions, repair retention, approval, export, deletion,
context publication, safety policy, evidence modes, catalog shape, and legacy
compatibility checks.

## Architecture Decision

Guild-only is the selected public V1 architecture, subject to the honest
Chat-scoped durability boundary above. An external database is not necessary
for V1 because Guild task state satisfies the required canonical-cockpit
workflow when customers continue the same Launcher Chat.

An external adapter remains a future option only if the product later requires
workspace-wide arbitrary-new-Chat resume, cross-workspace querying, or a
separate storage administration surface.

## Remaining Public-Release Evidence

Before any package becomes public:

1. obtain owner authorization and complete a clean separate-organization
   installation and concurrency rehearsal;
2. complete unaffiliated design-partner acceptance with no maintainer CLI
   intervention;
3. select the compact Workspace Context variant and run its exact two-step
   approval/publication gate;
4. complete the customer-facing confirmed-deletion rehearsal;
5. finish summary-first polish for long specialist packets; and
6. rerun the complete public release evidence matrix in those organizations.
