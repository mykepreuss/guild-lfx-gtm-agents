# Guild Marketing OS Agents

Guild-native source workspace for an open-source Guild Marketing OS agent suite for GTM teams.

This repository is safe to share: private source notes, meeting context, and client-specific material belong in `_private/`, which is ignored by Git.

## Current Status

- Guild-native V1 source build.
- Guild package initialization and testing are approved for this implementation.
- Active Guild test workspace: `michaelpreuss/guild-marketing-os`.
- Agent package records are initialized under the `michaelpreuss` owner to align with the active workspace.
- All eight deliverable package directories include Guild-managed `guild.json` records and source-ready `agent.ts` files.
- `guild-marketing-os-company-context-builder` is the workspace-friendly default chat entrypoint. It starts where the V1 business case starts: raw company context becomes reviewable Context Hub artifact drafts, approval gates, AEO readiness, a status payload, and downstream handoffs.
- The Company Context Builder is a structured Zod-backed `agent()` internally, but exposes canonical text input/output for Guild default chat compatibility. It returns a short inline review summary followed by the full Markdown packet.
- First-run source collection currently expects readable source text pasted into chat. If a user attaches a PDF or file without pasted text, the Company Context Builder blocks and asks for the relevant text instead of pretending it read the attachment.
- The other seven V1 agents use Guild-validating one-shot review-packet mode; missing context is returned as focused questions and `TBD` markers rather than live follow-up turns.
- The seven prompt-only review agents explicitly set `useWorkspaceAgents: false` for deterministic behavior before autonomous orchestration is designed.
- A committed Guild smoke/adversarial test harness is available under `scripts/run-guild-e2e.mjs`.
- Current private/team workspace package publish and install steps have been run for testing in `michaelpreuss/guild-marketing-os`. Workspace context publish is available only through the Company Context Builder's two-step chat-gated approval flow, which calls the private Blaxel-hosted `michaelpreuss~guild-marketing-os-workspace-context@1.0.1` publish bridge instead of raw Guild service endpoints or direct CLI workspace-context publishing.
- All eight V1 agents are committed deliverables.
- Old local labs, generated demo packets, and local-only exemplars have been removed.
- Approved context artifact templates are present under `context-hub/`.
- Private Guild Skills now cover foundation setup, customer research, positioning, fit, proof, answer-engine and web readiness, conversion experimentation, competitive intelligence, and campaign planning methods.
- `guild-skills/catalog.json` records the private live skill names, versions, CLI metadata, and required `guildai~skills` runtime integration. The seven prompt-only review agents declare `@guildai-services/guildai~skills` and can discover and activate relevant skills at runtime.
- License: Apache-2.0.

## V1 Goal

Create the smallest useful bridge from a clean Guild workspace to high-quality Guild Marketing OS agents:

1. A user enters business context into the default Company Context Builder chat.
2. The Company Context Builder returns a visible review summary plus a Markdown approval packet containing approved context artifact drafts, approval gates, AEO readiness, a status payload, and downstream handoffs.
3. After approval, the exact confirmation `publish approved context to workspace context` publishes a compact managed Guild workspace context brief.
4. Specialized methods live in private Guild Skills and are activated by review agents only when relevant to the current task.
5. Additional Guild Marketing OS agents reuse the approved context instead of carrying customer-specific facts inside their package code.

## Guild Architecture

Use Guild surfaces this way:

- **Agent package**: reusable behavior. The source starts in `agents/<agent>/agent.ts`.
- **Guild workspace context**: short Platform Context summary and routing instructions that every agent receives at runtime.
- **Approved Context Artifacts**: reviewable project artifacts owned by the user or workspace; the starter source lives in `context-hub/`.
- **Skills**: reusable methods, tone guides, review rubrics, and playbooks activated only when relevant by agents that declare `guildai~skills`.
- **Triggers**: later scheduled or event-based runs, including a future read-only Context Steward.

The Company Context Builder may publish an approved compact workspace context brief after the exact two-step confirmation. Its chat-native write path delegates the actual workspace read, managed-block replacement, draft creation, publish, and rollback metadata to the host-controlled `michaelpreuss~guild-marketing-os-workspace-context@1.0.1` bridge. The full approved source corpus remains in session state for audit and should not be injected wholesale into Guild workspace context.

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

Allowed only when intentionally reinitializing one of the existing V1 package records:

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

Direct CLI workspace context publishing remains disallowed from this repo. The approved path is the Company Context Builder chat flow: approve the draft, then send exactly `publish approved context to workspace context`; the agent then calls the host-controlled workspace-context publish bridge.

`guild.json` is managed by Guild and should not be hand-written or edited by hand in this repo.

## Folder Map

- `agents/catalog.json` - suite contract and per-agent approved context artifact requirements.
- `agents/<agent>/` - Guild-native source packages.
- `context-hub/` - approved context artifact starter templates, not the always-injected runtime context.
- `workspace-context/` - concise Guild workspace context draft.
- `guild-skills/` - source markdown and catalog records for private live Guild Skills.
- `services/workspace-context-publish-bridge/` - host-controlled publish bridge for chat-native workspace context writes.
- `scripts/` - local validation and guarded Guild release tooling.
- `_private/` - local-only private notes, ignored by Git.

