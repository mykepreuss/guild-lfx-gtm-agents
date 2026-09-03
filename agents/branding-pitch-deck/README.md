# Branding And Pitch Deck

Turns approved messaging into a reviewable brand, web, and pitch-production brief in Guild Chat without creating final design files or publishing websites.

## Behavior

- Defines brand architecture, voice, tone, visual direction, proof hierarchy, and web narrative from approved messaging.
- Produces an executive story arc and a slide-by-slide pitch brief with purpose, headline direction, content blocks, proof needs, and production notes.
- Recommends website and AEO improvements for entity clarity, answer extraction, metadata, structured-data inputs, and trust.
- Labels proposed benefits, implementation details, and outcomes as hypotheses or TBD when approved evidence is missing.
- Does **not** create a final logo, production identity, finished presentation file, or production website.
- Never claims legal, trademark, executive, brand, design, or web approval.

## Suite position

- Front door: use Marketing OS Launcher for normal suite routing; use this agent directly only for focused brand or pitch work.
- Required before this agent: approved messaging, audience, proof constraints, and any available brand assets or production requirements.
- Next agent after a successful run: a human brand, design, executive, or web owner; campaign and content implications can return through Launcher.

Use a dedicated Marketing OS workspace with approved Workspace Context when the brief should reflect reusable company context.

## Quickstart

1. Create or select a dedicated Guild workspace and add **Branding And Pitch Deck** from Agent Hub.
2. Add approved Workspace Context or include the relevant messaging, audience, proof, and brand constraints in the request.
3. Open a new Chat with this agent and send the request below. For the coordinated suite workflow, send it to Marketing OS Launcher instead.

## Plain-text workflow request

> Turn the approved messaging into a five-slide pitch-deck brief. Include the narrative arc, slide purpose, draft content blocks, proof needed, visual direction, and every approval required before production.

## What to send

- Approved messaging, audience, desired decision, and proof hierarchy.
- Existing brand assets, visual constraints, slide count, and presentation setting.
- Website or AEO questions that the brand narrative should answer.
- `Create a design-production brief without inventing product features` — returns an evidence-bounded handoff for a human designer.

Outside Chat, send a text payload such as:

```json
{ "type": "text", "text": "Create a five-slide pitch brief from the approved messaging and proof constraints" }
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
