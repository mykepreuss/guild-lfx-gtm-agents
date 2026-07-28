# Guild Marketing OS Agents

Guild-native source workspace for a Marketing OS agent suite for GTM teams. The suite turns approved company context into reusable workspace context and reviewable GTM artifacts across market signal, ICP, audience segmentation, messaging, brand/deck, social/content, and campaigns/paid media work.

## How It Works

1. A workspace owner installs Marketing OS Launcher once in a dedicated
   Marketing OS workspace.
2. Launcher verifies the eight capability packages and requests one
   user-approved installation at a time, beginning with Company Context
   Builder.
3. Company Context Builder turns supplied source into a revisioned approval
   packet. After artifact approval, the exact confirmation
   `publish approved context to workspace context` is the second publication
   gate.
4. Launcher reads the published workspace context, routes one clear request to
   an allowlisted specialist, returns the complete result in the originating
   chat, and records provenance and the next handoff.
5. All V1 work is draft-only. Public packages contain their authoritative
   methods and do not depend on private Guild Skills.

## Guild Architecture

Use Guild surfaces this way:

- **Agent package**: reusable behavior. The source starts in `agents/<agent>/agent.ts`.
- **Guild workspace context**: short Platform Context summary and routing instructions that every agent receives at runtime.
- **Approved Context Artifacts**: reviewable project artifacts owned by the user or workspace; the starter source lives in `context-hub/`.
- **State adapter**: provider-neutral durable sources, artifacts, approvals,
  workstreams, handoffs, export, deletion, and immutable audit.
- **Private Skills**: optional maintainer references only; never a public
  installation or runtime dependency.
- **Triggers**: later scheduled or event-based runs, including a future read-only Context Steward.

The existing single-workspace publish bridge is compatibility-only private
infrastructure and is not eligible for public V1. Public context publication is
blocked until Guild supplies delegated, workspace-scoped authorization. The
production persistence target is Cloud Run plus Cloud SQL for PostgreSQL; see
`docs/adr/0001-public-v1-persistence-boundary.md`.

## Important Guild Boundary

The Guild CLI is installed locally for package initialization and testing. Current observed CLI version: `0.14.0`.

Allowed for this implementation and package maintenance:

```sh
guild --version
guild auth status
guild doctor
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
npm run verify
npm run publish:guild-agent -- --agent <agent-id> --message "<release message>"
```

Allowed only when intentionally reinitializing one of the existing package records:

```sh
guild agent init --name <guild-marketing-os-name> --agent-type GUILD_TYPESCRIPT --template LLM --owner michaelpreuss --directory agents/<agent>
```

Direct Guild save/publish commands are not allowed from this GitHub monorepo. GitHub is the source of truth; Guild is a deployment target. To publish, commit and push the monorepo first, then use `npm run publish:guild-agent`, which clones the target Guild agent into a temporary directory and runs `guild agent save --publish` only from that Guild-managed clone.

Not allowed until separately approved for the specific lifecycle change:

```sh
guild agent unpublish
guild workspace agent add
guild credentials
guild trigger create
```

Direct CLI workspace context publishing remains disallowed from this repo.
Private compatibility testing may use the existing Builder bridge. Public V1
must use a delegated, workspace-scoped integration and remains blocked until
that authorization path exists and passes tenant-isolation tests.

`guild.json` is managed by Guild and should not be hand-written or edited by hand in this repo.

## Folder Map

- `agents/catalog.json` - suite contract and per-agent approved context artifact requirements.
- `agents/<agent>/` - Guild-native source packages.
- `agents/launcher/` - coded, allowlisted suite router and cockpit entrypoint.
- `context-hub/` - approved context artifact starter templates, not the always-injected runtime context.
- `workspace-context/` - concise Guild workspace context draft.
- `guild-skills/` - optional maintainer method sources; not a runtime dependency.
- `services/guild-marketing-os-state/` - provider-neutral state contract,
  reference adapter, and PostgreSQL schema.
- `services/workspace-context-publish-bridge/` - private, single-workspace
  compatibility bridge; not public V1 infrastructure.
- `scripts/` - local validation and guarded Guild release tooling.

## Agent Suite

Recommended suite order:

