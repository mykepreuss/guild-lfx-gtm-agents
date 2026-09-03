# Messaging

Turns approved context, audience evidence, and proof constraints into a reviewable messaging system in Guild Chat without publishing copy or approving claims.

## Behavior

- Produces positioning, narrative, message pillars, proof-backed claims, answer-ready blocks, boilerplate, tone guidance, and objection handling.
- Connects claims to approved evidence and marks unsupported language as a hypothesis, missing proof, or do-not-use claim.
- Adapts message recommendations to approved audiences and intended surfaces without inventing channel context.
- Returns downstream guidance for brand, web, content, campaigns, sales assets, and answer-engine readiness.
- Does **not** publish copy, update websites, launch campaigns, or provide legal, brand, or executive approval.
- Never turns a source-supplied statement into an approved public claim without the required evidence and review state.

## Suite position

- Front door: use Marketing OS Launcher for normal suite routing; use this agent directly only for focused messaging work.
- Required before this agent: approved company context, audience or ICP inputs, differentiation, proof constraints, and intended copy surfaces.
- Next agent after a successful run: Branding And Pitch Deck, Social Monitoring And Content, or Campaigns And Paid Media through Launcher.

Use a dedicated Marketing OS workspace with approved Workspace Context when messaging should become reusable suite context.

## Quickstart

1. Create or select a dedicated Guild workspace and add **Messaging** from Agent Hub.
2. Add approved Workspace Context or include the relevant company, audience, proof, and claim constraints in the request.
3. Open a new Chat with this agent and send the request below. For the coordinated suite workflow, send it to Marketing OS Launcher instead.

## Plain-text workflow request

> Create a reviewable messaging system for the approved ICP. Include positioning, message pillars, proof-backed claims, objections, answer-ready blocks, and a claim table that clearly marks missing evidence.

## What to send

- Approved company context, ICP or segment, differentiation, and customer-language evidence.
- Claims that are approved, review-required, blocked, or prohibited.
- Intended surfaces such as a homepage, product page, pitch, campaign, or FAQ.
- `Audit this draft message against the approved proof constraints` — returns claim and evidence gaps before reuse.

Outside Chat, send a text payload such as:

```json
{ "type": "text", "text": "Create a messaging system for the approved ICP and proof constraints" }
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
