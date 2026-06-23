# Agents

Guild-native source packages live here.

Phase 1 starts with one package:

- `foundation-setup/`

The rest of the suite remains represented in `catalog.json` until the Foundation Setup pattern is validated in Guild.

## Rules

- Do not hand-write `guild.json`.
- Do not run `guild agent init`, `guild agent save`, or `guild agent publish` until the user explicitly approves that lifecycle step.
- Keep customer-specific facts out of agent package code.
- Put reusable behavior in `agent.ts`, concise always-on project context in Guild Workspace Context, and approved project artifacts in the Context Hub.