1. Marketing OS Launcher (support package and default front door)
2. Knowledge Graph / Company Context Builder
3. Market Signal Agent
4. ICP Agent
5. Audience Segmentation Agent
6. Messaging Agent
7. Branding And Pitch Deck Agent
8. Social Monitoring And Content Agent
9. Campaigns And Paid Media Agent

Use `agents/catalog.json` as the source of truth for package names, order, context requirements, and operating boundaries.

Marketing OS Launcher is the default front door. It uses deterministic routing
for clear requests, a strict enum-only classifier for ambiguous requests, and
an explicit allowlist containing only the eight capability packages. It cannot
invoke itself or arbitrary customer agents. Specialists remain unable to
delegate.

Company Context Builder is the structured context capability. It reads current
published workspace context before making readiness claims, remains
context-only for downstream requests, and preserves the exact two-step
publication gate.

## Using Marketing OS In The Guild Interface

This path is for workspace owners and users who access Marketing OS only through Guild, without access to this source repository.

### External Workspace Setup In Guild UI

1. Sign in to Guild and create or open the target workspace.
2. Install the public Marketing OS Launcher from Agent Hub.
3. Start Launcher onboarding. Approve Context Builder and then each of the seven
   specialists, one request at a time.
4. Resume Launcher onboarding after any denied, unavailable, or suspended
   request; the missing package remains visibly blocked.
5. In the Guild workspace UI, make Marketing OS Launcher the default agent.
   Launcher verifies the resulting default-agent state.
6. Invite the GTM users who will supply company context, review drafts, and
   approve artifacts.

No public packages are visible yet. This is the target customer flow and is a
release gate, not a claim that public onboarding is available today. Workspace
users will not need GitHub, Node.js, a CLI, a Blaxel account, or infrastructure
credentials.

### User Workflow

Use Marketing OS as a sequential review workflow. It drafts approved context, strategy, messaging, content, and campaign artifacts; it does not launch campaigns, publish content, activate lists, spend budget, or change external systems.

Recommended operating loop:

1. Start with Marketing OS Launcher.
2. Paste readable company/source text, business goals, known audiences, proof-backed claims, channel scope, and constraints.
3. Review the Company Context Approval Packet. Resolve important `TBD` items or approve the packet as a useful first version.
4. Send exactly `publish approved context to workspace context` to publish the compact workspace context brief.
5. Ask Launcher for a specialist artifact. Launcher reads context, invokes only
   the matching installed suite agent, and returns the complete result.
6. Resume a workstream or approve an artifact through Launcher. Direct
   specialist chats remain available for expert use but are outside the
   persisted cockpit until imported.
7. If company facts, positioning, proof policy, audiences, or channel scope
   change materially, ask Launcher to return to Company Context Builder and
   refresh the published context.

For best results with any downstream agent, include the task, target audience or channel, desired decision, any approved artifact text, required constraints, and what should be treated as out of scope. Ask the agent to mark assumptions and `TBD` items rather than filling gaps with invented facts.

Example downstream prompt shape:

```text
Use the published workspace context as the source of truth.
Task: draft [artifact] for [audience/channel/decision].
Use these approved inputs: [paste or reference relevant packet sections].
Constraints: [claims to avoid, compliance limits, budget, geography, brand rules, timing].
Output: keep the standard Marketing OS headings and mark unsupported items TBD.
```

Every specialist agent should return the shared Marketing OS frame:

- `## Consumed Context`
- `## Produced Artifact`
- `## Assumptions And Missing Evidence`
- `## Approval Gate`
- `## AEO / AI-Readiness Contribution`
- `## Status Payload`
- `## Downstream Handoff`

### Agent Usage Order And Expected Artifacts

