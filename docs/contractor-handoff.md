# Guild Marketing OS — Contractor Handoff

## Delivered

Guild Marketing OS is a Guild-native, draft-only marketing workspace for
nontechnical marketing teams. A marketer enters through **Marketing OS
Launcher**, describes the outcome they need in ordinary language, and receives
the complete result from the appropriate specialist in the same Guild Chat.

The public, draft-only suite contains:

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

## Current Public Versions

| Package | Version |
| --- | --- |
| Marketing OS Launcher | `0.3.30` |
| Company Context Builder | `1.2.16` |
| Market Signal | `1.2.8` |
| ICP | `1.2.8` |
| Audience Segmentation | `1.2.8` |
| Messaging | `1.2.8` |
| Branding And Pitch Deck | `1.2.9` |
| Social Monitoring And Content | `1.2.10` |
| Campaigns And Paid Media | `1.2.12` |

The clean rehearsal workspace is
`developers-at-guild/marketing-os-clean-rehearsal-20260728`. Launcher is its
default agent and automatic updates are enabled for all nine packages.

## Acceptance Status

Browser acceptance is complete. The authoritative result and every retained
failure are summarized in
[Marketer Acceptance — 2026-07-29](validation/2026-07-29-marketer-acceptance.md).

The accepted Guild state is:

- Launcher `0.3.29` is the clean rehearsal workspace default.
- All nine public packages are installed with automatic updates enabled.
- Company Context artifact
  `6309ea75-1fea-4618-8e61-6daa44a127c7` revision 1 is approved.
- Native Workspace Context v2
  `019faf95-9f10-9b1f-0000-a07a9fa6f690` is published; the original unmanaged
  version remains preserved.
- A new ordinary Chat reused context fingerprint `2b09fd7fe30cd304`
  without a repaste.
- All seven specialist routes returned reviewable outputs.
- Natural-language presentation and integrated-campaign requests passed.
- No external marketing execution occurred.

Guild SDK `0.4.2` did not provide delegated API identity for agent-written
Workspace Context in the clean organization. The accepted Guild-native
experience therefore uses the separate, explicit Context-screen publication
step shown by Launcher. It requires no external service, shared maintainer
token, CLI, or infrastructure credential from the marketer.

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
- Publishing the approved compact brief requires the native Guild Context
  screen because agent-side delegated Context mutation is not available in the
  tested SDK/runtime.
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
