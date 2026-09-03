# Social Signals And Content

Turns supplied or approved social and community signals into reviewable content plans and draft responses in Guild Chat without monitoring channels, publishing, scheduling, or engaging.

Guild package: `guild-marketing-os-social-monitoring-content`

## Behavior

- Ranks supplied social and community opportunities by audience relevance, momentum, originality, proof readiness, brand fit, channel fit, and claim risk.
- Produces content themes, channel-specific plans, post drafts, reply options, digest opportunities, and proof checks.
- Distinguishes source-supplied observations from recommendations, hypotheses, and missing evidence.
- Returns four substantive weekly draft sections when the request asks for a four-week content plan.
- Does **not** monitor live channels, scrape communities, publish, schedule, reply, comment, or send direct messages.
- Never claims live observation or engagement unless an approved connected source was actually inspected.

## Suite position

- Front door: use Marketing OS Launcher for normal suite routing; use this agent directly only for focused social-signal or content work.
- Required before this agent: approved messaging, brand voice, audience segments, channel scope, proof constraints, and supplied social or community evidence.
- Next agent after a successful run: a human content or community owner; campaign and messaging gaps can return through Launcher.

Use a dedicated Marketing OS workspace with approved Workspace Context when drafts should reflect reusable company context.

## Quickstart

1. Create or select a dedicated Guild workspace and add **Social Monitoring And Content** from Agent Hub.
2. Add approved Workspace Context or include the relevant messaging, audience, brand, proof, and channel constraints in the request.
3. Paste social or community excerpts, monitoring exports, or results copied from an approved connected source. URLs alone are retained as unread references.
4. Open a new Chat with this agent and send the request below. For the coordinated suite workflow, send it to Marketing OS Launcher instead.

## Plain-text workflow request

> Turn the supplied community excerpts into a four-week content plan with one substantive draft per week. Rank the opportunities, preserve the source limitations, and flag every claim that needs proof or approval.

## What to send

- Supplied social posts, community excerpts, monitoring exports, research notes, or results copied from an approved connected source.
- This agent has no web, connector, or monitoring tools and does not open links or collect live signals.
- Approved messaging, audience, brand voice, content goals, channel constraints, and review owners.
- Observation dates and known coverage gaps when the source set is time-sensitive.
- `Draft response options for these supplied posts without publishing them` — returns review-only reply options.

Outside Chat, send a text payload such as:

```json
{ "type": "text", "text": "Create a four-week content plan from these supplied community excerpts: ..." }
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

`guild agent test` creates an ephemeral version from the local agent repository. Guild authentication is required; no private author workspace is required. Live channel monitoring is intentionally deferred.
