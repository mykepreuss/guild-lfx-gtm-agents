# README templates

Copy the matching profile. Replace `{braces}`. Delete unused optional sections. Do not leave placeholder prose in a published README.

---

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

---

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

---

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