| Order | Agent | What the user should do for best results | Expected artifact |
|---:|---|---|---|
| 1 | **Knowledge Graph / Company Context Builder** (`guild-marketing-os-company-context-builder`) | Paste readable company/source text rather than relying on unread attachments. Include company identity, product surface, audiences, goals, channels, proof-backed claims, compliance or legal constraints, competitors, customer proof, pricing, and open questions. Review the draft, approve it, then send exactly `publish approved context to workspace context` when ready. | **Company Context Approval Packet** with drafted `company-context`, `messaging-source`, `brand-kit`, `audience-segments`, `channel-registry`, `proof-and-constraints`, and `dashboard-signals`; approved facts; missing evidence; approval gates; AEO readiness; status payload; downstream handoff; compact workspace context brief publication state. |
| 2 | **Market Signal Agent** (`guild-marketing-os-market-signal`) | Provide the approved company context plus source scope: peers, competitors, search results, answer-engine prompts, analyst/media excerpts, social/community excerpts, developer forums, date range, and known coverage gaps. If no external source set is available, ask for a source-gap brief rather than a comprehensive market read. | **Market Signal Brief** with Source Set, Signal Themes, Audience Language, Peer And Positioning Signals, AEO And Search Signals, Content And Campaign Opportunities, and Watchouts. |
| 3 | **ICP Agent** (`guild-marketing-os-icp`) | Provide workspace context, the Market Signal Brief, business goals, current or desired buyers/users, examples of good-fit and poor-fit customers, adoption triggers, decision criteria, and any evidence limits. | **ICP Approval Packet** with Target Model Summary, Primary ICPs, Secondary Or Future Audiences, Disqualifiers, Audience Questions And AEO Priorities, and Decision Criteria. |
| 4 | **Audience Segmentation Agent** (`guild-marketing-os-audience-segmentation`) | Provide approved ICPs, disqualifiers, channels in scope, available list or CRM fields, consent and geography limits, suppression rules, source freshness, and whether the output is for content planning, paid media, sales, email, or another channel. | **Audience Segmentation Packet** with Segmentation Strategy, Segment Definitions, Suppression And Consent Rules, Channel Applicability, and Activation Readiness. |
| 5 | **Messaging Agent** (`guild-marketing-os-messaging`) | Provide the ICP packet, segmentation packet, proof-and-constraints artifact, market language, competitors, public surfaces where copy may be used, and claims that must be approved or avoided. | **Messaging Approval Packet** with Positioning Summary, Message Pillars, Proof-Backed Claims, Answer-Ready Blocks, Boilerplate And Short Copy, and Objection Handling. |
| 6 | **Branding And Pitch Deck Agent** (`guild-marketing-os-branding-pitch-deck`) | Provide approved messaging, audience, proof constraints, existing brand assets or constraints, desired deck audience, the decision the deck should drive, website or AEO needs, and slide count if the default five-slide brief is not enough. | **Brand And Pitch Packet** with Brand Architecture, Visual Direction, Pitch Narrative, Slide-By-Slide Brief, Web And AEO Recommendations, and Production Boundaries. |
| 7 | **Social Monitoring And Content Agent** (`guild-marketing-os-social-monitoring-content`) | Provide approved messaging, brand voice, segments, channel registry, social/community excerpts or monitoring scope, cadence, content goals, proof constraints, and any platform-specific restrictions. | **Social Monitoring And Content Brief** with Signal Review, Opportunity Queue, Content Plan, platform-specific Drafts, and Proof And Brand Check. |
| 8 | **Campaigns And Paid Media Agent** (`guild-marketing-os-campaigns-paid-media`) | Provide approved messaging, audience segments, channel registry, offer, destination or landing page, budget, target KPI, geography, consent limits, creative assets, proof policy, and performance data if asking for optimization. | **Campaigns And Paid Media Packet** with Campaign Brief, Audience-Message Matrix, Creative And Test Plan, Landing Page And AEO Recommendations, Performance Loop, and Launch Or Optimization Gate. |

The order is the recommended full GTM build sequence, not a hard dependency chain for every task. If an approved artifact already exists, users can go directly to the relevant specialist agent, but they should still provide or rely on published workspace context and any required artifact excerpts.

## Runtime Methods

Every public agent is self-contained. The seven specialists inline the
authoritative review method and run through the same coded, typed evidence and
safety contract. Formatting may be repaired once; evidence and safety failures
return a blocked receipt without a silent retry. Files in `guild-skills/` may
assist maintainers, but installation and successful output must not depend on
them.

## Operating Boundaries

Marketing OS is a Guild-native review-agent suite, not an autonomous marketing execution system.

Supported behavior:

- Draft reviewable marketing artifacts from user-supplied or approved context.
- Mark missing facts as `TBD` and separate evidence from assumptions.
- Recommend approval gates, downstream handoffs, and AEO/readiness inputs.
- Persist approved company context only through the exact two-step confirmation
  flow and a delegated, workspace-scoped publication integration.
