<!-- Generated fixture demo packet. No live platform changes are performed. -->

# Social Content Agent Local V1 Packet

Future Agent Hub name: `marketing-os-social-content`

Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.

## Workflow Summary
Turns current project activity into platform-specific social drafts, mentions, hashtags, and a reviewable posting queue.

Trigger: Weekly, with a Monday queue of five to ten post drafts.

## Context Hub
Required artifacts:
- `project-context`
- `messaging-source`
- `brand-kit`
- `channel-registry`
- `proof-and-constraints`

Optional artifacts:
- `audience-segments`
- `dashboard-signals`

Missing context behavior: Ask for missing channel, mention, or approval details before scheduling language is used.

Source policy:
- Use channel constraints from the Context Hub.
- Do not claim posts were published, scheduled, or boosted without approved context.
- Technical claims need approved source support.

## Inputs Captured Or Assumed
- Request: Create this week's social queue for a release update, maintainer quote, and October webinar CTA.
- Project leader question: Which announcement or community milestone matters most this week?
- Project leader question: Which platforms should be included?
- Project leader question: Are there accounts, maintainers, sponsors, or partner projects to mention?
- Project leader question: Should posts optimize for contributors, users, sponsors, or event attendance?
- Fixture assumption: LinkedIn and X are priority channels.
- Fixture assumption: One maintainer quote is approved for use in public copy.

## Generated Assets
### Social Queue
| Channel | Draft | CTA | Review Note |
| --- | --- | --- | --- |
| LinkedIn | The latest project release makes the adoption path clearer for platform teams evaluating cloud native operations. The update adds deployment examples, contributor guidance, and cleaner docs for production review. | Read the release notes | Confirm maintainer quote before posting |
| X | New release: clearer deployment examples, better contributor guidance, and docs built for teams evaluating production use. | Read more | Add release URL |
| Mastodon | We shipped documentation and setup improvements shaped by community feedback. First-time contributors should now have a cleaner path into the project. | Join the contributor call | Confirm community meeting date |
| LinkedIn | Join the October webinar for a practical walkthrough of adoption patterns, roadmap priorities, and ways to contribute. | Register | Confirm webinar landing page |
| YouTube Community | New maintainer walkthrough coming this week: what changed in the release and how teams should evaluate the project. | Subscribe for the walkthrough | Confirm video publish timing |

### Tags And Mentions
Hashtags: #OpenSource, #CloudNative, #PlatformEngineering
Mention queue: project account, lead maintainer, event account, foundation account.
Risk note: sponsor mentions require explicit approval before scheduling.

## Approval Checklist
- Project leader approves technical accuracy and community tone.
- Marketing owner approves platform formatting.
- Sponsor or partner mentions are confirmed before publication.
- Sensitive release timing is cleared.

## Dashboard Update Payload
```json
{
  "agentId": "social-content",
  "agentHubName": "marketing-os-social-content",
  "agentDisplayName": "Social Content Agent",
  "category": "gtm-marketing-os",
  "tags": [
    "social",
    "content",
    "distribution",
    "community"
  ],
  "mode": "fixture-backed-local-v1",
  "liveExecution": false,
  "project": "Open Source Cloud Native Project",
  "status": "ready_for_project_leader_review",
  "sourceRequest": "Create this week's social queue for a release update, maintainer quote, and October webinar CTA.",
  "workstream": "content",
  "ownerRole": "Social Owner",
  "approvalStatus": "ready_for_review",
  "decisionRequired": "Approve, edit, or reject each platform post before future scheduling.",
  "blockers": [
    "Maintainer quote confirmation",
    "Release URL",
    "Community meeting date",
    "Sponsor mention approval"
  ],
  "nextAction": "Review technical accuracy first, then approve or reject each post before any scheduling adapter is connected.",
  "metrics": [
    {
      "key": "posts_waiting_for_review",
      "label": "Posts waiting for review",
      "value": 5,
      "unit": "posts"
    },
    {
      "key": "platform_count",
      "label": "Platforms",
      "value": 4,
      "unit": "channels"
    },
    {
      "key": "mentions_to_confirm",
      "label": "Mentions to confirm",
      "value": 2,
      "unit": "mentions"
    }
  ],
  "sourceConfidence": "fixture_assumption",
  "downstreamAgents": [
    "newsletter-composition",
    "event-promotion",
    "campaign-performance"
  ],
  "contextHub": {
    "requiredArtifacts": [
      "project-context",
      "messaging-source",
      "brand-kit",
      "channel-registry",
      "proof-and-constraints"
    ],
    "optionalArtifacts": [
      "audience-segments",
      "dashboard-signals"
    ],
    "missingContextBehavior": "Ask for missing channel, mention, or approval details before scheduling language is used.",
    "sourcePolicy": [
      "Use channel constraints from the Context Hub.",
      "Do not claim posts were published, scheduled, or boosted without approved context.",
      "Technical claims need approved source support."
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
    "social_queue_ready": true,
    "posts_waiting_for_review": 5,
    "platform_count": 4,
    "engagement_target": "3.5%",
    "mentions_to_confirm": 2
  }
}
```

## Future Integration Adapter Notes
- Sprout Social: V1 documents the handoff. Future live action: Create draft posts and schedule approved posts.
- LinkedIn, X, Mastodon, Bluesky, YouTube: V1 documents the handoff. Future live action: Publish or queue approved platform variants.

## Next Recommended Action
Review technical accuracy first, then approve or reject each post before any scheduling adapter is connected.
