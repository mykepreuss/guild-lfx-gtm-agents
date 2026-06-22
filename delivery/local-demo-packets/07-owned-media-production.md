<!-- Generated fixture demo packet. No live platform changes are performed. -->

# Owned Media Production Agent Local V1 Packet

Future Agent Hub name: `marketing-os-owned-media-production`

Local-only boundary: this packet uses fixture data and does not publish, spend, sync, schedule, or modify records in live marketing platforms.

## Workflow Summary
Transforms an approved topic or recording into show notes, episode descriptions, social clips, distribution schedule, and newsletter teaser.

Trigger: New recording upload or content plan update.

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
  "mode": "fixture-backed-local-v1",
  "liveExecution": false,
  "project": "Open Source Cloud Native Project",
  "status": "ready_for_project_leader_review",
  "sourceRequest": "Turn a maintainer interview recording into show notes, episode descriptions, social clips, and a newsletter teaser.",
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
