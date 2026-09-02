# Campaigns And Paid Media

Turns approved context, audiences, messaging, and constraints into a reviewable campaign-planning packet in Guild Chat without launching campaigns, changing spend, or activating audiences.

## Behavior

- Produces campaign briefs, audience-message matrices, channel and destination plans, creative angles, test plans, and performance-review loops.
- Defines KPI, tracking, UTM, dashboard, budget-assumption, guardrail, and approval requirements.
- Separates planning allocations from live media spend and keeps performance recommendations subject to human review.
- Identifies landing-page, consent, audience, proof, creative, finance, and reporting gaps before activation review.
- Does **not** launch ads, change spend, activate or sync audiences, publish landing pages, or edit tracking systems.
- Never presents a campaign plan, artifact approval, or budget scenario as authorization to execute.

## Suite position

- Front door: use Marketing OS Launcher for normal suite routing; use this agent directly only for focused campaign planning.
- Required before this agent: approved company context, messaging, audience segments, channel scope, proof policy, destination, KPI, and budget assumptions.
- Next agent after a successful run: human marketing, brand, legal, privacy, data, finance, and platform owners for review; messaging or destination gaps can return through Launcher.

Use a dedicated Marketing OS workspace with approved Workspace Context when the campaign should reuse suite context.

## Quickstart

1. Create or select a dedicated Guild workspace and add **Campaigns And Paid Media** from Agent Hub.
2. Add approved Workspace Context or include the relevant company, audience, messaging, proof, channel, budget, and KPI constraints in the request.
3. Open a new Chat with this agent and send the request below. For the coordinated suite workflow, send it to Marketing OS Launcher instead.

## Plain-text workflow request

> Create a reviewable integrated-campaign plan for the approved audience and offer. Include channel roles, creative angles, destination needs, KPI and tracking requirements, budget assumptions, decision rules, and every gate required before launch or spend.

## What to send

- Objective, audience, offer, channel, destination, timing, and approval owner.
- Budget range, KPI, baseline or performance data, consent limits, geography, and reporting context.
- Approved proof, prohibited claims, available creative, and landing-page constraints.
- `Review this campaign result and recommend pause, revise, continue, or scale criteria` — returns a human-review decision loop, not an automatic action.

Outside Chat, send a text payload such as:

```json
{ "type": "text", "text": "Create an integrated-campaign plan from the approved context and these budget assumptions: ..." }
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

The Status Payload reports the evidence mode and a status of `needs_input`, `ready_for_review`, or `blocked`. `action_mode` remains `draft_only`.

## Development

From `<agent-directory>`:

```sh
npm install
npm run build
guild agent test
```

`guild agent test` creates an ephemeral version from the local agent repository. Guild authentication is required; no private author workspace is required.
