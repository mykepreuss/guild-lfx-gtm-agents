# Marketer Acceptance — 2026-07-29

## Purpose

This run answers one practical question: can a nontechnical marketer understand,
set up, and use Guild Marketing OS through ordinary Guild Chat?

The acceptance standard is usefulness and trust, not exhaustive platform
certification. Production-minded routing, artifacts, approvals, handoffs, and
safety controls remain in place, but internal metadata or rare infrastructure
edge cases do not block this user journey.

## Product decision: progressive company context

Company Context uses progressive disclosure:

- A clear company description, audiences, marketing goal, approved claims,
  channels, and constraints is enough to create a useful baseline.
- The baseline can be reviewed, approved, and published as compact Workspace
  Context.
- Missing case studies, metrics, proof points, brand guidance, or compliance
  detail are optional improvements. They do not prevent the marketer from
  starting.
- Marketing goals are treated as intentions, not factual performance claims.
- Only genuinely sensitive, contradictory, or unapproved reusable claims block
  approval.
- The user can improve the context later without restarting the specialist
  workstreams.

The marketer-facing approval step must say plainly that the baseline is ready,
show what will be reused, and provide the exact approval command.

## Environment

- Organization: `developers-at-guild`
- Workspace: `marketing-os-clean-rehearsal-20260728`
- Workspace type: dedicated Marketing OS workspace
- Interface: signed-in Guild browser, ordinary Chat
- External execution: none

Current private package versions:

| Package | Version |
| --- | --- |
| Marketing OS Launcher | `0.3.25` |
| Company Context Builder | `1.2.15` |
| Market Signal | `1.2.6` |
| ICP | `1.2.6` |
| Audience Segmentation | `1.2.6` |
| Messaging | `1.2.6` |
| Branding And Pitch Deck | `1.2.6` |
| Social Monitoring And Content | `1.2.6` |
| Campaigns And Paid Media | `1.2.6` |

Launcher is the workspace default. Automatic updates are enabled for all nine
packages.

## Acceptance rubric

Each representative workflow passes when:

1. A normal-language request routes to the correct specialist in one attempt.
2. The specialist uses the approved company context without requiring a
   repaste.
3. The result is company-specific, understandable, and complete enough for
   normal professional editing.
4. Facts, assumptions, evidence, unknowns, and limitations are honestly
   distinguished.
5. No live observation or external execution is falsely implied.
6. The user receives a clear next step.
7. No CLI, infrastructure credential, or maintainer intervention is required.

Small internal-formatting imperfections are deferred when they do not affect
the marketer journey.

## Results

### Setup and orientation

| Journey | Result | Notes |
| --- | --- | --- |
| Clean-organization installation | Pass | Prior clean rehearsal proved guided installation and approvals through Guild UI. |
| Launcher as workspace default | Pass | Verified in the clean rehearsal workspace. |
| First-time orientation | Pass | Session `019faf63-2c88-351a-0000-c3992a00fad8` explained outcomes, capabilities, draft-only boundaries, company-context setup, and natural-language campaign and presentation examples. |

### Company Context

| Attempt | Result | Decision |
| --- | --- | --- |
| Plain Webflow packet in orientation Chat | Fixed | Launcher `0.3.22` misclassified the packet as a cockpit request. Launcher `0.3.23` added deterministic fielded-packet routing. |
| Plain Webflow packet in fresh Chat | Fixed | Builder `1.2.14` saved a draft but treated optional detail and goal wording as blocking. Builder `1.2.15` and Launcher `0.3.24` introduced progressive disclosure, explicit reusable fields, and a clear approval call to action. |
| Progressive-disclosure rerun | Fixed; rerun required | Session `019faf77-6990-351a-0000-960d21298474` produced a review-ready Builder packet, but Launcher `0.3.24` treated the word “faster” inside four explicitly labeled marketing-goal fields as an unqualified performance claim. Launcher `0.3.25` keeps ordinary specialist safety strict while treating goal fields as intentions only during Company Context reconciliation. |
| Launcher `0.3.25` rerun | Pending | Repeat the same unchanged Webflow packet without weakening its goal or constraints. |
| Artifact approval | Pending | Run after the progressive-disclosure rerun passes. |
| Workspace Context publication | Pending | Publish only the approved compact brief with the existing exact phrase. |
| Specialist reuse without repaste | Pending | Prove in the seven representative specialist requests. |

### Specialist workflows

| Workflow | Natural-language proof | Result |
| --- | --- | --- |
| Market Signal | Assess market and competitor signals | Pending |
| ICP | Define the ideal enterprise customer and buying committee | Pending |
| Audience Segmentation | Create practical audience segments and channel recommendations | Pending |
| Messaging | Develop positioning, narrative, pillars, boilerplate, and objection handling | Pending |
| Branding And Pitch Deck | Create a ten-slide presentation with visual direction | Pending |
| Social Monitoring And Content | Create a four-week organic content plan and representative drafts | Pending |
| Campaigns And Paid Media | Create an integrated campaign with budget assumptions and KPIs | Pending |

## Retained evidence

The repository-private evidence collector preserves complete Guild task and
event records for every attempt, including failures:

- Orientation pass:
  `_private/evidence/2026-07-29T19-40-53-842Z-019faf63-2c88-351a-0000-c3992a00fad8.json`
- Initial context routing failure:
  `_private/evidence/2026-07-29T19-41-31-982Z-019faf63-2c88-351a-0000-c3992a00fad8.json`
- Overly strict Company Context result:
  `_private/evidence/2026-07-29T19-45-56-746Z-019faf68-9ad0-351a-0000-9297b6913a4e.json`
- Review-ready Builder packet rejected by Launcher goal validation:
  `_private/evidence/2026-07-29T20-01-57-160Z-019faf77-6990-351a-0000-960d21298474.json`

These evidence files are intentionally not committed because they contain
private workspace transcripts. This record keeps the session IDs and the
product decisions required to reproduce and review the acceptance.

## Pass, fix, defer policy

- **Pass:** useful and trustworthy for a real marketer.
- **Fix now:** installation, routing, context reuse, empty or confusing output,
  unsafe claims, false evidence or execution, or technical steps that block the
  target user.
- **Defer:** rare concurrency, retry, export, deletion, scale, tenancy,
  cosmetic, or internal-schema concerns that do not prevent the marketer
  journey.

## Release status

Marketer acceptance is in progress. The setup and orientation journey passes.
Three material Company Context usability problems have been found and fixed.
The newest Launcher fix is locally verified and awaits private publication and
a browser rerun. Browser proof of the progressive approval flow and all seven
specialist workflows remains required before this record can be marked
complete.
