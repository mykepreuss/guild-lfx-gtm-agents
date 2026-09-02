# Guild Agent README

Write product-facing READMEs that a stranger can fork, install, and run.

Before writing, decide the profile:

- **Workflow agent**: timer, webhook, or structured JSON in; reusable artifacts out. Examples: error-spike-alerter, price-drop-monitor.
- **Chat-native agent**: Guild Chat in; a review packet or cockpit reply out. Examples: Marketing OS launcher, ICP specialist.

Do not grade a chat cockpit against `notification` / `deliveryHandoff` / Smith. Those sections are workflow-only.

Use the matching template in **README templates** below. For why each section exists, read **Gold example: Error Spike Alerter**.

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

---

# README templates

Copy the matching profile. Replace `{braces}`. Delete unused optional sections. Do not leave placeholder prose in a published README.

## Workflow agent

```markdown
# {Agent Name}

{One sentence: what it does, and that delivery channels are not part of this agent.}

## Behavior

- {Capability.}
- Always returns `notification.{subject,text,html}` and `deliveryHandoff`.
- Does **not** post to Slack, email, or any other channel.
- Never {mutates / creates / spends / publishes} {resource}.

{One or two sentences on least-privilege credentials and where they are sent.}

## Best For

- {Use case.}
- {Smith-built workspace example: "watch X and notify me when Y".}

## Quickstart

1. Add `{owner~agent-name}` to a Guild workspace.
2. Attach the required credential: {name, read-only scope}.
3. Send the plain-text request below, or the structured JSON, through a timer or `guild agent test`.

## Plain-text workflow request

> {Natural-language task a human would type. Include cadence, threshold, and what to do with prior-run state.}

Smith or another workflow composer can translate this request into the
structured input below, then wire any notifier to
`deliveryHandoff.payload` when `{gatingFlag}` is true.

## Structured input

{Real JSON with realistic values. No empty stubs.}

## Inputs

- `{field}`: {meaning, default, bounds.}

## Output

The result includes:

- `{field}` — {meaning}
- `notification` and `deliveryHandoff` for any notifier adapter
- `{gatingFlag}` — true when a downstream notifier should send

{What happens on the quiet / no-op path.}

## Composition

Use Smith to attach output-channel agents (email, Slack, Telegram, etc.) that
consume `deliveryHandoff.payload` when `{gatingFlag}` is true. Keep this agent
focused on {core responsibility}.

## Development

From `<agent-directory>`:

    pnpm install
    pnpm test
    pnpm run build

Live testing requires {credential}. No Slack or email credentials are required
for this agent.
```

If the agent is scheduled, add `## Schedule` after Behavior: timer cadence and which output fields to feed back as input.

## Chat-native agent

```markdown
# {Agent Name}

{One sentence: the job in Guild Chat, and what this agent does not execute.}

## Behavior

- {Capability.}
- {How it keeps or does not keep chat / task state.}
- Does **not** {publish / spend / scrape / call other agents / mutate CRM}.
- Never {treats artifact approval as execution approval / invents facts / …}.

## Suite position

- Front door: {Launcher / this agent / user @-picks}.
- Required before this agent: {published workspace context / approved packet / nothing}.
- Next agent after a successful run: {name, or "stay in this chat"}.

## Quickstart

1. Create or use a dedicated workspace. Do not drop this into a workspace that already holds unrelated product context.
2. Install `{owner~agent-name}`{, plus these sibling packages: …}.
3. Open a new chat with this agent and send the first message below.

## Plain-text workflow request

> {The first useful thing a new user should type.}

## What to send

- `{exact phrase or short command}` — {what happens}
- `{example}` — {what happens}

If you invoke the agent outside Chat, the payload is:

    { "type": "text", "text": "{same request as the blockquote}" }

{If the code requires an exact confirmation phrase, quote it verbatim here.}

## Output

Chat replies use these headings, in this order:

1. `{Heading}` — {what lives here}
2. `{Heading}` — {what lives here}

Status values you will see: `{needs_input | ready_for_review | blocked}`.
`action_mode` is `{draft_only}` unless the user later adds an execution path.

## Development

From `<agent-directory>`:

    pnpm install
    pnpm run build
    guild agent test

{One sentence: any live credential or workspace rule. Do not pin a private workspace name.}
```

## Shared checklist before publish

- [ ] Title is a human name
- [ ] Tagline matches `description` in `agent.ts`
- [ ] At least two `Does **not**` / `Never` bullets
- [ ] Blockquote plain-text example
- [ ] Quickstart a forker can follow
- [ ] Every shell command exists
- [ ] No absolute paths
- [ ] No author-only workspace in the default test command
- [ ] Capability words match tools actually imported

