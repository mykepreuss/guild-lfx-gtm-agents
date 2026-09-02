---
name: guild-agent-readme
description: >
  Writes Hub-presentable Guild agent README files to a 10/10 standard.
  Use when creating or rewriting an agent README, making an agent forkable,
  improving Hub packaging, or when the user mentions README quality, quickstart,
  plain-text workflow request, or presentable agent docs.
---

# Guild Agent README

Write product-facing READMEs that a stranger can fork, install, and run.

Before writing, decide the profile:

- **Workflow agent** — timer, webhook, or structured JSON in; reusable artifacts out. Examples: error-spike-alerter, price-drop-monitor.
- **Chat-native agent** — Guild Chat in; a review packet or cockpit reply out. Examples: Marketing OS launcher, ICP specialist.

Do not grade a chat cockpit against `notification` / `deliveryHandoff` / Smith. Those sections are workflow-only.

Fill the matching template in [references/README-TEMPLATE.md](references/README-TEMPLATE.md). For why each section exists, read [references/GOLD-EXAMPLE.md](references/GOLD-EXAMPLE.md).

## Hard rules

- Product-facing third person. No personal names, private ops, or “ask X”.
- Human title (`# Error Spike Alerter`), not a package name (`# owner~agent`).
- One-sentence tagline: job + what this agent is not.
- Explicit negative boundaries: `Does **not** …` and `Never …`.
- Show a natural-language task in a blockquote. Workflow agents also show structured JSON.
- Test commands use `From <agent-directory>:` — never `C:\Users\...` or `/Users/...`.
- Every command in the README must exist in `package.json` or be a real `guild` CLI command a forker can run.
- Do not pin tests to the author’s private workspace (`--workspace owner/private-name`) unless that workspace is public and documented as required.
- Claims must match the code. If tools are `noTools`, do not advertise crawl, monitor, scrape, send, or publish.
- Hub `description` in `agent.ts` and the README tagline must tell the same story.

## Section order

### Universal

1. `# Name` + tagline
2. `## Behavior` — capabilities, then `Does **not**` / `Never`
3. `## Quickstart` — install or add to a workspace, first message or first payload
4. `## Plain-text workflow request` — blockquote
5. `## Output` — named fields or chat headings the user will see
6. `## Development` — portable build/test from `<agent-directory>`

### Workflow-only

Insert after the plain-text request:

- `## Structured input` — real JSON, real values
- `## Inputs` — field-by-field defaults and bounds
- Expand `## Output` with `notification.{subject,text,html}`, `deliveryHandoff`, and the gating flag (`shouldDeliver`, `notified`)
- `## Composition` — Smith wires notifiers; this agent does not send
- `## Schedule` — only if a timer is part of the product

After the structured example, add this bridge sentence:

> Smith or another workflow composer can translate this request into the structured input below, then wire any notifier to `deliveryHandoff.payload` when `{gatingFlag}` is true.

### Chat-native extras

- `## What to send` — 2–4 example chat lines, plus the text payload shape if the agent only accepts `{ "type": "text", "text": "..." }`
- `## Suite position` — when the agent is one of several: which front door to use, what must exist first, where to go next
- Document exact confirmation phrases if the code requires them
- Say whether a dedicated workspace is required

### Optional

`## Best For`, `## Required setup and permissions`, `## Scope and boundaries` (if Behavior is getting long), `## Dependencies`, `## Notes`. Keep optional sections after Behavior or after Output, not before the tagline.

## Tone

- Precise, short sentences. Prefer “returns X” over “helps you think about X”.
- Channel-neutral: delivery is composition, not core behavior, unless the agent’s purpose *is* a channel.
- Honest about V1. Write “intentionally deferred” instead of implying a missing integration exists.
- Role labels (`Marketing Owner`) over runtime usernames.

## Development block

Start the section with `From <agent-directory>:`, then a bash fence containing only commands that exist:

- `pnpm install`
- `pnpm test` — omit if there is no test script
- `pnpm run build`
- `pnpm run bundle` / `guild agent test --bundle agent.js.gz` — omit if unused
- `guild agent test` is the portable live-test default; Guild creates an ephemeral version automatically

Use `npm run …` only when that script is in `package.json` and Guild runtime expects it. Do not invent scripts. Live-test credential needs go in one sentence after the commands.

## After writing

Re-read the README against the code:

1. Every advertised script exists.
2. Every advertised tool or integration is imported.
3. A forker who is not the author can follow Quickstart.
4. The first 8 lines would make a Hub visitor want to install it.
