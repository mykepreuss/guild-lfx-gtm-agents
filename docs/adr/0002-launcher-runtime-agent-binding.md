# ADR 0002: Public Launcher Agent Binding

- Status: Accepted for public V1, subject to clean-organization acceptance
- Date: 2026-07-28
- SDK evaluated: `@guildai/agents-sdk` 0.4.2

## Context

Marketing OS Launcher must call only Company Context Builder and the seven
Marketing OS specialists. It must never expose itself, an unrelated customer
agent, or an arbitrary agent named by a user.

SDK 0.4.2 provides a dynamic `withWorkspaceAgentTools` helper, but that helper
adds every agent installed in the workspace and does not accept an allowlist.
That surface is inappropriate for Marketing OS.

The browser-proven Launcher instead declares exactly eight static
`guildAgentTool` bindings to the eight packages published as part of this
suite. It separately reads the installed workspace-agent records before
delegating, blocks missing packages, and records the installed version in the
cockpit provenance.

## Decision

Public V1 keeps the explicit static suite allowlist.

The package publisher and all eight qualified package names are part of the
Marketing OS catalog contract. They are not customer-configurable. A request
cannot change a `calls` target, add a tool, or name an arbitrary workspace
agent.

The Launcher:

1. classifies only into Context Builder or one of the seven specialist routes;
2. checks that the expected suite package is installed;
3. reads the installed version for provenance;
4. invokes only the matching predeclared tool;
5. validates the complete child result;
6. allows one format-only repair;
7. retains tool, format, and safety failures; and
8. returns the complete specialist result in the originating Chat.

No specialist receives workspace-agent tools, and specialists cannot delegate.

## Why this is acceptable

The public product is the nine-package Marketing OS suite published by one
catalog owner. Provider neutrality does not require customers to substitute
arbitrary packages behind the Launcher routes. Keeping the targets fixed is a
security property.

The static bindings have already passed private normal-Chat delegation for all
eight routes, hostile self-delegation attempts, failure recovery, and complete
child-result return.

## Rejected alternative

Do not enable `useWorkspaceAgents` or call `withWorkspaceAgentTools`. Those
paths would expose unrelated installed agents and rely on mutable task-level
tool augmentation without an allowlist.

## Failure and fallback behavior

If the expected package is missing, denied, suspended, or unavailable,
Launcher shows a blocked and resumable workstream. It does not choose a
similarly named agent.

If Guild fails to bind or return a child result in a clean public installation,
Launcher uses the Marketing OS Guide behavior: identify the intended workflow,
show the required package, provide the handoff prompt, and direct the user to
select or `@mention` that specialist. It must not claim that delegation or
cockpit import occurred.

## Remaining release proof

Public release still requires:

- a private organization-owned rehearsal Launcher bound only to the eight
  organization-owned capability package IDs, because Guild private packages
  are owner-scoped and cannot be installed across owners;
- a clean organization with the public Launcher and eight public capability
  packages installed through the customer experience;
- a same-named unrelated agent present in that workspace;
- one normal-Chat run for each route;
- proof that only the intended child task was created;
- missing, denied, suspended, timeout, malformed-output, and safety-failure
  cases;
- concurrent sessions proving no cross-session tool mutation; and
- confirmation that the Launcher itself cannot be called recursively.

This is an acceptance gate, not an unresolved architecture dependency.

## Evidence

- Launcher source: `agents/launcher/agent.ts`
- Installed SDK helper: `agents/launcher/node_modules/@guildai/agents-sdk/dist/services/guild.js`
- Private browser acceptance: `docs/validation/2026-07-28-browser-ux.md`
- Routing and allowlist tests: `scripts/test-launcher-routing.mjs`
- Canonical cockpit tests: `scripts/test-launcher-cockpit.mjs`
- Guild SDK documentation: <https://docs.guild.ai/packages/agents-sdk>
