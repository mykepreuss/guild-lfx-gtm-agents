<!-- Generated fixture demo packet. No live platform changes are performed. -->

# Audience Segmentation Agent Local V1 Packet

Future Agent Hub name: `marketing-os-audience-segmentation`

Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.

## Workflow Summary
Drafts personas and segment definitions from contributor and member signals, then prepares sync and re-engagement recommendations.

Trigger: New event, new campaign, or quarterly target-market review.

## Context Hub
Required artifacts:
- `project-context`
- `messaging-source`
- `audience-segments`
- `proof-and-constraints`

Optional artifacts:
- `dashboard-signals`
- `channel-registry`

Missing context behavior: Ask for missing source data, consent rules, or segment goals before recommending sync.

Source policy:
- Missing segment data becomes an explicit question.
- Do not infer audience priority without approved context.
- Mark unproven segment assumptions as fixture assumptions or TBD.

## Inputs Captured Or Assumed
- Request: Create audience segments for a contributor re-engagement campaign and October webinar promotion.
- Project leader question: Which campaign, event, or quarterly review is this segment for?
- Project leader question: Which audiences should be included or excluded?
- Project leader question: What contact-frequency guardrail should protect community members?
- Project leader question: Which dormant audience should be re-engaged?
- Fixture assumption: Segments must reduce repeated outreach to the same individuals.
- Fixture assumption: Personas combine contributor activity and member interest signals.

## Generated Assets
### Persona Drafts
Persona 1 - Active Maintainer: already contributes, values roadmap clarity, needs fewer generic marketing touches and more decision context.
Persona 2 - Technical Evaluator: engaged with docs or events, comparing project fit, needs proof, reference architectures, and getting-started paths.
Persona 3 - Dormant Contributor: contributed or attended before, has not engaged in 180 days, responds best to specific ways back in.

### Segment Criteria
Webinar target: technical evaluators with docs visits, event attendance, or newsletter clicks in the last 120 days, excluding active maintainers.
Contributor re-engagement: contributors with no merged PR, issue comment, event attendance, or newsletter click in 180 days.
Sponsor-safe audience: member contacts with explicit marketing consent and no community-only suppression flag.

### Suppression Rules
Suppress anyone who received two event promotions in the last seven days.
Suppress unsubscribed, legal hold, community-only, and sponsor-contract-only contacts.
Route ambiguous consent records to data owner review before use.

## Approval Checklist
- Project leader approves persona names and use cases.
- Marketing owner approves segment criteria.
- Data owner confirms source fields and suppression rules.
- Campaign owner confirms contact-frequency guardrails.

## Dashboard Update Payload
```json
{
  "agentId": "audience-segmentation",
  "agentHubName": "marketing-os-audience-segmentation",
  "agentDisplayName": "Audience Segmentation Agent",
  "category": "gtm-marketing-os",
  "tags": [
    "audience",
    "segmentation",
    "personas",
    "consent"
  ],
  "mode": "fixture-backed-local-v1",
  "liveExecution": false,
  "project": "Open Source Cloud Native Project",
  "status": "ready_for_project_leader_review",
  "sourceRequest": "Create audience segments for a contributor re-engagement campaign and October webinar promotion.",
  "workstream": "audience",
  "ownerRole": "Data Owner",
  "approvalStatus": "ready_for_review",
  "decisionRequired": "Approve persona names, segment criteria, consent guardrails, and suppressions.",
  "blockers": [
    "Source field confirmation",
    "Consent review",
    "Contact-frequency guardrail approval"
  ],
  "nextAction": "Approve or edit plain-language segment criteria before any future adapter writes lists to marketing systems.",
  "metrics": [
    {
      "key": "eligible_contact_count",
      "label": "Eligible contacts",
      "value": 6800,
      "unit": "contacts"
    },
    {
      "key": "suppression_count",
      "label": "Suppressed contacts",
      "value": 940,
      "unit": "contacts"
    },
    {
      "key": "re_engagement_candidates",
      "label": "Re-engagement candidates",
      "value": 510,
      "unit": "contacts"
    }
  ],
  "sourceConfidence": "fixture_assumption",
  "downstreamAgents": [
    "newsletter-composition",
    "event-promotion",
    "campaigns-paid-media"
  ],
  "contextHub": {
    "requiredArtifacts": [
      "project-context",
      "messaging-source",
      "audience-segments",
      "proof-and-constraints"
    ],
    "optionalArtifacts": [
      "dashboard-signals",
      "channel-registry"
    ],
    "missingContextBehavior": "Ask for missing source data, consent rules, or segment goals before recommending sync.",
    "sourcePolicy": [
      "Missing segment data becomes an explicit question.",
      "Do not infer audience priority without approved context.",
      "Mark unproven segment assumptions as fixture assumptions or TBD."
    ]
  },
  "agentHubReadiness": {
    "packageStatus": "not_packaged",
    "validationStatus": "not_run",
    "visibility": "draft_only",
    "notes": [
      "Local lab definition only.",
      "No Guild lifecycle package has been created for this definition.",
      "Any Agent Hub exemplar remains local-only until packaging is approved.",
      "Do not save, publish, or change Agent Hub visibility until packaging is approved."
    ]
  },
  "signals": {
    "segment_review_status": "ready",
    "persona_count": 3,
    "eligible_contact_count": 6800,
    "suppression_count": 940,
    "re_engagement_candidates": 510
  }
}
```

## Future Integration Adapter Notes
- Audience Studio or Segment: V1 documents the handoff. Future live action: Write approved segment definitions to segmentation platform.
- HubSpot: V1 documents the handoff. Future live action: Create or update target lists.
- Identity Platform: V1 documents the handoff. Future live action: Resolve live identity and consent fields.

## Next Recommended Action
Approve or edit plain-language segment criteria before any future adapter writes lists to marketing systems.
