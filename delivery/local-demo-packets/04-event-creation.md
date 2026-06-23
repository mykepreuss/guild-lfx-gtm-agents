<!-- Generated fixture demo packet. No live platform changes are performed. -->

# Event Creation Agent Local V1 Packet

Future Agent Hub name: `marketing-os-event-creation`

Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.

## Workflow Summary
Builds the event creation packet: event record, registration page copy, capacity, sponsor tiers, confirmation email, and launch velocity signals.

Trigger: Project leader starts a create-new-event mission.

## Inputs Captured Or Assumed
- Request: Create a new regional meetup event with 150-person capacity, sponsor options, and a registration page.
- Project leader question: What is the event name, date, location, and format?
- Project leader question: What attendance goal and capacity should registration use?
- Project leader question: Are sponsor tiers required?
- Project leader question: What call to action should the page emphasize?
- Project leader question: Who approves the event page before launch?
- Fixture assumption: The event is a regional meetup with 150-person capacity.
- Fixture assumption: Registration and sponsor review must happen before promotion starts.

## Generated Assets
### Event Record Draft
Event name: Cloud Native Operators Meetup
Format: regional in-person meetup with livestream fallback.
Capacity: 150 registrants, waitlist enabled at 140 confirmed.
Goal: 110 attended, 35 new qualified project contacts, 10 contributor follow-ups.
Owner: project leader approves content; events owner approves logistics.

### Registration Page Copy
Headline: Practical cloud native operations, led by the community.
Subhead: Join project maintainers and local operators for a hands-on meetup covering roadmap priorities, deployment lessons, and ways to contribute.
Primary CTA: Register for the meetup.
Form fields: name, email, organization, role, project interest, dietary/accessibility needs, consent checkbox.

### Confirmation Email
Subject: You are registered for Cloud Native Operators Meetup
Body: Thanks for registering. We will send venue details, agenda updates, and prep material before the event. Bring one operational challenge you want to discuss with maintainers and peers.

### Sponsor Tier Draft
Community supporter: logo on page and thank-you slide.
Venue supporter: logo, welcome mention, and table space.
Learning supporter: logo, table space, and post-event resource inclusion.

## Approval Checklist
- Project leader confirms event details and capacity.
- Events owner approves registration form and confirmation email.
- Sponsor owner approves tier language if sponsors are included.
- Marketing owner approves launch copy and CTA.

## Dashboard Update Payload
```json
{
  "agentId": "event-creation",
  "agentHubName": "marketing-os-event-creation",
  "agentDisplayName": "Event Creation Agent",
  "category": "gtm-marketing-os",
  "tags": [
    "event",
    "registration",
    "sponsor",
    "launch"
  ],
  "mode": "fixture-backed-local-v1",
  "liveExecution": false,
  "project": "Open Source Cloud Native Project",
  "status": "ready_for_project_leader_review",
  "sourceRequest": "Create a new regional meetup event with 150-person capacity, sponsor options, and a registration page.",
  "workstream": "events",
  "ownerRole": "Events Owner",
  "approvalStatus": "draft_ready",
  "decisionRequired": "Confirm event details, registration form, sponsor language, and approval owner.",
  "blockers": [
    "Event detail confirmation",
    "Sponsor tier review",
    "Registration form approval"
  ],
  "nextAction": "Confirm event details and approval owner, then prepare the event platform draft.",
  "metrics": [
    {
      "key": "capacity_target",
      "label": "Capacity target",
      "value": 150,
      "unit": "registrants"
    },
    {
      "key": "sponsor_tiers_defined",
      "label": "Sponsor tiers defined",
      "value": true
    },
    {
      "key": "velocity_monitor_enabled",
      "label": "Velocity monitor enabled",
      "value": true
    }
  ],
  "sourceConfidence": "fixture_assumption",
  "downstreamAgents": [
    "event-promotion",
    "audience-segmentation",
    "campaigns-paid-media"
  ],
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
    "event_record_ready": true,
    "registration_page_status": "draft_ready",
    "capacity_target": 150,
    "sponsor_tiers_defined": true,
    "velocity_monitor_enabled": true
  }
}
```

## Future Integration Adapter Notes
- Cvent: V1 documents the handoff. Future live action: Create event, landing page, registration form, and confirmation email.
- HubSpot Forms: V1 documents the handoff. Future live action: Create or sync approved registration fields.
- Brand Vault: V1 documents the handoff. Future live action: Apply approved brand assets to event page.

## Next Recommended Action
Confirm event details and approval owner, then prepare the event platform draft.