## Agent Suite

Confirmed V1 suite order:

1. Knowledge Graph / Company Context Builder
2. Market Signal Agent
3. ICP Agent
4. Audience Segmentation Agent
5. Messaging Agent
6. Branding And Pitch Deck Agent
7. Social Monitoring And Content Agent
8. Campaigns And Paid Media Agent

All eight agents are committed V1 deliverables. Use `agents/catalog.json` as the source of truth for package names, order, context requirements, and operating boundaries.

The Company Context Builder is the structured root of the suite. It uses Zod schemas internally to force a typed packet for approved context artifact drafts, evidence status, approval gates, AEO readiness, status payloads, downstream handoffs, and workspace-context persistence state, then renders the packet into canonical text output for Guild chat. The downstream agents remain prompt-only review agents until their inputs or outputs need the same contract.

The Company Context Builder is the current chat-native first-run entrypoint. It should be the default workspace agent because the V1 product promise is compound context: user-supplied company context becomes approved artifacts before downstream agents draft specialist work. It returns a concise review summary at the top of the full Markdown packet, persists the prior draft in task state for follow-up approval turns, and publishes a compact workspace context brief only after the exact confirmation phrase through the host-controlled workspace-context publish bridge.

## Using Marketing OS In Guild

Use Marketing OS as a sequential review workflow. It drafts approved context, strategy, messaging, content, and campaign artifacts; it does not launch campaigns, publish content, activate lists, spend budget, or change external systems in V1.

Recommended operating loop:

1. Start with the Company Context Builder in the `michaelpreuss/guild-marketing-os` workspace.
2. Paste readable company/source text, business goals, known audiences, proof-backed claims, channel scope, and constraints.
3. Review the Company Context Approval Packet. Resolve important `TBD` items or approve the packet as a useful first version.
4. Send exactly `publish approved context to workspace context` to publish the compact workspace context brief.
5. Use the downstream agents in the order below. Each downstream agent should treat published Guild workspace context as its first source of truth.
6. If the company facts, positioning, proof policy, audiences, or channel scope change materially, return to the Company Context Builder and refresh the workspace context before asking downstream agents for new work.

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

## Runtime Skill Activation

The seven prompt-only review agents declare `@guildai-services/guildai~skills@1.0.0` and expose the generated `SkillsTools` tool set. At runtime, Guild provides `skills_search` and `skills_activate` from the `guildai~skills` integration. Agents are instructed to search for a relevant reusable method first, activate only matching `qualifiedName` records from `guild-skills/catalog.json`, and treat activated skill bodies as method guidance rather than customer facts, evidence, approval, or permission for live action.

The structured `guild-marketing-os-company-context-builder` package does not declare `guildai~skills` yet. Keeping activation out of that coded root agent preserves the first-run context contract until a deliberate programmatic skill-call contract is added.

## Production Readiness Boundary

V1 is a Guild-native review-agent starter pack, not a production autonomous marketing system.

Safe V1 behavior:

- Draft reviewable marketing artifacts from user-supplied or approved context.
- Mark missing facts as `TBD` and separate evidence from assumptions.
- Recommend approval gates, downstream handoffs, and AEO/readiness inputs.
- Persist approved company context to Guild workspace context through the Company Context Builder's exact two-step confirmation flow and host-controlled publish bridge.
- Block live publishing, scheduling, paid spend, CRM activation, credentials, workspace install, triggers, and visibility changes.

Not yet production autonomous:

- No production context database beyond Guild workspace context and per-session Company Context Builder state.
- No source connectors, CRM/ad platform/social publishing adapters, or credentialed actions.
- No autonomous agent-to-agent orchestration.
- No production load, concurrency, permission, or workspace-composition validation for hundreds of users.

Before broad production use, add explicit orchestration, broader structured contracts where needed, durable context storage, connector permission models, operational observability, and load/security review.

## Commands

```sh
npm run verify
npm run check:context
npm run test:guild-smoke
npm run test:guild-smoke:full
npm run test:guild-adversarial
npm run publish:guild-agent -- --agent foundation-setup --message "Publish company context builder updates"
```

`npm run verify` is non-mutating. It validates the Guild-native scaffold and approved context artifact contract.

`npm run test:guild-smoke` is the fast development smoke. It runs the Company Context Builder first-run case plus focused chat UX cases so iteration stays quick while the interface is changing. `npm run test:guild-smoke:full` runs the full all-agent smoke suite and should be used before release-style publishes or broad workspace validation.

The Guild test commands require an authenticated Guild CLI session and run live ephemeral tests against the configured workspace. Use `GUILD_WORKSPACE=<owner/workspace>` to override the default workspace.

`npm run publish:guild-agent` requires a clean GitHub worktree with no unpushed or behind commits. It copies tracked files from one package into a temporary Guild clone, builds there, saves/publishes the Guild version with `--no-bump`, verifies the published version matches the source `package.json`, and removes the temp clone. Use `--dry-run` to validate the bridge without publishing.

## Setting Up `guild-marketing-os` In Guild

Use this runbook to stand up the Guild Marketing OS workspace, publish the Company Context Builder, and enable chat-native workspace context publishing through the Blaxel-hosted bridge.

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

## Guild Setup

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
