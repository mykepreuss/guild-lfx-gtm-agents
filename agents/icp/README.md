# ICP

Turns approved company context and market evidence into a reviewable ideal-customer-profile packet in Guild Chat without creating CRM records or activating audiences.

## Behavior

- Defines personas, pains, struggling moments, motivations, triggers, decision criteria, fit signals, and disqualifiers.
- Distinguishes buyers, users, champions, blockers, and other roles when the evidence supports them.
- Labels unvalidated personas, audience assumptions, and missing proof instead of presenting them as facts.
- Returns ICP implications for messaging, segmentation, content, campaigns, and answer-engine readiness.
- Does **not** create CRM records, enrich contacts, build lists, or activate audiences.
- Never treats a hypothetical persona or unsupported market assumption as approved customer evidence.

## Suite position

- Front door: use Marketing OS Launcher for normal suite routing; use this agent directly only for focused ICP work.
- Required before this agent: approved company context and, when available, a Market Signal Brief or customer evidence.
- Next agent after a successful run: Audience Segmentation or Messaging through Launcher.

Use a dedicated Marketing OS workspace with approved Workspace Context when the ICP should be reusable by other suite agents.

## Quickstart

1. Create or select a dedicated Guild workspace and add **ICP** from Agent Hub.
2. Add approved Workspace Context or include the relevant company, audience, and evidence inputs in the request.
3. Open a new Chat with this agent and send the request below. For the coordinated suite workflow, send it to Marketing OS Launcher instead.

## Plain-text workflow request

> Build a reviewable ICP from the approved company context and market evidence. Include fit and non-fit criteria, buying roles, triggers, objections, and the assumptions that still need validation.

## What to send

- Good-fit and poor-fit customer examples.
- Buyer, user, champion, and blocker roles when known.
- Adoption triggers, alternatives, objections, decision criteria, and business goals.
- `Compare two candidate ICPs and identify the evidence that would change the priority` — returns an evidence-labeled comparison.

Outside Chat, send a text payload such as:

```json
{ "type": "text", "text": "Build an ICP from the approved company context and supplied market evidence" }
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
