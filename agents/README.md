# Agents

Guild-native source packages live here. Each package is a standalone Guild TypeScript agent initialized under the `michaelpreuss` owner and testable against `michaelpreuss/guild-marketing-os`.

The Company Context Builder is the chat-native default entrypoint. It starts where the Marketing OS workflow starts: user-supplied company context becomes reviewable context artifact drafts, approval gates, AEO readiness, status, and downstream routing before specialist agents produce work.

The Company Context Builder is the structured root package. It uses a Zod-backed `agent()` implementation to return typed context artifacts, approval gates, AEO readiness, a status payload, downstream handoffs, workspace-context persistence state, a short inline review summary, and a chat-renderable Markdown approval packet.

After the exact two-step approval, the Company Context Builder publishes only through the host-controlled `michaelpreuss~guild-marketing-os-workspace-context@1.0.1` bridge. It does not call raw internal Guild workspace-context endpoints from the deployed agent runtime.

The other seven packages run as prompt-only review-packet agents. They still ask focused questions and mark missing evidence, but they return that review state in the response instead of relying on live follow-up turns. The seven prompt-only agents set `useWorkspaceAgents: false`. Agent chaining is a human-guided workflow, not implicit workspace-agent orchestration.

The suite contains eight source packages:

- `foundation-setup/` - source directory for the Knowledge Graph / Company Context Builder
- `market-signal/`
- `icp/`
- `audience-segmentation/`
- `messaging/`
- `branding-pitch-deck/`
- `social-monitoring-content/`
- `campaigns-paid-media/`

## Guild User Flow

External Guild users should start with the published Company Context Builder, approve the context packet, and publish the compact workspace context brief before asking specialist agents for work. Downstream agents should treat published Guild workspace context as their first source of truth, then approved context artifacts, current-session user input, activated skills for methods, and approved connected data.

Maintainers use this source directory only for package development, validation, and controlled publishing. External Guild users do not need this repository.

## Rules

- Do not hand-write or hand-edit `guild.json`.
- `guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json` is approved for package validation.
- Use `npm run test:guild-smoke` and `npm run test:guild-adversarial` from the repo root for committed Guild CLI test coverage.
- Re-run `guild agent init` only when intentionally repairing or reinitializing one of these existing package records.
- Do not run `guild agent save`, `guild agent publish`, direct CLI workspace context publish, workspace install, credentials, triggers, or visibility changes until the user explicitly approves those lifecycle steps.
- Keep customer-specific facts out of agent package code.
- Put reusable behavior in `agent.ts`, published company context in Guild workspace context, and approved company context artifacts in the approved context artifacts.
- Downstream agents treat published Guild workspace context as their first source of truth, then approved context artifacts, current-session user input, activated skills for methods, and approved connected data.

## Package Shape

Each package should keep:

- `agent.ts` - reusable prompt and agent behavior.
- `guild.json` - Guild-managed package record; do not edit by hand.
- `package.json` and `tsconfig.json` - Guild TypeScript scaffold.
- `README.md` - concise purpose, boundary, and test command.

`foundation-setup/` also pins `zod` because its package boundary is schema-backed. Do not add more package dependencies unless they are needed for a real Guild-native contract or integration.