- Guide user-approved suite installation during onboarding; never silently
  install packages.
- Block live publishing, scheduling, paid spend, CRM activation, credentials,
  triggers, legal approval, and visibility changes.

Not autonomous:

- No production database is deployed yet; the adapter contract and PostgreSQL
  schema are implemented, while production deployment remains a release gate.
- No source connectors, CRM/ad platform/social publishing adapters, or credentialed actions.
- No delegation beyond the Launcher-to-one-specialist allowlist.
- No production load, concurrency, permission, or workspace-composition validation for hundreds of users.

Before broad production use, add explicit orchestration, broader structured contracts where needed, durable context storage, connector permission models, operational observability, and load/security review.

## Commands

```sh
npm run verify
npm run check:context
npm run test:specialist-runtime
npm run test:guild-smoke
npm run test:guild-smoke:full
npm run test:guild-adversarial
npm run publish:guild-agent -- --agent foundation-setup --message "Publish company context builder updates"
```

`npm run verify` is non-mutating. It validates the Guild-native scaffold and approved context artifact contract.

`npm run test:guild-smoke` is the fast development smoke. It runs the Company Context Builder first-run case plus focused chat UX cases so iteration stays quick while the interface is changing. `npm run test:guild-smoke:full` runs the full all-agent smoke suite and should be used before release-style publishes or broad workspace validation.

The Guild test commands require an authenticated Guild CLI session and run live ephemeral tests against the configured workspace. Use `GUILD_WORKSPACE=<owner/workspace>` to override the default workspace.

`npm run publish:guild-agent` requires a clean GitHub worktree with no unpushed or behind commits. It copies tracked files from one package into a temporary Guild clone, builds there, saves/publishes the Guild version with `--no-bump`, verifies the published version matches the source `package.json`, and removes the temp clone. Use `--dry-run` to validate the bridge without publishing.

## Maintainer Setup And Deployment

The remainder of this section documents the legacy private compatibility
environment so maintainers can reproduce and retire it. It is not the public V1
deployment path. Its fixed owner/workspace and maintainer Guild token are known
release blockers. Do not copy this configuration to a customer organization.

Use this compatibility runbook only when you have repository, GitHub, Guild
CLI, and Blaxel access and intentionally need to reproduce the existing private
workspace-context bridge.

### Prerequisites

- A Guild account with owner/admin access to the target workspace owner.
- The Guild CLI installed and authenticated:

```sh
guild auth status
guild doctor
```

- Node.js 20+ and npm.
- GitHub access to this monorepo. GitHub is the source of truth; Guild is a deployment target.
- A Blaxel account or team workspace that can deploy private agent-hosted HTTP endpoints.
- Blaxel CLI access: `bl version` and `bl workspaces` should work locally.
- A host-side Guild API token for the bridge. This token must be allowed to read, draft, and publish workspace context for the target workspace.
- A long-lived Blaxel API key or service-account token for the Guild integration credential. Do not use a short-lived CLI session token for production.

Default production identifiers used by this repository:

- Guild workspace: `michaelpreuss/guild-marketing-os`
- Guild owner: `michaelpreuss`
- Workspace context bridge integration: `michaelpreuss~guild-marketing-os-workspace-context@1.0.1`
- Blaxel workspace: `knicks`
- Blaxel bridge resource: `guild-marketing-os-workspace-context`
- Blaxel bridge URL: `https://agt-guild-marketing-os-workspace-context-hxboop.bl.run`
- Managed workspace context markers:
  - `<!-- guild-marketing-os-context:start -->`
  - `<!-- guild-marketing-os-context:end -->`

### 1. Prepare The Source Repo

```sh
cd marketing-os
npm install
npm run verify
npm run test:foundation-state
```

Before publishing to Guild, commit and push the GitHub branch. The guarded publish script refuses to publish from a dirty worktree, an unpushed branch, a branch behind upstream, or a non-GitHub origin.

```sh
git status --short
git log --oneline @{u}..HEAD
git log --oneline HEAD..@{u}
```

### 2. Create Or Select The Guild Workspace

Create or open the Guild workspace named `guild-marketing-os` under the `michaelpreuss` owner. The workspace should have the Company Context Builder installed as the default chat entrypoint:

