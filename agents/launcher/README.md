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
- `Tell me whether that got saved` — reads the latest referenced artifact's save and approval state from this Chat, without starting a specialist or changing the cockpit. Name a workstream or revision when the target is ambiguous.
- `Show current Company Context draft` — retrieves the complete latest Company Context artifact without changing Workspace Context.
- `Show Company Context artifact revision 1` — retrieves one exact retained revision.
- `Can I see the latest messaging draft?` — retrieves the latest stored Messaging artifact without running the specialist again.
- `What did we settle on for ICP?` — retrieves the matching stored ICP artifact when the target is unambiguous.
- `Approve Messaging artifact revision 1` — approves only the exact stored draft revision named in the request.
- `Approve this` — approves the uniquely resolved review-ready artifact; positive sentiment such as `Looks good` asks for explicit approval and does not change state.
- `Export the Marketing OS cockpit` — returns the structured cockpit as JSON in Chat.

If a channel reply such as `Maybe LinkedIn later` needs clarification, the pending
artifact stays available. Follow with `Approved channels are website and email`
to resume that workflow. A delegated clarification re-checkpoints the prior
cockpit without advancing artifact revisions, attempts, or approvals; a direct
save-status question does not write state.

Outside Chat, send a text payload such as:

```json
{ "type": "text", "text": "Create an ICP from the approved company context" }
```

Preparing Workspace Context for publication requires an approved Company Context artifact and this exact second confirmation in the canonical Launcher Chat:

`publish approved context to workspace context`

Launcher returns the approved compact block and instructions to preserve existing workspace notes, append the block in Guild's **Context** screen, and click **Publish**. The phrase does not publish automatically. Start a new Launcher Chat after publication to use the updated context.

Deleting structured cockpit state also requires a separate exact confirmation:

`delete marketing os cockpit state from this chat`

That deletion does not erase Guild Chat history or published Workspace Context.

## Output

Launcher can return:

- `Marketing OS is ready` — installation status and the next setup action.
- `Marketing OS Guide` — a clarification when no specialist should run.
- `Marketing OS` — an at-a-glance receipt followed by the complete validated specialist draft.
- `Marketing OS Cockpit` — workstream, artifact, approval, blocker, and next-action state.
- `Marketing OS Save Status` — a compact local save/approval receipt. Historical publication receipts do not establish that the latest draft is published; workspace-wide publication is not checked.
- `Company Context Clarification` — a focused follow-up without replacing the pending artifact, changing its revision, or attempting artifact-format repair.
- `Marketing OS Approval` — the exact artifact revision and approval text retained in the cockpit.
- `Marketing OS Cockpit Export` — the complete structured state retained by this Chat.
- `Request not supported` — a fail-closed response with no external action.
- `Marketing OS State Recovery Required` — stored state could not be safely restored or checkpointed. Launcher does not silently replace it with an empty cockpit or accept a new draft. Review the existing Chat history and ask a workspace administrator to inspect retention before continuing.

Delegated specialist drafts use these shared sections: `Consumed Context`, `Produced Artifact`, `Assumptions And Missing Evidence`, `Approval Gate`, `AEO / AI-Readiness Contribution`, `Status Payload`, and `Downstream Handoff`.

## Development

From `<agent-directory>`:

```sh
npm install
npm run build
guild agent test
```

`guild agent test` creates an ephemeral version from the local agent repository. Guild authentication is required; no private author workspace is required.

## Independent suite forks

Installing Launcher, or forking only Launcher, continues to use the canonical
public capabilities. It does not discover sibling forks. An independent suite
requires all nine packages and an explicit binding change by its maintainer.
The procedure below works from standalone Guild clones; no monorepo script or
private workspace is required.

1. Choose a Guild owner the maintainer can edit. Obtain the source owner's
   qualified package names from the Hub and this package's `suite-binding.ts`.
   Fork each of the eight capabilities below, then Launcher. Keep each package
   name unchanged under the new owner. For each package, replace the angle-bracket
   values and use a distinct, empty destination directory:

   ```sh
   guild agent fork "<source-owner>~<package-name>" --owner "<new-owner>" --name "<package-name>" --directory "<fork-directory>"
   guild agent get "<new-owner>~<package-name>"
   ```

   Forking creates remote packages. Verify each returned `full_name`, `id`,
   edit permission, and published version before proceeding. A fork does not
   copy the original owner's Chat state or approved company context.

   | Launcher binding key | Capability package name |
   | --- | --- |
   | `company_context` | `guild-marketing-os-company-context-builder` |
   | `market_signal` | `guild-marketing-os-market-signal` |
   | `icp` | `guild-marketing-os-icp` |
   | `audience_segmentation` | `guild-marketing-os-audience-segmentation` |
   | `messaging` | `guild-marketing-os-messaging` |
   | `branding_pitch_deck` | `guild-marketing-os-branding-pitch-deck` |
   | `social_monitoring_content` | `guild-marketing-os-social-monitoring-content` |
   | `campaigns_paid_media` | `guild-marketing-os-campaigns-paid-media` |

   The ninth package is `guild-marketing-os-launcher`.

2. In the Launcher fork, update **every** `suite-binding.ts` entry: keep its
   binding key and `packageName`; set `qualifiedName` to the new owner's exact
   `full_name` and `agentId` to that same capability's returned `id`. Never use
   a version ID, guess an ID, or mix canonical and forked siblings. Check that
   each fork's `package.json` name is `@guildai/<new-owner>~<package-name>`;
   correct source package names when needed. Do not hand-edit `guild.json`,
   which Guild manages. Launcher still may call only these eight capabilities,
   never itself or arbitrary workspace agents.

3. From each changed `<agent-directory>`, run the Development build and test
   commands above. A maintainer who chooses to release these forks should
   publish the eight capabilities before Launcher. From each authorized fork
   directory, stage the intended source files and run:

   ```sh
   guild agent save -A --message "Prepare independent suite fork" --publish --wait
   ```

   `-A` includes tracked modifications only; explicitly stage any new files
   first. This command creates and publishes a version. It is a separate
   maintainer release decision, not part of the default test command. Confirm
   `latest_published_version.status` is `PUBLISHED` with `guild agent get` for
   every capability, then for Launcher.

4. Inspect the released Launcher with
   `guild agent capabilities "<new-owner>~guild-marketing-os-launcher"`.
   Confirm all eight sub-agent targets belong to the new owner and match the
   bindings. In a fresh dedicated workspace, install the forked Launcher and
   check that its installation requests name only the forked capabilities.
   Stop if any canonical or unrelated package is requested.

5. In a new Chat, provide fictional company context, answer a missing field,
   retrieve the draft, and request a save-status receipt. Confirm the artifact
   retains its identity and progresses only after a successful answer. Test
   a representative forked specialist directly with approved supplied context
   and confirm its task belongs to the new owner. Launcher requires approved
   published Workspace Context before downstream delegation; testing that path
   requires a separate, authorized context-publication step. Artifact approval
   remains draft-only; do not publish Workspace Context or execute marketing
   actions as part of this initial fork check.

Changing bindings is an opt-in source change, not an automatic effect of a fork.
Keep the canonical bindings for ordinary installations and Launcher-only forks.
