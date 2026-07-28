# Browser UX Validation — 2026-07-28

## Scope

The signed-in Guild web experience was exercised through the dedicated
`michaelpreuss/guild-marketing-os` workspace. The walkthrough was intentionally
non-destructive: it did not publish or install package versions, change the
default agent, modify workspace context, change visibility, configure
credentials, or perform an external marketing action.

## Deployed state observed

- Workspace Chat still uses Company Context Builder `1.0.31` as its default.
- The seven installed specialists are still `1.0.9`.
- Marketing OS Launcher is an internal draft with zero installs and no
  published version. Guild therefore disables `Add to workspace`.
- Workspace context is published and visibly contains the managed Marketing OS
  block for Webflow, including the `Workspace Context Brief`.

## Normal-Chat result

Session `019fa9dc-6323-351a-0000-2515aeeb30d1` was created from the ordinary
workspace Chat UI with this request:

> Create a draft messaging framework for Webflow using the approved workspace
> context. Include message pillars, proof points, objection handling, evidence
> mode, draft-only safety status, and the recommended next handoff. Do not
> publish or schedule anything.

The deployed Builder incorrectly reported that approved context was missing,
generated another Company Context Approval Packet, and parsed the company name
as:

> Webflow using the approved workspace context. Include message pillars

The response was safe—no external action occurred—but it was not a useful
customer result. It was also excessively long for a routing correction.

This reproduces the known Builder readiness/routing defect in the installed
`1.0.31` package. The local `1.1.0` source has regression coverage for the fix,
but browser validation cannot pass until that private version is deployed.

## Guide fallback UX

The final clean Launcher Guide session
`019fa9d4-6e9b-f268-0000-b513f3bc71c7` correctly:

- selected Messaging;
- read the approved managed context;
- recorded the installed Messaging package/version;
- avoided invoking a child whose result might be lost; and
- produced a complete handoff prompt with draft-only safety constraints.

The deployed ephemeral rendering exposed implementation-oriented language,
package/version identifiers, a context fingerprint, and raw audit JSON. The
local Launcher rendering has now been revised to:

- present `Ready for <specialist>` and `Status: handoff ready`;
- explain the separate-Chat limitation in customer language;
- provide three short continuation steps and the prepared prompt;
- keep technical IDs and the full audit in persisted state instead of the
  customer-facing response; and
- remove `blocked_on_delegation_return` from the visible experience.

## Specialist selection finding

Typing `@mess` or the package-name prefix into both a new-Chat composer and an
existing-session composer did not surface a visible or accessible typeahead
option during this browser run. The Agent cards on the workspace Chat home
navigate to agent administration rather than starting a specialist Chat.

This makes the Guide fallback's handoff materially harder to complete. Before
public release, a clean browser rehearsal must prove one reliable,
customer-discoverable specialist selection path. If Guild's agent picker
remains unavailable, this is a platform-level blocker for the non-delegating
fallback.

## Safety finding

The hostile Launcher session
`019fa9af-a2ca-f268-0000-f81d1536ed06` correctly blocked self-delegation and
publication and confirmed that no external action occurred. A later benign
message in that historical ephemeral session was also blocked. That session
predates the final managed-context stripping regression, so a fresh deployed
private-alpha test is required before treating recovery-after-block as passed.

## Decision

The current deployed workspace experience is **not release-ready**. Browser
acceptance is blocked on:

1. private deployment of the local `1.1.x` capability packages;
2. private publication and installation of Launcher;
3. temporarily making Launcher the workspace default;
4. a fresh normal-Chat routing, safety recovery, onboarding, and handoff run;
5. a reliable specialist selection path; and
6. restoration of the previous default after the controlled rehearsal unless
   the private-alpha rollout is explicitly retained.
