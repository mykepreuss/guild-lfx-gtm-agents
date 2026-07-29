# Guild Marketing OS — Contractor Handoff

## Delivered

Guild Marketing OS is a Guild-native, draft-only marketing workspace for
nontechnical marketing teams. A marketer enters through **Marketing OS
Launcher**, describes the outcome they need in ordinary language, and receives
the complete result from the appropriate specialist in the same Guild Chat.

The private suite contains:

1. Marketing OS Launcher
2. Company Context Builder
3. Market Signal
4. ICP
5. Audience Segmentation
6. Messaging
7. Branding And Pitch Deck
8. Social Monitoring And Content
9. Campaigns And Paid Media

The implementation retains the production-minded Launcher, allowlisted
delegation, structured artifacts, approvals, workstream state, handoffs,
provenance, evidence labels, and draft-only safety contracts. Public runtime
does not depend on a private Guild Skill or an external persistence service.

## Marketer Experience

Start with [Start Here](start-here.md). The intended customer journey is:

1. Create or select a dedicated Marketing OS workspace.
2. Install Marketing OS Launcher from Agent Hub.
3. Send `Continue Marketing OS onboarding`.
4. Approve the eight one-at-a-time package installation requests.
5. Make Launcher the default workspace agent in Guild settings.
6. Describe the company, audiences, marketing goal, reusable claims, channels,
   and constraints in plain language.
7. Review and approve the Company Context artifact.
8. Publish its compact brief to Guild Workspace Context using the separate
   exact confirmation shown in Chat.
9. Ask for market analysis, an ICP, audience segments, messaging, a
   presentation, a content plan, or an integrated campaign without naming an
   agent or repasting company context.

No CLI, maintainer intervention, infrastructure credential, database, CRM,
publishing account, or advertising credential is part of the marketer journey.

## Current Private Versions

| Package | Version |
| --- | --- |
| Marketing OS Launcher | `0.3.27` |
| Company Context Builder | `1.2.15` |
| Market Signal | `1.2.6` |
| ICP | `1.2.6` |
| Audience Segmentation | `1.2.6` |
| Messaging | `1.2.6` |
| Branding And Pitch Deck | `1.2.6` |
| Social Monitoring And Content | `1.2.6` |
| Campaigns And Paid Media | `1.2.6` |

The clean rehearsal workspace is
`developers-at-guild/marketing-os-clean-rehearsal-20260728`. Launcher is its
default agent and automatic updates are enabled for all nine packages.

## Acceptance Status

Browser acceptance is still in progress. The clean-organization installation,
default-agent setup, first-time orientation, plain-language company-context
intake, progressive review, and prominent approval call to action have passed.
The current authoritative evidence and every retained failure are summarized
in [Marketer Acceptance — 2026-07-29](validation/2026-07-29-marketer-acceptance.md).

The remaining acceptance gates are:

- approve and publish the corrected compact company brief in the fresh
  Launcher `0.3.27` Chat;
- prove that a new specialist Chat reuses that context without a repaste;
- run one representative ordinary-language request through each of the seven
  specialists;
- explicitly pass the presentation and integrated-campaign journeys;
- run final repository verification and merge the existing pull request.

This document must not be treated as final acceptance until those gates and the
acceptance record are complete.

## Safety Boundary

V1 creates drafts for human review. It does not publish or schedule content,
spend budget, start or change campaigns, mutate CRM or external data, configure
credentials, claim legal approval, or perform other external execution.

The only allowed Guild product mutation during this acceptance run is
publishing the explicitly approved compact company brief to Workspace Context
through the separate exact confirmation. Market and social results must state
whether their evidence is user supplied, read-only connected evidence, or live
monitoring; the current V1 must not imply live observation when none occurred.

## Known Non-Blocking Limitations

- One continuing Launcher Chat is the durable cockpit. A new Chat receives
  published Workspace Context but starts a new cockpit.
- Direct specialist Chats remain available, but their artifacts are not part
  of the canonical cockpit unless imported through Launcher.
- Guild Workspace Context holds the compact approved brief, not raw sources or
  the complete artifact history.
- Exhaustive production certification for concurrency, retries, timeout,
  tenancy, export, and deletion is outside the marketer-UX acceptance goal.
- Read-only connectors, live monitoring, publishing, scheduling, campaign
  execution, spend, and CRM mutation are future capabilities, not V1 features.

## Recommended Future Hardening

After the marketer journey is accepted, Guild may separately certify
production-scale tenancy, revision conflicts, retries, timeout recovery,
exports, confirmed deletion, and observability. Any future execution capability
should remain a separate package with explicit permissions, per-action
approval, idempotency, audit, budgets, and rollback.
