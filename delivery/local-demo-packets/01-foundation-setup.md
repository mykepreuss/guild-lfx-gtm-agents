<!-- Generated fixture demo packet. No live platform changes are performed. -->

# Foundation Setup Agent Local V1 Packet

Future Agent Hub name: `marketing-os-foundation-setup`

Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.

## Workflow Summary
Creates the initial marketing foundation: brand direction, messaging source, site plan, social channel registry, OKRs, and dashboard setup.

Trigger: First login or major project refresh.

## Context Hub
Required artifacts:
- `project-context`
- `messaging-source`
- `brand-kit`
- `audience-segments`
- `channel-registry`
- `proof-and-constraints`
- `dashboard-signals`

Optional artifacts:
- (none)

Missing context behavior: Create or update the missing Context Hub artifact and leave unknown customer facts as TBD.

Source policy:
- Customer-specific facts missing from the Context Hub stay TBD.
- Risky trust, pricing, compliance, retention, or guarantee claims require approved evidence.
- Fixture-backed packets must not claim live execution.

## Inputs Captured Or Assumed
- Request: Run the Foundation Setup Agent for a cloud native project that needs clearer messaging, a refreshed project site, and a first dashboard for project leaders.
- Project leader question: What is the project mission in one sentence?
- Project leader question: Which audiences matter most this quarter?
- Project leader question: What brand, legal, or trademark constraints must be preserved?
- Project leader question: Which web and social channels should be active at launch?
- Project leader question: Which three OKRs should appear on the first dashboard?
- Fixture assumption: Project has an active community but inconsistent public messaging.
- Fixture assumption: The first dashboard should emphasize readiness, blockers, and weekly marketing momentum.

## Generated Assets
### Messaging Source
25-word overview: Build and operate cloud native systems with an open source project that helps teams ship reliable infrastructure without locking themselves into one vendor.

50-word overview: This project gives platform and infrastructure teams a community-led foundation for building reliable cloud native systems. It combines open governance, practical implementation patterns, and a contributor ecosystem so adopters can move faster while preserving choice, transparency, and long-term operational control.

Boilerplate: The project is an open source cloud native initiative for teams that need reliable infrastructure patterns, transparent governance, and an active contributor community.

### Brand Kit Direction
- Visual posture: technical, dependable, community-led.
- Palette: deep green for reliability, signal blue for infrastructure, neutral gray for documentation.
- Typography: clear developer-documentation feel; avoid playful consumer styling.
- Banner guidance: show system diagrams, contributor activity, and deployment pathways rather than abstract gradients.

### Website Launch Outline
Homepage sections: mission, who it is for, why now, getting started, production examples, community calls, contributor path, sponsor/member CTA.
Primary CTA: Read the getting-started guide.
Secondary CTA: Join the community meeting.
Launch blockers: approved logo, final one-sentence mission, trademark review, maintainer quotes, analytics tags.

### Initial OKRs
1. Increase qualified project awareness among technical evaluators.
2. Convert community interest into recurring participation.
3. Give project leadership a weekly signal view across content, events, social, and campaigns.

## Approval Checklist
- Project leader approves mission, audiences, and OKRs.
- Marketing advisor approves messaging source and channel plan.
- Design stakeholder approves brand direction before reuse.
- Legal or trademark owner confirms naming and logo constraints.
- Dashboard owner confirms first status signals.

## Dashboard Update Payload
```json
{
  "agentId": "foundation-setup",
  "agentHubName": "marketing-os-foundation-setup",
  "agentDisplayName": "Foundation Setup Agent",
  "category": "gtm-marketing-os",
  "tags": [
    "foundation",
    "messaging",
    "website",
    "dashboard"
  ],
  "mode": "fixture-backed-local-v1",
  "liveExecution": false,
  "project": "Open Source Cloud Native Project",
  "status": "ready_for_project_leader_review",
  "sourceRequest": "Run the Foundation Setup Agent for a cloud native project that needs clearer messaging, a refreshed project site, and a first dashboard for project leaders.",
  "workstream": "foundation",
  "ownerRole": "Project Leader",
  "approvalStatus": "needs_project_leader_review",
  "decisionRequired": "Approve the messaging source, audiences, and first dashboard signals.",
  "blockers": [
    "Brand assets approval",
    "Trademark review",
    "Channel registry confirmation"
  ],
  "nextAction": "Project leader should approve or edit the messaging source before design, web, or channel setup work begins.",
  "metrics": [
    {
      "key": "okr_count",
      "label": "Initial OKRs",
      "value": 3,
      "unit": "count"
    },
    {
      "key": "brand_assets_approved",
      "label": "Brand assets approved",
      "value": false
    },
    {
      "key": "channel_registry_complete",
      "label": "Channel registry complete",
      "value": false
    }
  ],
  "sourceConfidence": "fixture_assumption",
  "downstreamAgents": [
    "audience-segmentation",
    "newsletter-composition",
    "social-content",
    "event-creation"
  ],
  "contextHub": {
    "requiredArtifacts": [
      "project-context",
      "messaging-source",
      "brand-kit",
      "audience-segments",
      "channel-registry",
      "proof-and-constraints",
      "dashboard-signals"
    ],
    "optionalArtifacts": [],
    "missingContextBehavior": "Create or update the missing Context Hub artifact and leave unknown customer facts as TBD.",
    "sourcePolicy": [
      "Customer-specific facts missing from the Context Hub stay TBD.",
      "Risky trust, pricing, compliance, retention, or guarantee claims require approved evidence.",
      "Fixture-backed packets must not claim live execution."
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
    "foundation_status": "needs_project_leader_review",
    "brand_assets_approved": false,
    "website_launch_readiness": "blocked_on_brand_and_trademark",
    "channel_registry_complete": false,
    "okr_count": 3
  }
}
```

## Future Integration Adapter Notes
- Content Hub: V1 documents the handoff. Future live action: Write approved messaging and brand artifacts to canonical project records.
- CMS: V1 documents the handoff. Future live action: Create draft homepage and getting-started pages after approval.
- Jira: V1 documents the handoff. Future live action: Open design, legal, and web launch tasks for the responsible owners.

## Next Recommended Action
Project leader should approve or edit the messaging source before design, web, or channel setup work begins.
