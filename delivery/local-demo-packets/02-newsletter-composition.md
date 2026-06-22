<!-- Generated fixture demo packet. No live platform changes are performed. -->

# Newsletter Composition Agent Local V1 Packet

Future Agent Hub name: `marketing-os-newsletter-composition`

Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.

## Workflow Summary
Aggregates activity and drafts a ready-to-review newsletter with subject lines, sections, send list, and scheduling recommendation.

Trigger: Weekly or on demand when the project leader asks for this week's newsletter.

## Inputs Captured Or Assumed
- Request: Draft this week's newsletter for contributors and technical evaluators with a release update, event CTA, and community highlight.
- Project leader question: What is the primary story this week?
- Project leader question: Which GitHub, blog, social, or event sources should be included?
- Project leader question: Which audience segment should receive the send?
- Project leader question: Should the tone be technical, executive, community, or sponsor-oriented?
- Fixture assumption: The release update is the lead story.
- Fixture assumption: The send should go to contributors and technical evaluators, excluding recent event-only registrants.

## Generated Assets
### Subject Line Options
A. New release patterns for reliable cloud native operations
B. This week: release notes, maintainer call, and October webinar
C. What changed this week in the project

### Newsletter Draft
Lede: This week the project shipped a release focused on operational clarity, better deployment examples, and a cleaner path for first-time contributors.

Section 1 - Release update: The latest release improves setup guidance, expands deployment examples, and closes several documentation gaps raised by the community.

Section 2 - Community highlight: Maintainers reviewed three first-time contributor PRs this week. The strongest signal is that onboarding friction is now visible enough to improve.

Section 3 - Event CTA: Join the October webinar for a practical walkthrough of the project roadmap and adoption patterns.

CTA: Register for the webinar and bring one question about your current platform workflow.

### Send Plan
Segment: active contributors, documentation subscribers, and technical evaluators who engaged in the last 120 days.
Suppressions: unsubscribed contacts, sponsor-only contacts, and people who received two event emails in the last seven days.
Recommended send: Tuesday 09:30 recipient-local time.

## Approval Checklist
- Project leader approves subject line and lead story.
- Marketing owner confirms segment and suppressions.
- Community owner confirms project activity is accurate.
- Final reviewer confirms links, dates, and calls to action.

## Dashboard Update Payload
```json
{
  "agentId": "newsletter-composition",
  "agentHubName": "marketing-os-newsletter-composition",
  "agentDisplayName": "Newsletter Composition Agent",
  "mode": "fixture-backed-local-v1",
  "liveExecution": false,
  "project": "Open Source Cloud Native Project",
  "status": "ready_for_project_leader_review",
  "sourceRequest": "Draft this week's newsletter for contributors and technical evaluators with a release update, event CTA, and community highlight.",
  "signals": {
    "newsletter_draft_ready": true,
    "subscriber_segment_size": 4200,
    "scheduled_send_time": "Tuesday 09:30 recipient-local",
    "open_rate_target": "34%",
    "click_rate_target": "5.5%"
  }
}
```

## Future Integration Adapter Notes
- GitHub: V1 documents the handoff. Future live action: Pull merged PRs, releases, issues, and contributor highlights.
- Beehiiv or HubSpot: V1 documents the handoff. Future live action: Create draft email and queue approved sends.
- Member Data Platform: V1 documents the handoff. Future live action: Resolve active member and contributor segments.

## Next Recommended Action
Approve one subject line and mark any sections that should be shortened before scheduling.
