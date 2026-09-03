# Market Signal

Turns approved source material into an evidence-labeled Market Signal Brief in Guild Chat without crawling sources, claiming live coverage, or executing marketing actions.

## Behavior

- Organizes supplied market, peer, competitor, community, search, answer-engine, developer, and social evidence into ranked themes.
- Separates verified quotes, paraphrased source claims, unverified signals, synthesized patterns, and hypotheses.
- Identifies audience language, positioning signals, contradictions, coverage gaps, and downstream implications.
- Returns a reviewable brief with an evidence mode, source coverage, limitations, and safety status.
- Does **not** crawl private or public sources, contact people, publish findings, or change systems.
- Never claims comprehensive or live market coverage unless an approved connected source was actually inspected.

## Suite position

- Front door: use Marketing OS Launcher for normal suite routing; use this agent directly only for a focused Market Signal Brief.
- Required before this agent: approved company context plus pasted source excerpts, research notes, or exported connected-source results that define the evidence scope.
- Next agent after a successful run: ICP, Messaging, Answer Engine/Web work, or Campaigns through Launcher.

Use a dedicated Marketing OS workspace with approved Workspace Context when the brief should be company-specific.

## Quickstart

1. Create or select a dedicated Guild workspace and add **Market Signal** from Agent Hub.
2. Add approved Workspace Context or include the relevant company facts in the request.
3. Open a new Chat with this agent and send the request below. For the coordinated suite workflow, send it to Marketing OS Launcher instead.

## Plain-text workflow request

> Review the pasted competitor-page and community excerpts, rank the strongest market signals, separate evidence from inference, and show what the findings imply for ICP and messaging.

## What to send

- The intended market, audience, timeframe, peer or competitor set, and decision the brief should support.
- Pasted source excerpts, research notes, monitoring exports, or results copied from an approved connected source.
- URLs may be included as unread references, but this agent has no web or connector tools and does not open them.
- Known source bias, freshness limits, missing channels, and claims that require extra scrutiny.
- `Identify the highest-value evidence gaps before we update positioning` — returns a focused research-gap brief.

Outside Chat, send a text payload such as:

```json
{ "type": "text", "text": "Review these supplied competitor and community sources and prepare a Market Signal Brief: ..." }
```

## Output

Every substantial response uses these sections in order:

1. `Consumed Context`
2. `Produced Artifact`
3. `Assumptions And Missing Evidence`
4. `Approval Gate`
5. `AEO / AI-Readiness Contribution`
6. `Status Payload`
7. `Downstream Handoff`

Direct runs report `source_supplied` evidence mode because this agent does not query connectors or live monitors. Results copied from another approved source remain supplied evidence. Status is `needs_input`, `ready_for_review`, or `blocked`, and `action_mode` remains `draft_only`.

## Development

From `<agent-directory>`:

```sh
npm install
npm run build
guild agent test
```

`guild agent test` creates an ephemeral version from the local agent repository. Guild authentication is required; no private author workspace is required.
