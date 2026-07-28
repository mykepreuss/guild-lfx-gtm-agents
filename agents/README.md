# Agents

Guild-native source packages live here. Each directory is a standalone Guild
TypeScript package. `catalog.json` is the source of truth for topology,
requirements, and release status.

The suite has one support package and eight capability packages:

- `launcher/` — Marketing OS Launcher, the intended default front door.
- `foundation-setup/` — Knowledge Graph / Company Context Builder.
- `market-signal/`
- `icp/`
- `audience-segmentation/`
- `messaging/`
- `branding-pitch-deck/`
- `social-monitoring-content/`
- `campaigns-paid-media/`

Launcher is a coded, allowlisted router. It reads current workspace state,
routes one clear request to one suite capability, validates the returned
artifact, and shows provenance and the next handoff in the originating chat.
Only Launcher may delegate. It must never expose itself or arbitrary customer
workspace agents as callable tools.

Company Context Builder owns context setup and the exact two-step context
publication gate. It reads current published workspace context before making a
readiness claim. When a user asks for downstream work, Builder identifies
itself as context-only and directs the request to Launcher or the named
specialist; it does not turn the instruction into a new company packet.

The seven specialists are self-contained draft/review agents. They set
`useWorkspaceAgents: false` (or use `noTools`), cannot delegate, and return the
shared Marketing OS headings, evidence mode, safety envelope, approval gate,
status payload, and handoff. Private Guild Skills are optional maintainer
assets, not runtime dependencies.

## Intended Guild user flow

1. Create or select a dedicated Marketing OS workspace.
2. Install Marketing OS Launcher from Agent Hub.
3. Approve Launcher’s installation request for Context Builder.
4. Approve each specialist request, one at a time.
5. Make Launcher the default agent in the Guild UI and let Launcher verify it.
6. Supply source through Context Builder, approve the artifact, and use the
   exact publication phrase.
7. Ask Launcher for specialist work and resume workstreams without repasting
   prior artifacts.

This remains a private-alpha flow. Packages must not become public until the
clean-organization and unaffiliated design-partner gates pass.

## Rules

- Do not hand-write or hand-edit Guild-generated `guild.json`.
- Do not use direct Guild save/publish, workspace install, credentials,
  triggers, visibility changes, or context publication without explicit
  lifecycle approval.
- Keep customer-specific facts out of package source.
- Public agents must not import `guildai~skills`.
- Preserve the exact evidence modes:
  `source_supplied`, `connected_read_only`, and `live_monitoring`.
- Preserve `action_mode: draft_only` and
  `external_mutation_requested: false`.
- Store every live attempt, including failures, through the evidence collector.

Each package keeps `agent.ts`, the Guild-managed `guild.json`, `package.json`,
`tsconfig.json`, and a concise `README.md`.
