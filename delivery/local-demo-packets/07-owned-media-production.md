<!-- Generated fixture demo packet. No live platform changes are performed. -->

# Owned Media Production Agent Local V1 Packet

Future Agent Hub name: `marketing-os-owned-media-production`

Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.

## Workflow Summary
Transforms an approved topic or recording into show notes, episode descriptions, social clips, distribution schedule, and newsletter teaser.

Trigger: New recording upload or content plan update.

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

Missing context behavior: Ask for transcript, topic, quote, or distribution channel details before finalizing.

Source policy:
- Technical claims should cite approved context or user-provided source material.
- Do not claim pages were published or updated in live systems.
- Missing proof should stay TBD.

## Inputs Captured Or Assumed
- Request: Turn a maintainer interview recording into show notes, episode descriptions, social clips, and a newsletter teaser.
- Project leader question: What recording, transcript, or topic should be processed?
- Project leader question: Who is the intended audience?
- Project leader question: Which quote or theme must be preserved?
- Project leader question: Which owned channels should receive distribution assets?
- Fixture assumption: A 30-minute maintainer interview has been uploaded.
- Fixture assumption: Distribution should reinforce an upcoming release and event.

## Generated Assets
### Show Notes
Episode theme: what platform teams should know before adopting the project.
Key sections: release context, adoption pattern, common migration concern, contributor path, webinar CTA.
Pull quote candidate: The best adoption stories start small, prove operational fit, and then bring the community into the roadmap conversation.

### Episode Descriptions
Podcast: A maintainer-led conversation about practical adoption patterns, current roadmap priorities, and how contributors can get involved without waiting for perfect context.
YouTube: Watch a project maintainer explain what changed in the latest release, where platform teams should start, and which community channels are best for deeper technical questions.

### Distribution Schedule
Day 0: publish podcast and YouTube metadata.
Day 1: LinkedIn post with maintainer quote.
Day 2: newsletter teaser linking to episode and webinar.
Day 4: short social clip focused on adoption path.
Day 7: recap post with community question prompt.

### Newsletter Teaser
New maintainer interview: how teams are evaluating the project, what changed in the latest release, and the contributor path worth knowing before the October webinar.

## Approval Checklist
- Project leader approves technical accuracy and sensitive quotes.
- Content owner approves episode title and description.
- Social owner approves clip and post variants.
- Distribution owner confirms schedule.

## Dashboard Update Payload
```json
{
  "agentId": "owned-media-production",
  "agentHubName": "marketing-os-owned-media-production",
  "agentDisplayName": "Owned Media Production Agent",
  "category": "gtm-marketing-os",
  "tags": [
    "owned-media",
    "podcast",
    "youtube",
    "distribution"
  ],
  "mode": "fixture-backed-local-v1",
  "liveExecution": false,
  "project": "Open Source Cloud Native Project",
  "status": "ready_for_project_leader_review",
  "sourceRequest": "Turn a maintainer interview recording into show notes, episode descriptions, social clips, and a newsletter teaser.",
  "workstream": "owned_media",
  "ownerRole": "Content Owner",
  "approvalStatus": "ready_for_review",
  "decisionRequired": "Approve show notes, quote selection, episode metadata, and distribution schedule.",
  "blockers": [
    "Sensitive quote approval",
    "Episode title approval",
    "Clip timing confirmation"
  ],
  "nextAction": "Review show notes and selected quote first; those decisions drive episode and distribution assets.",
  "metrics": [
    {
      "key": "clip_count",
      "label": "Clip count",
      "value": 2,
      "unit": "clips"
    },
    {
      "key": "distribution_channels",
      "label": "Distribution channels",
      "value": 4,
      "unit": "channels"
    },
    {
      "key": "newsletter_teaser_ready",
      "label": "Newsletter teaser ready",
      "value": true
    }
  ],
  "sourceConfidence": "fixture_assumption",
  "downstreamAgents": [
    "newsletter-composition",
    "social-content",
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
    "missingContextBehavior": "Ask for transcript, topic, quote, or distribution channel details before finalizing.",
    "sourcePolicy": [
      "Technical claims should cite approved context or user-provided source material.",
      "Do not claim pages were published or updated in live systems.",
      "Missing proof should stay TBD."
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
    "owned_media_asset_status": "ready_for_review",
    "episode_ready_for_review": true,
    "clip_count": 2,
    "distribution_channels": 4,
    "newsletter_teaser_ready": true
  }
}
```

## Future Integration Adapter Notes
- Riverside or AssemblyAI: V1 documents the handoff. Future live action: Transcribe uploaded recordings.
- Transistor and YouTube: V1 documents the handoff. Future live action: Create draft episode metadata.
- Sprout Social and Beehiiv: V1 documents the handoff. Future live action: Queue approved distribution assets.

## Next Recommended Action
Review show notes and selected quote first; those decisions drive episode and distribution assets.
