# Guild Marketing OS Social Monitoring And Content

Guild package: `guild-marketing-os-social-monitoring-content`
Package owner: `michaelpreuss`

## Purpose

Turns approved social and community signals into opportunity rankings, content plans, channel-specific drafts, proof checks, and approval-ready engagement recommendations.

## V1 Boundary

Review-only. This agent does not publish, schedule, reply, DM, comment, or scrape private communities.

## Test

From this package directory:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```