- Agent package: `michaelpreuss~guild-marketing-os-company-context-builder`
- Workspace: `michaelpreuss/guild-marketing-os`
- Default user flow: paste company context, approve the packet, then send exactly `publish approved context to workspace context`.

Use the CLI to confirm access and installed package visibility:

```sh
guild workspace agent list --workspace michaelpreuss/guild-marketing-os
guild agent get michaelpreuss~guild-marketing-os-company-context-builder
```

If a package directory has never been initialized, let Guild create `guild.json` with `guild agent init`. Do not hand-write `guild.json`.

### 3. Publish The Company Context Builder

Publish from the monorepo only through the guarded helper:

```sh
npm run publish:guild-agent -- --agent foundation-setup --message "Publish company context builder updates"
```

This helper clones the Guild agent package into a temporary directory, copies tracked package files from `agents/foundation-setup/`, runs install/build inside the clone, runs `guild agent save --publish --wait` there, and verifies the published Guild version matches `agents/foundation-setup/package.json`.

Do not run `guild agent save` or `guild agent publish` directly from this GitHub monorepo.

### 4. Deploy The Workspace Context Bridge To Blaxel

The Company Context Builder does not call raw Guild service endpoints. It calls the hosted bridge through the Guild integration contract, and the bridge performs the supported workspace-context draft and publish lifecycle.

Set the target Blaxel workspace explicitly. Do not commit this value into `blaxel.toml`.

```sh
export BLAXEL_WORKSPACE=knicks
```

Run Blaxel deploy commands from the bridge package with recursion disabled. Do not run `bl deploy -d services/workspace-context-publish-bridge` from the repo root; with current Blaxel CLI behavior that can package unrelated workspace files.

```sh
cd services/workspace-context-publish-bridge
npm test
bl deploy --dryrun --recursive=false -w "$BLAXEL_WORKSPACE"
```

Deploy with the host-side Guild token as a Blaxel runtime secret:

```sh
bl deploy \
  -w "$BLAXEL_WORKSPACE" \
  --recursive=false \
  -s GUILD_API_TOKEN="$GUILD_API_TOKEN"
```

Production runtime values:

- `GUILD_API_TOKEN`: required Blaxel secret; host-side Guild token with workspace-context read/write/publish permission.
- `GUILD_ALLOWED_WORKSPACE_FULL_NAMES`: committed in `services/workspace-context-publish-bridge/blaxel.toml` as `michaelpreuss/guild-marketing-os`.
- `BRIDGE_API_TOKEN`: leave unset for Blaxel private production. The Blaxel private endpoint is the request gate.

Optional environment variables:

- `GUILD_ALLOWED_WORKSPACE_IDS`: comma-separated workspace id allow-list for stricter scoping.
- `GUILD_API_BASE_URL`: defaults to `https://app.guild.ai/api`.
- `HOST`: set by Blaxel; local default is `0.0.0.0`.
- `PORT`: set by Blaxel; local default is `8787`.

Resolve and verify the private Blaxel bridge URL:

```sh
export BLAXEL_BRIDGE_URL="$(bl get agent guild-marketing-os-workspace-context -w "$BLAXEL_WORKSPACE" -o json | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const j=JSON.parse(s); const item=Array.isArray(j)?j[0]:j; console.log(item.metadata?.url ?? item.url)})')"

curl -fsS \
  "$BLAXEL_BRIDGE_URL/health" \
  -H "Authorization: Bearer $BLAXEL_API_KEY" \
  -H "X-Blaxel-Workspace: $BLAXEL_WORKSPACE"
```

Expected response:

```json
{"status":"ok"}
```

Unauthenticated `GET /health` should fail with `401` or `403`, confirming Blaxel is enforcing private access. An authenticated malformed publish request should reach the bridge and return `400 invalid_request`, proving Blaxel is forwarding the configured route:

```sh
curl -i \
  "$BLAXEL_BRIDGE_URL/workspace-context/publish" \
  -H "Authorization: Bearer $BLAXEL_API_KEY" \
  -H "X-Blaxel-Workspace: $BLAXEL_WORKSPACE" \
  -H "content-type: application/json" \
  --data '{}'
```

### 5. Configure The Guild Bridge Integration

