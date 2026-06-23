# Audience Segments

Status: starter fixture
Owner: Project Leader
Last reviewed: 2026-06-23

## Personas

### Active Maintainer

Already contributes, values roadmap clarity, and needs fewer generic marketing touches with more decision context.

### Technical Evaluator

Engaged with docs or events, comparing project fit, and needs proof, reference architectures, and getting-started paths.

### Dormant Contributor

Contributed or attended before, has not engaged recently, and responds best to specific ways back into the project.

## Starter Segment Rules

- Webinar target: technical evaluators with docs visits, event attendance, or newsletter clicks in the last 120 days, excluding active maintainers.
- Contributor re-engagement: contributors with no merged PR, issue comment, event attendance, or newsletter click in 180 days.
- Sponsor-safe audience: member contacts with explicit marketing consent and no community-only suppression flag.

## Suppression Rules

- Suppress anyone who received two event promotions in the last seven days.
- Suppress unsubscribed, legal hold, community-only, and sponsor-contract-only contacts.
- Route ambiguous consent records to data owner review before use.

## Missing Context

- Real audience source data: TBD.
- Approved segment definitions: TBD.
- Contact-frequency guardrails: TBD.
