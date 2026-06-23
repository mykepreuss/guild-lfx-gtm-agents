<!-- Generated fixture demo packet. No live platform changes are performed. -->

# Event Promotion Agent Local V1 Packet

Future Agent Hub name: `marketing-os-event-promotion`

Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.

## Workflow Summary
Creates a 12-week backwards promotion plan with email waves, social cadence, paid allocation, attendance forecast, and first-wave assets.

Trigger: Project leader provides event date, event URL, goals, and budget.

## Context Hub
Required artifacts:
- `project-context`
- `messaging-source`
- `audience-segments`
- `channel-registry`
- `proof-and-constraints`

Optional artifacts:
- `brand-kit`
- `dashboard-signals`

Missing context behavior: Ask for event URL, date, goals, budget, and audience priorities before finalizing.

Source policy:
- Promotion claims require event facts or stay TBD.
- Do not claim posts, emails, or partner distribution were scheduled without approved context.
- Use proof-backed reasons to attend.

## Inputs Captured Or Assumed
- Request: Run the Event Promotion Agent for an October webinar with 400 registrations as the goal and a small paid media budget.
- Project leader question: What is the event date and URL?
- Project leader question: What is the registration or attendance goal?
- Project leader question: What budget is available for paid support?
- Project leader question: Which audiences or personas should be prioritized?
- Project leader question: Which milestone needs earliest human review?
- Fixture assumption: The event is 12 weeks away with a 400-registration target.
- Fixture assumption: Paid support is limited and requires project leader approval.

## Generated Assets
### 12-Week Promotion Calendar
| Week | Milestone | Owner Review |
| --- | --- | --- |
| -12 | Confirm positioning, audience, landing page, UTM plan | Project leader |
| -10 | Send announcement email and publish first social wave | Marketing owner |
| -8 | Launch partner/sponsor amplification and retargeting test | Partner and paid owners |
| -6 | Publish speaker/topic content and second email wave | Project leader |
| -4 | Increase social cadence, compare registration pace to target | Events owner |
| -2 | Final conversion push, waitlist plan, reminder emails | Events owner |
| -1 | Speaker reminders, attendee prep email, social countdown | Project leader |

### Wave 1 Email Draft
Subject: Register for the October cloud native operations webinar
Preview: A practical roadmap session for teams evaluating open source infrastructure patterns.
Body: Join project maintainers for a live walkthrough of adoption patterns, roadmap priorities, and the questions teams should ask before standardizing cloud native operations. The session is built for technical evaluators, contributors, and operators who want a practical path into the project.
CTA: Register for the webinar.

### Paid Budget And Forecast
Budget recommendation: 60% LinkedIn retargeting, 25% search intent, 15% sponsor/community amplification.
Pace target: 80 registrations by week -8, 180 by week -5, 300 by week -2, 400 final.
Red flag: fewer than 120 registrations by week -5 or conversion rate below 9% from landing page visits.

## Approval Checklist
- Project leader approves registration goal and budget.
- Events owner approves milestone calendar.
- Marketing owner approves email and social cadence.
- Paid media owner approves spend threshold before launch.

## Dashboard Update Payload
```json
{
  "agentId": "event-promotion",
  "agentHubName": "marketing-os-event-promotion",
  "agentDisplayName": "Event Promotion Agent",
  "category": "gtm-marketing-os",
  "tags": [
    "event",
    "promotion",
    "forecast",
    "paid"
  ],
  "mode": "fixture-backed-local-v1",
  "liveExecution": false,
  "project": "Open Source Cloud Native Project",
  "status": "ready_for_project_leader_review",
  "sourceRequest": "Run the Event Promotion Agent for an October webinar with 400 registrations as the goal and a small paid media budget.",
  "workstream": "events",
  "ownerRole": "Events Owner",
  "approvalStatus": "plan_ready",
  "decisionRequired": "Approve milestone calendar, audience priority, registration goal, and paid threshold.",
  "blockers": [
    "Paid media threshold approval",
    "Landing page URL",
    "Audience prioritization"
  ],
  "nextAction": "Approve the milestone calendar and paid threshold before any email, social, or ad drafts are created in live systems.",
  "metrics": [
    {
      "key": "registration_goal",
      "label": "Registration goal",
      "value": 400,
      "unit": "registrants"
    },
    {
      "key": "forecasted_attendance",
      "label": "Forecasted attendance",
      "value": 260,
      "unit": "attendees"
    },
    {
      "key": "weeks_to_event",
      "label": "Weeks to event",
      "value": 12,
      "unit": "weeks"
    }
  ],
  "sourceConfidence": "fixture_assumption",
  "downstreamAgents": [
    "newsletter-composition",
    "social-content",
    "campaigns-paid-media",
    "campaign-performance"
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
      "brand-kit",
      "dashboard-signals"
    ],
    "missingContextBehavior": "Ask for event URL, date, goals, budget, and audience priorities before finalizing.",
    "sourcePolicy": [
      "Promotion claims require event facts or stay TBD.",
      "Do not claim posts, emails, or partner distribution were scheduled without approved context.",
      "Use proof-backed reasons to attend."
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
    "event_promotion_status": "plan_ready",
    "weeks_to_event": 12,
    "registration_goal": 400,
    "forecasted_attendance": 260,
    "red_flag_threshold": "120 registrations by week -5"
  }
}
```

## Future Integration Adapter Notes
- HubSpot: V1 documents the handoff. Future live action: Create campaign emails and schedule approved waves.
- Sprout Social: V1 documents the handoff. Future live action: Queue approved event-promotion posts.
- LinkedIn Ads: V1 documents the handoff. Future live action: Create draft paid campaign for approval.
- Cvent: V1 documents the handoff. Future live action: Pull live registration pace and update forecast.

## Next Recommended Action
Approve the milestone calendar and paid threshold before any email, social, or ad drafts are created in live systems.
