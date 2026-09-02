# Guild Marketing OS

Guild-native source for a draft-only Marketing OS suite. A dedicated Guild
workspace holds the shared company brief, one continuing Launcher Chat acts as
the durable cockpit, and eight capability agents produce reviewable marketing
artifacts.

Public V1 does not require an external database, cloud account, private Skill,
CLI, CRM, publishing credential, or advertising credential.

New to the product? Read the marketer-facing
[Start Here guide](docs/start-here.md) before the architecture and development
details below.

## Product Shape

The suite contains one front door and eight capability packages:

1. Marketing OS Launcher
2. Knowledge Graph / Company Context Builder
3. Market Signal Agent
4. ICP Agent
5. Audience Segmentation Agent
6. Messaging Agent
7. Branding And Pitch Deck Agent
8. Social Monitoring And Content Agent
9. Campaigns And Paid Media Agent

The Launcher is the only package that may delegate. Its callable allowlist
contains exactly the eight capability agents. Specialists cannot call other
agents, the Launcher cannot call itself, and unrelated workspace agents are
never exposed as tools.

## Guild-Only Architecture

Marketing OS deliberately uses two Guild surfaces for different kinds of
memory:

- **One continuing Launcher Chat** is the canonical cockpit. Guild task state
  stores runs, every attempt, artifact revisions, approvals, workstreams,
  handoffs, provenance, and the immutable audit trail. The implementation keeps
  a conservative 6 MiB ceiling below Guild's 8 MiB task-state limit.
- **Guild Workspace Context** contains only the compact, approved company
  brief that every agent needs. It is not a raw source archive or a workflow
  database.

This is an honest session boundary. Resuming the same Launcher Chat restores
the cockpit. Starting a new Chat starts a fresh cockpit, while still receiving
the published Workspace Context. Export is available as a structured response
in the canonical Chat. Confirmed deletion clears the structured cockpit state
from that Chat; it does not claim to erase Guild's retained Chat history or
published Workspace Context.

The provider-neutral state service and private context bridge under `services/`
remain reference and contingency implementations. They are not called by the
public V1 agents or the standard verification path.

The decision and its limitations are recorded in
`docs/adr/0001-public-v1-persistence-boundary.md`.

## Customer Experience

Public onboarding is designed to work entirely in Guild:

1. Create or select a dedicated Marketing OS workspace.
2. Install Marketing OS Launcher from Agent Hub.
3. Start Launcher onboarding.
4. Approve installation of Company Context Builder, followed by the seven
   specialists, one request at a time.
5. Use the Guild workspace settings to make Launcher the default agent.
6. Continue in the original Launcher Chat so it remains the canonical cockpit.
7. Paste readable company context and review the Company Context Approval
   Packet.
8. Approve the exact artifact revision.
9. Send exactly `publish approved context to workspace context` to pass the
   separate Workspace Context preparation gate.
10. Open **Context** from the workspace sidebar, keep existing notes, append
    the approved compact block returned by Launcher, and click **Publish**.
11. Ask Launcher for specialist work, resume workstreams, approve revisions,
    inspect status, or export the cockpit without repasting earlier results.

Denied or unavailable package installations stay visibly blocked and
resumable. No maintainer intervention or infrastructure credential is part of
the target customer flow.

Public packages are not yet released. The clean-organization rehearsal and
unaffiliated design-partner acceptance remain release gates.

## Context And Approval Lifecycle

Company Context Builder creates a review packet in the current Guild Chat. When
routed through Launcher, Launcher stores that packet as a revisioned cockpit
artifact.

Workspace Context publication is intentionally two-step:

1. Approve the exact Company Context artifact revision.
2. Send exactly `publish approved context to workspace context`.

Launcher then prepares only the approved Company Context artifact as one compact
managed block. Guild currently requires the final publish action in the native
Context screen, so Launcher gives the marketer a copyable block and tells them
to keep existing workspace notes, append the block, and click **Publish**.
Launcher does not request a Guild token, use a maintainer credential, or claim
that context changed before Guild shows the published version.

Direct Builder Chat remains useful for expert context drafting, but it routes
publication back to Launcher so that approval and publication provenance stay
in the canonical cockpit.

## Routing And Cockpit Behavior

Clear requests use deterministic routing. Only genuinely ambiguous requests use
an LLM classifier, and its accepted output is a strict route enum.

Before specialist delegation, Launcher:

- reads the injected Workspace Context;
- verifies the required suite package is installed;
- creates the durable local run and fails closed if state cannot be saved;
- records the context revision and intended package.

After delegation, Launcher:

