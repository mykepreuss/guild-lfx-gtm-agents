<!-- Generated fixture demo packet. No live platform changes are performed. -->

# Campaign Performance Agent Local V1 Packet

Future Agent Hub name: `marketing-os-campaign-performance`

Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.

## Workflow Summary
Reads campaign fixtures and returns plain-English insights, anomaly flags, weekly narrative, A/B winner picks, and drill-down links.

Trigger: Daily data refresh, with project leader reading the dashboard.

## Context Hub
Required artifacts:
- `project-context`
- `proof-and-constraints`
- `dashboard-signals`

Optional artifacts:
- `audience-segments`
- `channel-registry`

Missing context behavior: If live metrics are unavailable, label the readout fixture-backed and ask for the data source.

Source policy:
- Fixture metrics are not live performance.
- Live numbers require approved context, dashboard data, or integrations.
- Recommendations that imply spend or platform action require approval.

## Inputs Captured Or Assumed
- Request: Run the Campaign Performance Agent for the Monday readout and call out anomalies, A/B winners, and recommended pause or scale actions.
- Project leader question: Which campaign or channel needs the readout?
- Project leader question: What metric movement counts as critical or urgent?
- Project leader question: Which decisions should the dashboard support this week?
- Project leader question: Should recommendations emphasize pause, scale, investigate, or learn?
- Fixture assumption: Paid search conversions are down while event registrations are ahead of pace.
- Fixture assumption: The project leader needs a concise Monday readout.

## Generated Assets
### Metric Snapshot
| Channel | Signal | Change | Recommendation |
| --- | --- | --- | --- |
| Event email | registrations | +18% vs pace | Scale reminder wave to evaluator segment |
| Paid search | qualified conversions | -24% week over week | Investigate landing page and query match |
| LinkedIn organic | engagement | +9% | Reuse maintainer quote format |
| YouTube | watch-through | flat | Keep as nurture, not conversion driver |

### Weekly Narrative
The event campaign is ahead of registration pace, driven by email and organic social. Paid search is underperforming and should not receive additional budget until query quality and landing-page conversion are reviewed. The best near-term move is to scale the email reminder wave while using LinkedIn organic to reinforce the maintainer-led message.

### Anomalies And A/B Readout
Critical anomaly: paid search conversion rate dropped below the 2.5% guardrail.
Opportunity anomaly: event email click-through is 1.4x the recent benchmark.
A/B winner: subject line B, 'What changed this week in the project', wins on click rate and reply quality.

## Approval Checklist
- Project leader confirms narrative matches operating reality.
- Marketing owner approves pause or scale recommendations.
- Analytics owner confirms thresholds and metric definitions.
- Campaign owner chooses next action.

## Dashboard Update Payload
```json
{
  "agentId": "campaign-performance",
  "agentHubName": "marketing-os-campaign-performance",
  "agentDisplayName": "Campaign Performance Agent",
  "category": "gtm-marketing-os",
  "tags": [
    "performance",
    "dashboard",
    "anomaly",
    "decisioning"
  ],
  "mode": "fixture-backed-local-v1",
  "liveExecution": false,
  "project": "Open Source Cloud Native Project",
  "status": "ready_for_project_leader_review",
  "sourceRequest": "Run the Campaign Performance Agent for the Monday readout and call out anomalies, A/B winners, and recommended pause or scale actions.",
  "workstream": "performance",
  "ownerRole": "Analytics Owner",
  "approvalStatus": "ready_for_review",
  "decisionRequired": "Choose whether to pause, scale, investigate, or keep learning for each flagged channel.",
  "blockers": [
    "Metric threshold confirmation",
    "Query quality review",
    "Landing-page conversion review"
  ],
  "nextAction": "Approve investigate, pause, or scale actions before connecting any live campaign-control adapter.",
  "metrics": [
    {
      "key": "critical_anomaly_count",
      "label": "Critical anomalies",
      "value": 1,
      "unit": "alerts"
    },
    {
      "key": "recommended_action_count",
      "label": "Recommended actions",
      "value": 3,
      "unit": "actions"
    },
    {
      "key": "ab_test_winner",
      "label": "A/B winner",
      "value": "subject_line_b"
    }
  ],
  "sourceConfidence": "fixture_metric",
  "downstreamAgents": [
    "event-promotion",
    "campaigns-paid-media",
    "audience-segmentation"
  ],
  "contextHub": {
    "requiredArtifacts": [
      "project-context",
      "proof-and-constraints",
      "dashboard-signals"
    ],
    "optionalArtifacts": [
      "audience-segments",
      "channel-registry"
    ],
    "missingContextBehavior": "If live metrics are unavailable, label the readout fixture-backed and ask for the data source.",
    "sourcePolicy": [
      "Fixture metrics are not live performance.",
      "Live numbers require approved context, dashboard data, or integrations.",
      "Recommendations that imply spend or platform action require approval."
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
    "performance_readout_status": "ready",
    "critical_anomaly_count": 1,
    "ab_test_winner": "subject_line_b",
    "recommended_action_count": 3,
    "weekly_narrative_ready": true
  }
}
```

## Future Integration Adapter Notes
- Segment: V1 documents the handoff. Future live action: Pull daily channel and audience events.
- HubSpot, Sprout Social, GA4, Cvent, YouTube Analytics: V1 documents the handoff. Future live action: Ingest live source metrics and generate dashboard insights.
- Marketing Dashboard: V1 documents the handoff. Future live action: Update live dashboard cards and drill-down links.

## Next Recommended Action
Approve investigate, pause, or scale actions before connecting any live campaign-control adapter.
