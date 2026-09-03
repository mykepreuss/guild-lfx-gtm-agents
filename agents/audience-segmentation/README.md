# Audience Segmentation

Turns an approved ICP into reviewable audience segments in Guild Chat and flags consent, suppression, and privacy requirements without granting compliance approval or activating marketing.

## Behavior

- Defines segment purpose, inclusion and exclusion rules, suppressions, consent constraints, geography, freshness, and channel applicability.
- Maps approved ICP evidence to list-building instructions without inventing unavailable fields or audience counts.
- Separates planning-ready segment logic from activation prerequisites and data-owner decisions.
- Returns downstream requirements for messaging, campaigns, channel planning, and measurement.
- Does **not** activate CRM lists, ad audiences, enrichment jobs, email sends, or platform targeting.
- Does **not** ensure compliance or grant legal, privacy, or consent approval; it flags requirements and missing evidence for human review.
- Never treats a planning packet as permission to sync, upload, contact, or spend.

## Suite position

- Front door: use Marketing OS Launcher for normal suite routing; use this agent directly only for focused segmentation work.
- Required before this agent: an approved ICP plus known source fields, consent rules, suppressions, geography, and intended channels.
- Next agent after a successful run: Messaging or Campaigns And Paid Media through Launcher.

Use a dedicated Marketing OS workspace with approved Workspace Context when segment definitions should be reused across the suite.

## Quickstart

1. Create or select a dedicated Guild workspace and add **Audience Segmentation** from Agent Hub.
2. Add approved Workspace Context or include the approved ICP and targeting constraints in the request.
3. Open a new Chat with this agent and send the request below. For the coordinated suite workflow, send it to Marketing OS Launcher instead.

## Plain-text workflow request

> Turn the approved ICP into reviewable audience segments for our intended channels. Include inclusion, exclusion, consent, suppression, and freshness rules, and mark every missing source field as TBD.

## What to send

- The approved ICP and intended channel or campaign use.
- Available CRM, list, or audience fields without including unnecessary personal data.
- Consent, geography, suppression, freshness, and data-owner constraints.
- `Show which segment rules are planning-ready and which still block activation review` — returns a readiness split.

Outside Chat, send a text payload such as:

```json
{ "type": "text", "text": "Create audience segments from the approved ICP for these channels and constraints: ..." }
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
