# Launcher Spike Record — 2026-07-28

## Baseline

- Workspace: `michaelpreuss/guild-marketing-os`
- Workspace ID: `019f001c-cb37-3bb9-0000-31e5e134d4c3`
- Published context ID: `019f10b8-0faa-9b1f-0000-0f14b2f84fea`
- Default at start and end: Company Context Builder 1.0.31
- Specialists at start and end: 1.0.9
- Default-routing failure:
  `019fa97a-b109-351a-0000-5168d89d276b`
- Direct Messaging success:
  `019fa97b-db59-351a-0000-d76602123c7e`

## Minimal LLM spike

Session `019fa9a3-34ca-f268-0000-4ec269f78a74` returned the complete Messaging
artifact in the originating Launcher test session. The task tree contained one
Launcher root, one Messaging child, and only Guild discovery/tool tasks.

This proved that a workspace-agent handoff can work, but did not prove the
coded state-machine return path.

## Coded router findings

- `019fa9af-a2ca-f268-0000-f81d1536ed06`: hostile self-delegation and publish
  request blocked; no specialist child.
- `019fa9b2-c324-f268-0000-ab9380777fb0`,
  `019fa9b6-4da2-f268-0000-0df05a1aafe6`,
  `019fa9c0-2475-f268-0000-36665c1105df`, and
  `019fa9c3-4a69-f268-0000-2dc3100c5276`: preserved failures that exposed
  workspace-context injection and unsupported direct session-read behavior in
  a coded task.
- `019fa9c8-ad2b-f268-0000-f68fd684971d`: after stripping injected context,
  the coded router selected Messaging and invoked only that allowlisted child.
  Messaging completed and produced its artifact, but the Launcher root
  remained dispatched and did not return the result.
- `019fa9cf-7323-f268-0000-f65b134d33e7`: Guide fallback returned route,
  context fingerprint, installed package/version, a no-child status, and the
  specialist handoff prompt. A subsequent local regression removed
  non-user workspace metadata from that prompt.
- `019fa9d4-6e9b-f268-0000-b513f3bc71c7`: final clean Guide fallback check.
  The handoff contained only the user request plus the draft-only specialist
  contract; no specialist child or unrelated agent was invoked.

## Decision

Ship the non-delegating Guide fallback for private alpha. Keep coded delegation
disabled until a fresh normal-Chat test proves that a completed child reliably
resumes the root, returns the complete validated artifact, and handles failure
and format repair without hanging.

No workspace default, installed version, package visibility, context, trigger,
credential, or external marketing system was changed during the spike.
