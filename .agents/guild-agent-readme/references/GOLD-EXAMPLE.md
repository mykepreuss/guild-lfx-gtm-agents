# Gold example: Error Spike Alerter

Source: a published workflow agent whose README is the quality bar. This file explains *why* each section is there. Do not copy New Relic specifics into unrelated agents. Copy the shape.

The original lives at `agents/error-spike-alerter/README.md` in the guild-projects repo.

---

## Tagline

```markdown
# Error Spike Alerter

Detects New Relic error-rate spikes against the preceding one-hour baseline,
frames the anomaly, and returns reusable incident artifacts. Delivery channels
are not part of this agent.
```

Why it works:

- Human title, not `dkountanis~error-spike-alerter`.
- One job (detect + frame), one artifact promise (reusable incident output).
- Last sentence removes the usual Hub-visitor question: “does this post to Slack?”

Chat-native equivalent: “…and returns a review packet in Guild Chat. It does not launch campaigns or change spend.”

---

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

---

## Schedule

Present only because this agent is a timer. It tells the composer which output field (`recentPostTimestamps`) must be fed back. Omit on a chat cockpit.

---

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

---

## Output

Names the fields a composer will read (`currentRate`, `tripped`, `shouldDeliver`) and the quiet path: no spike → no LLM → `shouldDeliver` is false. That prevents “why didn’t it email me?” support load.

Chat-native equivalent: list the exact Markdown headings the model must emit, plus `needs_input` / `ready_for_review` / `blocked`.

---

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

---

## Development

```markdown
From `<agent-directory>`:

pnpm run build
node dist/spike.test.js
guild agent test
```

Why it works:

- Directory is a placeholder, not `C:\Users\…`.
- Commands match files that ship (`spike.test.ts` compiles to `dist/spike.test.js`).
- Live New Relic key is called out; Slack/email are explicitly not required.
- Deferred scope (“PagerDuty … deferred”) sits at the end so V1 is honest.

---

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
