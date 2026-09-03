# Agent Hub Readiness Re-audit — 2026-09-03

## Outcome

The nine-package Guild Marketing OS suite passes the final Agent Hub visitor
gate. Eleven of twelve audit checks pass, with no Hub-visitor blockers. The
remaining C3 owner-binding result is an intentional, documented product choice:
a Launcher-only fork continues to call the canonical public capability agents,
while a fully independent suite requires the guarded all-package fork and
binding-regeneration workflow.

No runtime capability or external integration was added during remediation.
Market Signal and Social Signals And Content remain no-tool, supplied-evidence
agents.

## Remediation releases

| Package | Version | Guild version ID | Published (UTC) |
| --- | --- | --- | --- |
| Market Signal | `1.2.9` | `01a06871-2cc4-cf83-0000-0a5e6cb92453` | `2026-09-03T18:05:15.921720+00:00` |
| Social Monitoring And Content | `1.2.11` | `01a06871-2b9d-cf83-0000-173d954675fb` | `2026-09-03T18:05:15.617627+00:00` |

Both releases passed Guild validation and published successfully. Their Hub
documentation now states that URLs are unread references, connector or
monitoring results must be pasted or otherwise supplied, and direct runs report
`source_supplied` evidence mode.

## Final audit

| ID | Result | Evidence |
| --- | --- | --- |
| C1 Commands exist | Pass | README development commands are real Guild or package commands. |
| C2 Portable paths | Pass | No machine-specific paths appear in package READMEs. |
| C3 Owner consistency | Documented exception | Launcher intentionally binds the canonical `michaelpreuss~` suite; the fork model documents the independent-suite workflow. |
| C4 Claims match tools | Pass | No-tool specialists explicitly disclaim web, connector, monitoring, publishing, sending, and spend capabilities. |
| C5 Same story | Pass | README taglines and runtime descriptions describe the same jobs and boundaries. |
| C6 Forkable test | Pass | All nine published packages clone with their README, package manifest, and agent source; no default test requires a private workspace. |
| C7 Quickstart | Pass | Every package documents installation and a first message. |
| C8 Plain-text example | Pass | Every package includes a natural-language blockquote request. |
| C9 Negative boundaries | Pass | Every package includes explicit `Does not` and `Never` boundaries. |
| C10 Suite map | Pass | Launcher is the normal front door, delegates through eight explicit agent bindings, and every required sibling is public. |
| C11 Phantom scripts | Pass | No README advertises a missing package script. |
| C12 Human title | Pass | Every package uses a human-readable H1. |

Published source matched the repository for all nine packages at the audit
point. The full repository `npm run verify` suite also passed before the two
documentation-only releases.

## Non-blocking maintenance

All nine agents still use legacy snake-case runtime `identifier` values. This
is low-priority compatibility work, not an Agent Hub blocker, and should be
handled only as a coordinated release.
