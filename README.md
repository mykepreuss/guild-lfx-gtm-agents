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
- Current private/team workspace package publish and install steps have been run for testing in `michaelpreuss/guild-marketing-os`; no triggers, credentials, or public visibility changes have been run. Workspace context publish is available only through the Company Context Builder's two-step chat-gated approval flow.
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

The Company Context Builder may publish an approved compact workspace context brief after the exact two-step confirmation. The full approved source corpus remains in session state for audit and should not be injected wholesale into Guild workspace context.

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

Direct CLI workspace context publishing remains disallowed from this repo. The approved path is the Company Context Builder chat flow: approve the draft, then send exactly `publish approved context to workspace context`.

`guild.json` is managed by Guild and should not be hand-written or edited by hand in this repo.

## Folder Map

- `agents/catalog.json` - suite contract and per-agent approved context artifact requirements.
- `agents/<agent>/` - Guild-native source packages.
- `context-hub/` - approved context artifact starter templates, not the always-injected runtime context.
- `workspace-context/` - concise Guild workspace context draft.
- `guild-skills/` - source markdown and catalog records for private live Guild Skills.
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

The Company Context Builder is the current chat-native first-run entrypoint. It should be the default workspace agent because the V1 product promise is compound context: user-supplied company context becomes approved artifacts before downstream agents draft specialist work. It returns a concise review summary at the top of the full Markdown packet, persists the prior draft in task state for follow-up approval turns, and publishes a compact workspace context brief only after the exact confirmation phrase.

## Runtime Skill Activation

The seven prompt-only review agents declare `@guildai-services/guildai~skills@1.0.0` and expose the generated `SkillsTools` tool set. At runtime, Guild provides `skills_search` and `skills_activate` from the `guildai~skills` integration. Agents are instructed to search for a relevant reusable method first, activate only matching `qualifiedName` records from `guild-skills/catalog.json`, and treat activated skill bodies as method guidance rather than customer facts, evidence, approval, or permission for live action.

The structured `guild-marketing-os-company-context-builder` package does not declare `guildai~skills` yet. Keeping activation out of that coded root agent preserves the first-run context contract until a deliberate programmatic skill-call contract is added.

## Production Readiness Boundary

V1 is a Guild-native review-agent starter pack, not a production autonomous marketing system.

Safe V1 behavior:

- Draft reviewable marketing artifacts from user-supplied or approved context.
- Mark missing facts as `TBD` and separate evidence from assumptions.
- Recommend approval gates, downstream handoffs, and AEO/readiness inputs.
- Persist approved company context to Guild workspace context through the Company Context Builder's exact two-step confirmation flow.
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

## Guild Setup

Initialize or repair package directories with the Guild CLI and let Guild create `guild.json`:

```sh
guild agent init --name guild-marketing-os-company-context-builder --agent-type GUILD_TYPESCRIPT --template LLM --owner michaelpreuss --directory agents/foundation-setup
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```

Do not run `guild agent save` or `guild agent publish` directly from this monorepo. Use `npm run publish:guild-agent` after explicit approval to publish an agent package through a temporary Guild clone. Do not install agents, configure credentials, change visibility, or create triggers unless that lifecycle step is explicitly approved for the current change. Direct CLI workspace context publish is not the normal path; use the Company Context Builder approval flow.

## References

- Guild docs: https://docs.guild.ai
- Guild CLI reference: https://docs.guild.ai/cli/getting-started
- Guild Platform Context / workspace context: https://docs.guild.ai/platform/context
- Guild Skills: https://docs.guild.ai/platform/skills
- Guild CLI Skills: https://docs.guild.ai/cli/skills
- Agent Hub publishing: https://docs.guild.ai/platform/publish-to-agent-hub
