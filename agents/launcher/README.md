# Marketing OS Launcher

Routes draft-only marketing work to a focused public Guild agent suite, returns complete review artifacts, and keeps a canonical cockpit in one continuing Chat without executing marketing actions.

## Behavior

- Routes company-context, market-signal, ICP, segmentation, messaging, brand and pitch, social-content, and campaign requests to eight explicit suite agents.
- Uses an LLM classifier plus workspace readiness to understand natural first messages such as `Let's get started` and `I'm ready`; explicit safety and workflow commands remain deterministic.
- Uses closed-schema semantic interpretation to connect short follow-up answers to the correct waiting workstream without requiring `resume` or `continue`.
- Reads published Workspace Context before deciding whether company context is missing.
- Keeps runs, artifact revisions, approvals, workstreams, handoffs, and an audit trail in this Chat's Guild task state.
- Returns a concise Company Context follow-up when core input is missing; the full validated artifact remains available through an explicit read-only retrieval command.
- Returns a summary, the complete validated specialist draft, its evidence mode, and the next review action for review-ready and non-context specialist work.
- Supports cockpit status, export, focused resume, artifact approval, and confirmed deletion of structured cockpit state.
- Retrieves stored artifacts for every workstream from natural requests and resolves explicit natural approvals to one deterministic artifact revision.
- Does **not** publish content, schedule work, spend budget, change CRM data, configure credentials, or make legal decisions.
- Never treats artifact approval as permission to execute an external action.

## Suite position

- Front door: use Launcher for normal Marketing OS work.
- Required before specialist work: approved Workspace Context, or enough source material for Company Context Builder to draft it.
- Next step after a successful run: review the returned artifact, approve an exact revision when appropriate, or continue the named workstream in this Chat.
- Launcher calls the canonical public Marketing OS capability agents published with this suite. A fork of Launcher keeps those canonical bindings unless its maintainer deliberately forks every capability and regenerates `suite-binding.ts`.

Use a dedicated Marketing OS workspace so its context and cockpit are not mixed with unrelated product context.

## Quickstart

1. Create or select a dedicated Guild workspace for the company or project.
2. From the workspace, open **Agents**, choose **Add agent**, find **Marketing OS Launcher**, and install it.
3. Open a new Chat, select or @mention Launcher, and send `Let's get started`.
4. Approve its one-at-a-time requests to install Company Context Builder and the seven specialists.
5. Continue in the same Chat so Launcher can retain the cockpit.

## Plain-text workflow request

> Help me set up Marketing OS for my project. Start by asking for the minimum company context and evidence needed to create a reviewable foundation.

## What to send

- `Help me set up company context for my project` — routes the first context draft to Company Context Builder.
- `Create an ICP from the approved company context` — routes a review-only ICP workstream.
- `Show Marketing OS cockpit status` — lists workstreams, artifact revisions, blockers, and next actions retained in this Chat.
- `Show current Company Context draft` — retrieves the complete latest Company Context artifact without changing Workspace Context.
- `Show Company Context artifact revision 1` — retrieves one exact retained revision.
- `Can I see the latest messaging draft?` — retrieves the latest stored Messaging artifact without running the specialist again.
- `What did we settle on for ICP?` — retrieves the matching stored ICP artifact when the target is unambiguous.
- `Approve Messaging artifact revision 1` — approves only the exact stored draft revision named in the request.
- `Approve this` — approves the uniquely resolved review-ready artifact; positive sentiment such as `Looks good` asks for explicit approval and does not change state.
- `Export the Marketing OS cockpit` — returns the structured cockpit as JSON in Chat.

Outside Chat, send a text payload such as:

```json
{ "type": "text", "text": "Create an ICP from the approved company context" }
```

Workspace Context publication requires an approved Company Context artifact and this exact second confirmation in the canonical Launcher Chat:

`publish approved context to workspace context`

Deleting structured cockpit state also requires a separate exact confirmation:

`delete marketing os cockpit state from this chat`

That deletion does not erase Guild Chat history or published Workspace Context.

## Output

Launcher can return:

- `Marketing OS is ready` — installation status and the next setup action.
- `Marketing OS Guide` — a clarification when no specialist should run.
- `Marketing OS` — an at-a-glance receipt followed by the complete validated specialist draft.
- `Marketing OS Cockpit` — workstream, artifact, approval, blocker, and next-action state.
- `Marketing OS Approval` — the exact artifact revision and approval text retained in the cockpit.
- `Marketing OS Cockpit Export` — the complete structured state retained by this Chat.
- `Request not supported` — a fail-closed response with no external action.

Delegated specialist drafts use these shared sections: `Consumed Context`, `Produced Artifact`, `Assumptions And Missing Evidence`, `Approval Gate`, `AEO / AI-Readiness Contribution`, `Status Payload`, and `Downstream Handoff`.

## Development

From `<agent-directory>`:

```sh
npm install
npm run build
guild agent test
```

`guild agent test` creates an ephemeral version from the local agent repository. Guild authentication is required; no private author workspace is required.
