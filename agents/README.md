# Agents

Guild-native source packages live here.

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
- `guild agent init` and `guild agent test` are approved for this V1 implementation.
- Do not run `guild agent save`, `guild agent publish`, workspace install, credentials, triggers, or visibility changes until the user explicitly approves those lifecycle steps.
- Keep customer-specific facts out of agent package code.
- Put reusable behavior in `agent.ts`, concise always-on project context in Guild Workspace Context, and approved project artifacts in the Context Hub.