Create or update the hosted Guild integration with this contract:

- Owner: `michaelpreuss`
- Service name: `guild-marketing-os-workspace-context`
- Version: `1.0.1`
- Base URL: the direct Blaxel bridge URL from `bl get agent guild-marketing-os-workspace-context`
- Operation: `workspace_context_publish`
- Method/path: `POST /workspace-context/publish`
- Request schema: `services/workspace-context-publish-bridge/schemas/publish-request.schema.json`
- Response schema: `services/workspace-context-publish-bridge/schemas/publish-response.schema.json`
- Auth: API key mapped to `Authorization: Bearer {token}` using a long-lived Blaxel API key or service-account token.

Update the existing integration in place after the Blaxel live checks pass:

```sh
guild integration update michaelpreuss~guild-marketing-os-workspace-context \
  --base-url "$BLAXEL_BRIDGE_URL"

guild integration connect michaelpreuss~guild-marketing-os-workspace-context \
  --owner michaelpreuss \
  --token "$BLAXEL_API_KEY"
```

The Company Context Builder source should continue to call:

```ts
guildServiceTool("guild-marketing-os-workspace-context", {
  owner: "michaelpreuss",
  versionNumber: "1.0.1",
})
```

If the integration version changes, update the Company Context Builder source and publish the agent again.

### 6. Run A Publish Smoke Test

Run the local checks first:

```sh
npm run verify
npm run test:foundation-state
```

Then exercise the live workspace in Guild:

1. Open `https://app.guild.ai/users/michaelpreuss/workspaces/guild-marketing-os`.
2. Start a Company Context Builder chat and paste the approved company context packet.
3. Confirm the response includes `workspace_context_status: source_available` or an equivalent approval-ready state.
4. Send the approval message requested by the agent to save the approved packet in session state.
5. Send exactly:

```text
publish approved context to workspace context
```

6. Open the workspace context page and verify a new published version exists.
7. Confirm the managed block contains `## Workspace Context Brief`, `## Source Corpus Summary`, and `## Compaction Audit`.
8. Confirm the published managed block does not contain raw citation artifacts such as `cite`.
9. Confirm manual unmanaged workspace context before and after the managed markers is preserved.

Useful CLI smoke commands:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
npm run test:guild-smoke
```

### Troubleshooting

- `401` or `403` before the bridge response means the Guild integration credential does not match the Blaxel private endpoint auth.
- `400 invalid_request` from an authenticated malformed publish request is expected during route-forwarding smoke tests.
- A workspace allow-list failure means `GUILD_ALLOWED_WORKSPACE_FULL_NAMES` or `GUILD_ALLOWED_WORKSPACE_IDS` does not include the target workspace.
- If no workspace context version is published, inspect the Company Context Builder event log. Unsupported new claims block publishing by design during the compaction audit.
- If `npm run publish:guild-agent` fails before publishing, fix the GitHub repo state first: commit, push, pull/rebase if behind, and rerun from the monorepo root.
- If the live agent cannot access a raw `guild` service, that is expected. The production path is the hosted bridge integration, not direct raw Guild service access from the agent runtime.

## Maintainer Guild CLI Notes

Initialize or repair package directories with the Guild CLI and let Guild create `guild.json`:

```sh
guild agent init --name guild-marketing-os-company-context-builder --agent-type GUILD_TYPESCRIPT --template LLM --owner michaelpreuss --directory agents/foundation-setup
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```

Do not run `guild agent save` or `guild agent publish` directly from this monorepo. Use `npm run publish:guild-agent` after explicit approval to publish an agent package through a temporary Guild clone. Do not install agents, configure credentials, change visibility, or create triggers unless that lifecycle step is explicitly approved for the current change. Direct CLI workspace context publish is not the normal path; use the Company Context Builder approval flow and host-controlled publish bridge.

## References

- Guild docs: https://docs.guild.ai
- Guild CLI reference: https://docs.guild.ai/cli/getting-started
- Guild Platform Context / workspace context: https://docs.guild.ai/platform/context
- Guild Skills: https://docs.guild.ai/platform/skills
- Guild CLI Skills: https://docs.guild.ai/cli/skills
- Agent Hub publishing: https://docs.guild.ai/platform/publish-to-agent-hub