- retains the complete initial output;
- permits at most one formatting repair;
- never silently retries a substantive, evidence, safety, or tool failure;
- validates the shared output contract and draft-only safety envelope;
- stores the artifact revision, workstream state, and handoff;
- returns the complete specialist artifact in the originating Chat.

`show Marketing OS status` renders the cockpit. `export Marketing OS cockpit`
returns its structured state. Deletion requires the exact second confirmation
`delete marketing os cockpit state from this chat`.

## Shared Specialist Contract

Every specialist result uses these headings:

- `## Consumed Context`
- `## Produced Artifact`
- `## Assumptions And Missing Evidence`
- `## Approval Gate`
- `## AEO / AI-Readiness Contribution`
- `## Status Payload`
- `## Downstream Handoff`

The shared validator checks required artifact sections, context and source
provenance, evidence status and limitations, the draft-only safety envelope,
blocked execution claims, approval and handoff payloads, and
specialist-specific content.

Market Signal and Social Monitoring results must disclose
`source_supplied`, `connected_read_only`, or `live_monitoring`. V1 normally
operates as `source_supplied` and must not imply comprehensive or live
observation when that evidence does not exist.

## Safety Boundary

Supported:

- Draft and revise reviewable marketing artifacts.
- Mark unknown facts `TBD`.
- Separate supplied evidence, inference, and recommendation.
- Track review and artifact approval.
- Prepare the approved compact company brief through the exact two-step gate
  for the marketer to publish in Guild's native Context screen.
- Guide one-at-a-time, user-approved suite installation.

Blocked in V1:

- Publishing or scheduling content.
- Starting, pausing, scaling, or spending on campaigns.
- CRM, list, advertising, social, or external database mutation.
- Credential setup or handling.
- Automatic monitoring or unsupported live-observation claims.
- Legal approval.
- Treating artifact approval as execution approval.

All public agents are self-contained. `guild-skills/` can remain useful to
maintainers but is never an installation or runtime dependency.

## Repository Map

- `agents/catalog.json` — suite topology, package names, and context contracts.
- `agents/launcher/` — coded router and canonical Guild Chat cockpit.
- `agents/foundation-setup/` — Company Context Builder.
- `agents/<specialist>/` — the seven structured specialist packages.
- `context-hub/` — approved context artifact templates.
- `workspace-context/` — compact managed Workspace Context reference.
- `guild-skills/` — optional maintainer references.
- `scripts/` — local verification, evidence, benchmark, and guarded publishing.
- `services/guild-marketing-os-state/` — contingency external adapter.
- `services/workspace-context-publish-bridge/` — legacy private compatibility
  bridge.
- `docs/adr/` — architecture decisions.
- `docs/validation/` — dated evidence, including failed attempts.

## Development And Verification

Run repository commands from this project directory:

```sh
cd marketing-os
npm run verify
```

The standard path covers suite contracts, context benchmark scoring,
specialist validation, Launcher routing and allowlisting, canonical cockpit
lifecycle, Builder regressions, every agent build, and rejection of external
runtime dependencies.

Live Guild tests are explicit because they create remote sessions:

```sh
npm run test:guild-smoke
npm run test:guild-adversarial
```

Context-size comparison is also explicit:

```sh
npm run benchmark:context
npm run benchmark:context:live
```

## Publishing Discipline

GitHub is the source of truth and Guild is the deployment target. Do not run
direct Guild save or publish commands from this monorepo.

The guarded publisher requires committed, pushed source, clones the target
Guild package into a temporary directory, and publishes from the Guild-managed
clone:

```sh
npm run publish:guild-agent -- \
  --agent <agent-id> \
  --message "<private release message>"
```

The nine Marketing OS packages are intentionally public in Agent Hub. Do not
change visibility, create triggers, add credentials, or unpublish versions
without the corresponding release authorization and evidence. `guild.json` is
Guild-managed and must not be hand-edited in this repository.

## Release Gates

Public Agent Hub availability is intentional for this draft-only suite.
Broader promotion, production-readiness claims, and any execution capability
remain blocked until all of these pass:

- Launcher and Builder versions prove the Guild-only lifecycle;
- every specialist completes through ordinary Launcher Chat;
- same-Chat resume, handoff, approval, export, and confirmed deletion pass;
- malformed output, timeout, missing agent, denial, stale context, and safety
  failures remain honest and auditable;
- no golden compliance, pricing, proof, or blocked-action fact is lost;
- a clean separate organization completes installation and use without
  maintainer CLI help;
- an unaffiliated design partner completes the same path;
- no external execution occurs.

See `docs/release-gates.md` for the current evidence ledger.
