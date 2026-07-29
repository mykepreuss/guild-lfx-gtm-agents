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
- Pre-publication Workspace Context:
  `019fabb4-22bf-ea2d-0000-e54c726628eb` (`PUBLISHED`,
  `system_generated`)
- External execution: none

Current private package versions:

| Package | Version |
| --- | --- |
| Marketing OS Launcher | `0.3.29` |
| Company Context Builder | `1.2.15` |
| Market Signal | `1.2.7` |
| ICP | `1.2.6` |
| Audience Segmentation | `1.2.6` |
| Messaging | `1.2.6` |
| Branding And Pitch Deck | `1.2.8` |
| Social Monitoring And Content | `1.2.9` |
| Campaigns And Paid Media | `1.2.11` |

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
| Launcher `0.3.25` rerun | Pass | Session `019faf7d-5e2f-351a-0000-9235c84b9d47` returned the unchanged Webflow packet as `Ready for review`, said the baseline is complete enough to power specialist drafts, preserved the goal and constraints, retained artifact `33bf29ac-41cf-4def-994b-36b600a8114f` revision 1, and presented the exact approval command prominently. |
| Artifact approval | Pass with receipt fix | The exact command approved artifact `33bf29ac-41cf-4def-994b-36b600a8114f` revision 1 in session `019faf7d-5e2f-351a-0000-9235c84b9d47`; the response explicitly authorized only the stored draft and confirmed Workspace Context was unchanged. Launcher `0.3.25` included Guild runtime metadata in the displayed/stored “Exact approval text.” Launcher `0.3.26` extracts only the user’s approval line, with a regression test using the live runtime envelope. The valid approval is retained; the marketer is not asked to redo it. |
| Workspace Context publication | Fixed; fresh-flow rerun required | Two exact-phrase attempts in session `019faf7d-5e2f-351a-0000-9235c84b9d47` were safely delegated to Builder instead of publishing because the session remained pinned to Launcher `0.3.25` and Guild’s runtime envelope prevented exact-command recognition. The published Workspace Context remained `019fabb4-22bf-ea2d-0000-e54c726628eb`. Launcher `0.3.27` strips the verified Guild runtime envelope before every exact-command, routing, approval, or delegation decision. A full publication regression test uses the live envelope shape and preserves the unmanaged context. Repeat the straightforward context flow once in a fresh Chat pinned to `0.3.27`. |
| Launcher `0.3.27` fresh baseline | Pass | Session `019faf87-4b80-351a-0000-486385b07227` returned the unchanged Webflow packet as `Ready for review` and retained artifact `6309ea75-1fea-4618-8e61-6daa44a127c7` revision 1. Evidence inspection found one runtime-start marker in Launcher and one in Builder, proving Launcher no longer duplicated its own injected runtime envelope into the specialist request. |
| Launcher `0.3.27` fresh approval | Pass | The marketer sent the displayed command in the same Chat. Launcher approved artifact `6309ea75-1fea-4618-8e61-6daa44a127c7` revision 1, retained workflow `e8b5f081-0fb4-4d78-8ea6-0897ab1083c1`, displayed only the exact user approval sentence, stated that approval covered only the stored draft, confirmed Workspace Context was unchanged, and presented the separate exact publication phrase. |
| Launcher `0.3.27` coded publication | Fixed; Context-screen rerun required | The exact phrase reached the correct publication branch, but Guild rejected the first `guild_get_session` call with `Unauthorized — Not authenticated`. No draft or published context version was created; the original version `019fabb4-22bf-ea2d-0000-e54c726628eb` remained the only context. This proves SDK `0.4.2` does not provide the clean organization Chat a delegated `/api/*` user identity. Launcher `0.3.28` removes the unsupported calls and returns one approved compact block with native Guild Context-screen steps. |
| Native Guild Context publication | Pass | Launcher `0.3.28` returned one approved compact context block and clear Guild Context-screen instructions. The marketer published Workspace Context v2, version `019faf95-9f10-9b1f-0000-a07a9fa6f690`, on 2026-07-29. The original unmanaged version `019fabb4-22bf-ea2d-0000-e54c726628eb` remains preserved. No external service or maintainer token was used. |
| Specialist reuse without repaste | Pass | A brand-new ordinary Launcher Chat, session `019faf98-3cdf-351a-0000-b4ba765c3b07`, consumed context fingerprint `2b09fd7fe30cd304` for all seven specialist routes without asking the marketer to repeat Webflow context. |

### Specialist workflows