---

# Gold example: Error Spike Alerter

Source: a published workflow agent whose README is the quality bar. This section explains *why* each part is there. Do not copy New Relic specifics into unrelated agents. Copy the shape.

## Tagline

```markdown
# Error Spike Alerter

Detects New Relic error-rate spikes against the preceding one-hour baseline,
frames the anomaly, and returns reusable incident artifacts. Delivery channels
are not part of this agent.
```

Why it works:

- Human title, not `owner~error-spike-alerter`.
- One job (detect + frame), one artifact promise (reusable incident output).
- Last sentence removes the usual Hub-visitor question: “does this post to Slack?”

Chat-native equivalent: “…and returns a review packet in Guild Chat. It does not launch campaigns or change spend.”

## Behavior

```markdown
## Behavior

- Queries one application's current error rate, trailing baseline, and top
  error signatures through New Relic NerdGraph.
- Trips at 3x baseline by default.
- Always returns `notification.{subject,text,html}` and `deliveryHandoff`.
- Also returns `formattedMessage` as reusable Slack-flavored text for adapters.
- Does **not** post to Slack, email, or any other channel.
- Caps recommended deliveries per hour using `recentPostTimestamps` /
  `shouldDeliver`.
- Never creates or changes New Relic resources.
```

Why it works:

- Positive bullets name the integration, the default threshold, and the output contract.
- `formattedMessage` is labeled an artifact for adapters, not a Slack send.
- Two negative bullets (`Does **not**`, `Never`) match the code.
- The next paragraph states credential scope and that the key is never echoed back.

Chat-native equivalent: drop `notification` / `deliveryHandoff` if the agent does not return them. Keep the negative bullets.

## Schedule

Present only because this agent is a timer. It tells the composer which output field (`recentPostTimestamps`) must be fed back. Omit on a chat cockpit.

## Plain-text + structured pair

```markdown
## Plain-text workflow request

> Monitor the New Relic application `checkout-api` every 15 minutes. Alert when
> its current error rate is at least 3x the previous hour, include the top five
> error signatures and the checkout dashboard, and cap delivery at two posts
> per hour.

Smith or another workflow composer can translate this request into the
structured input below, then wire any notifier to
`deliveryHandoff.payload` when `shouldDeliver` is true.
```

Why it works:

- A human can paste the blockquote into Smith or a workflow prompt.
- Threshold, cadence, and circuit-breaker policy are in the sentence, not hidden.
- The bridge sentence names the gating flag (`shouldDeliver`) so composers do not notify on every run.

The JSON that follows uses a real-looking `appName`, not `"string"`. Chat-native agents skip the JSON block and put 2–4 example utterances under `## What to send`.

## Output

Names the fields a composer will read (`currentRate`, `tripped`, `shouldDeliver`) and the quiet path: no spike, no LLM, `shouldDeliver` is false. That prevents “why didn’t it email me?” support load.

Chat-native equivalent: list the exact Markdown headings the model must emit, plus `needs_input` / `ready_for_review` / `blocked`.

## Composition

```markdown
Use Smith to attach output-channel agents (email, Slack, Telegram, etc.) that
consume `deliveryHandoff.payload` when `shouldDeliver` is true. Keep this agent
focused on New Relic spike detection.
```

Why it works:

- Delivery is a sibling concern, not a dependency.
- `notify-me-by-email` may be mentioned as a zero-config example. It is never imported.
- A later sibling (`guildai~incident-summary`) is named only after responders already have a channel.

Do not add this section to a chat cockpit unless it actually returns `deliveryHandoff`.

## Development

```markdown
From `<agent-directory>`:

pnpm run build
node dist/spike.test.js
guild agent test
```

Why it works:

- Directory is a placeholder, not an absolute machine path.
- Commands match files that ship (`spike.test.ts` compiles to `dist/spike.test.js`).
- Live New Relic key is called out; Slack/email are explicitly not required.
- Deferred scope (“PagerDuty … deferred”) sits at the end so V1 is honest.

## Common downgrades this example avoids

| Downgrade | What the gold example did instead |
| --- | --- |
| Title is the Guild package name | Human product name |
| Only structured JSON, no blockquote | Both |
| “Can notify Slack” when it only returns text | `Does **not** post` + Composition |
| Absolute Windows path in Tests | `From <agent-directory>:` |
| Advertised `npm run verify` with no script | Only commands that exist |
| Missing quiet-path behavior | “If there is no spike…” |
| Internal names or “ask the author” | None |
