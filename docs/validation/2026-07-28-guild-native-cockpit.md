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
- Export is delivered in Chat; it is not a separate downloadable storage
  product.
- Confirmed deletion clears the structured cockpit state but does not claim to
  erase Guild-retained Chat history or published Workspace Context.
- Static package bindings still require a clean-organization installation and
  concurrency rehearsal.

## Remaining Live Evidence

Local success is not treated as live Guild success. Before public release:

1. publish new private Launcher and Builder versions;
2. verify full specialist return, same-Chat resume, approval, and status in an
   ordinary Guild Chat;
3. execute the exact Workspace Context publication gate and record the context
   revision;
4. run the seven specialist routes and adversarial failures;
5. complete clean-organization and unaffiliated design-partner acceptance.