| Workflow | Result | Browser evidence and product decision |
| --- | --- | --- |
| Market Signal | Pass after fix | Market Signal `1.2.7` returned artifact `d5db5d12-099a-4c4f-93e7-42714583214e`, workflow `1f9f7538-38a4-4da7-b667-090477ed14a2`, as `ready_for_review`. It states `source_supplied`, identifies the exact inspected coverage, and presents missing competitor, search, and community sources as optional evidence gaps rather than homework. |
| ICP | Pass | ICP `1.2.6` returned artifact `9e8dfe1d-1d31-4210-aefc-585223bc419b`, workflow `b490d636-da3e-458d-91dc-67606c03411a`, with the enterprise profile, buying committee, pains, motivations, objections, triggers, fit criteria, evidence gaps, and a clear review action. Proposed fit thresholds remain editable planning assumptions. |
| Audience Segmentation | Pass | Audience Segmentation `1.2.6` returned artifact `705cbdeb-0ba6-4910-be93-c5efb173a7d4`, workflow `61eb2e06-9437-4017-aee9-373d50d5e595`, with useful segment rules, channel fit, exclusions, governance notes, and no activation. |
| Messaging | Pass | Messaging `1.2.6` returned artifact `c8f41edb-0c3e-4c7a-bdfc-61c2d790cf83`, workflow `82b72dea-f019-4bb1-aa95-c4964e651024`, with positioning, narrative, message pillars, boilerplate, answer-ready copy, objections, proof gaps, and a direct review action. |
| Branding And Pitch Deck | Pass after fix | Branding And Pitch Deck `1.2.8` returned artifact `a7630b65-d430-435a-97d4-ae77e5d076a4`, workflow `6c99dd52-4633-477c-88c9-104b5584a783`, as `ready_for_review`. The brief contains all ten requested slides, neutral customer visual direction rather than Guild styling, and visible `Hypothesis — verify` or `TBD` proof labels. |
| Social Monitoring And Content | Pass after fix | Social Monitoring And Content `1.2.9` returned artifact `db8c3216-de0e-413b-b446-d76ff12f075c`, workflow `6c76d5cf-f002-4a9d-b3bc-d3de256dc802`. Both the plan and draft sections contain Weeks 1–4 with substantive copy, remain channel-neutral, explicitly state that no live monitoring occurred, and perform no publishing or scheduling. |
| Campaigns And Paid Media | Pass after fix | In a brand-new ordinary Chat, session `019fafb3-b28d-351a-0000-c1bb8f4ced04`, Launcher `0.3.29` routed the natural integrated-campaign request to Campaigns `1.2.11`. Artifact `186c3146-ce28-4875-89e8-c912e906e057`, workflow `c768fd03-e475-4026-af59-c70d87465aa3`, includes the campaign idea, audiences, message, channels, creative hypotheses, landing-page needs, KPIs, optimization recommendations, and a visibly review-required 100% planning mix with live media spend at 0%. No execution or spend occurred. |

The fixed attempts remain in the evidence trail. They include overly strict
Market Signal readiness, customer deck styling and completeness issues, a
missing content-period draft, ambiguous integrated-campaign routing, and two
safely blocked campaign budget repairs. Each final pass uses the corrected
private version listed above.

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
- Progressive Company Context pass:
  `_private/evidence/2026-07-29T20-08-16-913Z-019faf7d-5e2f-351a-0000-9235c84b9d47.json`
- Artifact approval pass and technical receipt defect:
  `_private/evidence/2026-07-29T20-09-56-687Z-019faf7d-5e2f-351a-0000-9235c84b9d47.json`
- Two safely rejected publication attempts:
  `_private/evidence/2026-07-29T20-14-40-028Z-019faf7d-5e2f-351a-0000-9235c84b9d47.json`
- Corrected Launcher `0.3.27` fresh baseline:
  `_private/evidence/2026-07-29T20-19-08-543Z-019faf87-4b80-351a-0000-486385b07227.json`
- Corrected Launcher `0.3.27` fresh artifact approval:
  `_private/evidence/2026-07-29T20-22-32-532Z-019faf87-4b80-351a-0000-486385b07227.json`
- Safely blocked Launcher `0.3.27` coded publication:
  `_private/evidence/2026-07-29T20-25-38-846Z-019faf87-4b80-351a-0000-486385b07227.json`
- Complete seven-specialist acceptance session, including the final
  presentation and content-plan passes:
  `_private/evidence/2026-07-29T21-14-50-280Z-019faf98-3cdf-351a-0000-b4ba765c3b07.json`
- Brand-new ordinary Chat proving Launcher `0.3.29` integrated-campaign
  routing, retained safe failures, and the final Campaigns `1.2.11` pass:
  `_private/evidence/2026-07-29T21-15-01-092Z-019fafb3-b28d-351a-0000-c1bb8f4ced04.json`

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

Marketer browser acceptance is complete.

A nontechnical marketer can understand the system, install and orient the
suite, create a progressively useful company baseline, approve it, publish the
compact brief through native Guild Workspace Context, and reuse that context in
new ordinary Chats. All seven specialist outcomes route correctly and return
company-specific, reviewable drafts. The explicitly requested presentation and
integrated-campaign journeys pass. Failed attempts remain preserved, and no
publishing, scheduling, spend, CRM mutation, credential setup, legal approval,
or other external marketing execution occurred.

Repository verification and the GitHub pull-request merge are recorded
separately from this browser-acceptance result.
