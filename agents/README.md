# Agents

Guild-native source packages live here. Each package is a standalone Guild TypeScript agent initialized under the `michaelpreuss` owner and testable against `michaelpreuss/guild-marketing-os`.

The Company Context Builder is the structured root package. It uses a Zod-backed `agent()` implementation to return typed context artifacts, approval gates, AEO readiness, a status payload, downstream handoffs, and a Markdown approval packet.

The other seven V1 packages run as prompt-only one-shot review-packet agents. They still ask focused questions and mark missing evidence, but they return that review state in the response instead of relying on live follow-up turns. They also set `useWorkspaceAgents: false`. V1 agent chaining is a human-guided workflow, not implicit workspace-agent orchestration.

V1 contains eight source packages:

- `foundation-setup/` - source directory for the Knowledge Graph / Company Context Builder
- `market-signal/`
- `icp/`
- `audience-segmentation/`
- `messaging/`
- `branding-pitch-deck/`
- `social-monitoring-content/`
- `campaigns-paid-media/`

## Rules

- Do not hand-write or hand-edit `guild.json`.
- `guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json` is approved for package validation.
- Use `npm run test:guild-smoke` and `npm run test:guild-adversarial` from the repo root for committed Guild CLI test coverage.
- Re-run `guild agent init` only when intentionally repairing or reinitializing one of these existing package records.
- Do not run `guild agent save`, `guild agent publish`, workspace install, credentials, triggers, or visibility changes until the user explicitly approves those lifecycle steps.
- Keep customer-specific facts out of agent package code.
- Put reusable behavior in `agent.ts`, concise always-on project context in Guild workspace context, and approved project artifacts in the approved context artifacts.

## Package Shape

Each package should keep:

- `agent.ts` - reusable prompt and agent behavior.
- `guild.json` - Guild-managed package record; do not edit by hand.
- `package.json` and `tsconfig.json` - Guild TypeScript scaffold.
- `README.md` - concise purpose, boundary, and test command.

`foundation-setup/` also pins `zod` because its package boundary is schema-backed. Do not add more package dependencies unless they are needed for a real Guild-native contract or integration.
