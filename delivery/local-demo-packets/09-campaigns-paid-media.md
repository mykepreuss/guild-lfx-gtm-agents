<!-- Generated fixture demo packet. No live platform changes are performed. -->

# Campaigns and Paid Media Agent Local V1 Packet

Future Agent Hub name: `marketing-os-campaigns-paid-media`

Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.

## Workflow Summary
Defines paid and organic campaign hierarchy around market segment, ICP, message, goal, budget, creative variants, UTMs, and guardrails.

Trigger: Project leader sets budget and goal, then reviews the proposed campaign structure.

## Context Hub
Required artifacts:
- `project-context`
- `messaging-source`
- `audience-segments`
- `channel-registry`
- `proof-and-constraints`

Optional artifacts:
- `dashboard-signals`

Missing context behavior: Ask for budget, goal, approval threshold, and platform scope before execution language is used.

Source policy:
- Do not claim spend, budget shifts, paused campaigns, conversions, or live platform changes without approved context.
- Paid media plans require budget review before execution.
- Missing performance data stays TBD.

## Inputs Captured Or Assumed
- Request: Create a paid media campaign structure for an October webinar with LinkedIn, Google Search, Reddit, UTMs, and pause-scale guardrails.
- Project leader question: What goal and budget should the campaign use?
- Project leader question: Which persona or segment should be targeted?
- Project leader question: Which message and offer should anchor the campaign?
- Project leader question: What spend threshold requires approval?
- Project leader question: Which platforms are in scope?
- Fixture assumption: Budget is small enough that approval thresholds matter.
- Fixture assumption: Campaign should include both organic and paid tactics.

## Generated Assets
### Campaign Hierarchy
Objective: drive qualified webinar registrations from technical evaluators.
Primary segment: technical evaluators with cloud native operations interest.
Offer: maintainer-led roadmap and adoption walkthrough.
Budget fixture: $5,000 total, with any single-platform increase over 20% requiring approval.

### Creative Variants
LinkedIn A: Join maintainers for a practical walkthrough of the project roadmap and adoption patterns.
LinkedIn B: Evaluating open source infrastructure options? Bring your questions to the October webinar.
Search ad: Cloud native operations webinar - maintainer-led roadmap and adoption session.
Reddit post: We are hosting a practical project walkthrough for operators evaluating open source infrastructure patterns.

### Budget And Guardrails
LinkedIn: $2,600 for evaluator targeting and retargeting.
Google Search: $1,500 for high-intent roadmap and webinar queries.
Reddit: $600 for community testing.
Reserve: $300 for winning-channel scale after week one.
Pause rule: pause ad set after 500 clicks with conversion rate below 2%.
Scale rule: move reserve budget to any channel with cost per qualified registration 25% below target.

### UTM Plan
utm_source={platform}&utm_medium=paid&utm_campaign=oct_webinar&utm_content={persona}_{creative_variant}

## Approval Checklist
- Project leader approves goal, budget, and spend threshold.
- Marketing owner approves message and creative variants.
- Audience owner approves targeting logic.
- Paid media owner approves platform setup before launch.

## Dashboard Update Payload
```json
{
  "agentId": "campaigns-paid-media",
  "agentHubName": "marketing-os-campaigns-paid-media",
  "agentDisplayName": "Campaigns and Paid Media Agent",
  "category": "gtm-marketing-os",
  "tags": [
    "paid-media",
    "campaigns",
    "budget",
    "guardrails"
  ],
  "mode": "fixture-backed-local-v1",
  "liveExecution": false,
  "project": "Open Source Cloud Native Project",
  "status": "ready_for_project_leader_review",
  "sourceRequest": "Create a paid media campaign structure for an October webinar with LinkedIn, Google Search, Reddit, UTMs, and pause-scale guardrails.",
  "workstream": "paid_media",
  "ownerRole": "Paid Media Owner",
  "approvalStatus": "ready_for_budget_review",
  "decisionRequired": "Approve budget, audience, message, platform scope, and pause-scale guardrails.",
  "blockers": [
    "Budget approval",
    "Targeting logic approval",
    "Platform setup review"
  ],
  "nextAction": "Approve budget, message, and guardrails before any paid-media adapter creates or modifies campaigns.",
  "metrics": [
    {
      "key": "creative_variant_count",
      "label": "Creative variants",
      "value": 4,
      "unit": "variants"
    },
    {
      "key": "utm_plan_ready",
      "label": "UTM plan ready",
      "value": true
    },
    {
      "key": "pause_scale_guardrails_set",
      "label": "Pause-scale guardrails set",
      "value": true
    }
  ],
  "sourceConfidence": "fixture_assumption",
  "downstreamAgents": [
    "campaign-performance",
    "audience-segmentation",
    "event-promotion"
  ],
  "contextHub": {
    "requiredArtifacts": [
      "project-context",
      "messaging-source",
      "audience-segments",
      "channel-registry",
      "proof-and-constraints"
    ],
    "optionalArtifacts": [
      "dashboard-signals"
    ],
    "missingContextBehavior": "Ask for budget, goal, approval threshold, and platform scope before execution language is used.",
    "sourcePolicy": [
      "Do not claim spend, budget shifts, paused campaigns, conversions, or live platform changes without approved context.",
      "Paid media plans require budget review before execution.",
      "Missing performance data stays TBD."
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
    "campaign_structure_status": "ready_for_budget_review",
    "budget_pending_approval": true,
    "creative_variant_count": 4,
    "utm_plan_ready": true,
    "pause_scale_guardrails_set": true
  }
}
```

## Future Integration Adapter Notes
- Google Ads, LinkedIn Ads, Reddit Ads: V1 documents the handoff. Future live action: Create draft campaigns and pause or scale within approved guardrails.
- HubSpot: V1 documents the handoff. Future live action: Sync campaign membership and conversion status.
- Segment: V1 documents the handoff. Future live action: Track ROAS and campaign performance by audience.

## Next Recommended Action
Approve budget, message, and guardrails before any paid-media adapter creates or modifies campaigns.
