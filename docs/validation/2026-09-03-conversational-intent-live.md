# Conversational Intent Live Acceptance — 2026-09-03

## Result

Deployment completed. Live acceptance is **partial**, not a full pass.

The clean workspace is
`michaelpreuss~marketing-os-conversational-e2e-20260903`
(`01a0688d-6fd3-3bb9-0000-0e3620c01179`). All nine suite packages are
installed with auto-update enabled, and Marketing OS Launcher is the default.
No Workspace Context was published and no external marketing action occurred.

Final installed upgrade versions:

- Launcher `0.5.2`, published version
  `01a068a0-d5c5-cf83-0000-47c5c085fdc9`.
- Company Context Builder `1.4.1`, published version
  `01a06896-6cca-cf83-0000-0946c0453f4a`.

## Verified live checkpoints

Initial acceptance Chat:
`01a0688d-d736-351a-0000-7105bccbd64c`.

- An incomplete Company Context request created a `needs_input` workflow.
- The short reply “Marketing leaders at B2B SaaS companies” resumed the same
  workflow without a resume keyword and advanced artifact revision 1 to 2.
- Natural Company Context retrieval returned the stored artifact and its
  identity, revision, status, and read-only receipt.
- Explicit revision retrieval returned revision 3 after revision 4 existed.
- “Tell me whether that got saved” returned the stored artifact with its
  persistence state and did not create another revision.
- “Looks good” returned an approval check without recording approval.
- “Approve it” approved the uniquely resolved stored revision and retained
  that exact sentence as approval text.
- Repeating “Approve it” was idempotent.
- A downstream Messaging request was blocked because Workspace Context had
  not been published. No specialist or external action was started.

## Findings and corrective releases

The initial versions (`0.5.0` and `1.4.0`) exposed multi-turn source loss.
An unrelated later answer could drop previously supplied audiences or goals.

1. Builder `1.4.1` adds deterministic preservation of closed context fields
   after semantic reconciliation. A regression test supplies an LLM extraction
   that attempts to replace unrelated audiences and goals during a channel
   update and verifies that those fields remain intact.
2. Launcher `0.5.1` attempted to retain the full rendered artifact on resume.
   Live Chat `01a0689c-81e8-351a-0000-28548b994604` showed that this allowed
   generated headings, blockers, and receipts to contaminate source extraction.
3. Launcher `0.5.2` supersedes that approach. It replays only the original
   request and prior user follow-up inputs, in order, before the newest focused
   input. Generated artifact prose is excluded. The cockpit suite verifies
   retention across three turns.

Source commits are `fc9a6b4`, `1bf23b7`, `966e4b1`, and `07be675`.

## Final live attempt and remaining gaps

Final Chat: `01a068a3-ca7e-351a-0000-e9ae87fbf694`.

- Launcher `0.5.2` and Builder `1.4.1` were confirmed installed before the Chat.
- An initial labeled source packet created revision 1 for Acme Cloud.
- A natural short audience answer resumed the same run and produced revision 2.
- The next channel answer started Builder child
  `01a068a5-e9f9-4aa6-0000-1f913786fb8a` but did not return within the observation
  window. Guild diagnostics then returned `no healthy upstream` and
  `unconditional drop overload`. The local waiting CLI client was interrupted;
  no successful result is claimed for that turn.

Remaining acceptance gaps:

- In Launcher-to-Builder focused resumes, “Approved channels are website and
  email” is still rejected by Builder's colon-dependent approved-channel guard.
  The exact labeled form `Channels in scope: website and email` remains the
  known deterministic path. Natural channel declarations need a follow-up fix.
- The latest source-only replay behavior has local regression coverage, but its
  complete live three-turn preservation check was blocked by the platform stall.
- Direct Builder persistence/edit/removal scenarios have local coverage but
  were not completed live in this workspace.
- Downstream Messaging/ICP/Campaign artifact retrieval and approval were not
  exercised through Launcher because approved Workspace Context publication
  was intentionally not performed.

## Local verification

All corrective releases passed `npm run verify` and `git diff --check` before
publication. This includes routing, cockpit, Foundation state, specialist
runtime, contracts, all nine package builds, and the Guild-native checks.

This record does not claim broad production readiness, full conversational
acceptance, or a live downstream rollout.
