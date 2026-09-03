# Company Context Builder

Turns supplied company information into a reviewable Marketing OS context foundation in Guild Chat without publishing Workspace Context or executing marketing actions.

## Behavior

- Converts readable source text into company facts, audiences, messaging sources, brand guidance, channel scope, proof constraints, dashboard signals, and AEO-readiness notes.
- Treats a supplied URL as an unread reference. The built-in Guild LLM does not fetch web pages, so URL-only setup asks for a short approved description or pasted source excerpt instead of implying that the site was inspected.
- Separates approved facts, user-supplied claims, assumptions, missing evidence, blocked claims, and do-not-use claims.
- Retains source text, artifact revision, and approval state in the direct Builder Chat.
- Accepts short, conversational answers to outstanding questions and reconciles them with the retained draft instead of requiring a complete packet on every turn.
- Understands natural edit and persistence-status requests while keeping approval, evidence, and publication transitions explicit.
- Produces a compact Workspace Context candidate for review and a handoff to downstream Marketing OS agents.
- Does **not** publish Workspace Context from a direct Builder Chat, install agents, schedule work, spend budget, or mutate external systems.
- Never turns artifact approval into execution approval or fills missing company facts from model background knowledge.

## Suite position

- Front door: use Marketing OS Launcher for the normal suite workflow; Launcher routes first-run context setup here.
- Required before a review-ready artifact: a company name, approved description, primary audience, current marketing goal, approved channel scope, and an owner who can review them. Proof and brand guidance can be added later.
- Next agent after approval: return to Launcher for its separate confirmation gate, publish the prepared compact block in Guild's Context screen, then request the relevant specialist.

Use a dedicated Marketing OS workspace so approved company context does not mix with unrelated product context.

## Quickstart

1. Create or select a dedicated Guild workspace.
2. From the workspace, open **Agents**, choose **Add agent**, and install **Marketing OS Launcher**. Launcher will request this agent during setup.
3. Open the continuing Launcher Chat and send readable company source text or the request below.
4. Review the resulting Company Context artifact and approve the exact revision shown in Launcher.

## Plain-text workflow request

> Build a reviewable company-context foundation from the source text I provide. Separate approved facts from assumptions, flag missing evidence, and prepare the smallest useful Workspace Context candidate.

## What to send

- Company or project name, approved description, primary audiences, current marketing goal, approved claims, claim restrictions, and intended channels.
- Pasted source text or excerpts the running agent can read.
- A URL may be included for reference, but its page contents are not opened or treated as evidence.
- `What company-context information is still missing?` — returns focused gaps without inventing answers.
- `Marketing leaders at B2B SaaS companies` — can answer a pending audience question without repeating the other company fields.
- `Remove developers from the audience` — revises only the named field and preserves the rest of the retained source.
- `Tell me whether that got saved` — reports persistence state without creating a new draft.
- `Approve Company Context Builder artifact revision 1` — when sent through Launcher, approves only the named artifact revision.
- `Approve it` — explicitly approves the current uniquely resolved review-ready draft; `Looks good` alone does not approve it.

Outside Chat, send a text payload such as:

```json
{ "type": "text", "text": "Build a company-context foundation from the source text below: ..." }
```

After the exact artifact revision is approved in the canonical Launcher Chat, send this exact phrase there to prepare Workspace Context for publication:

`publish approved context to workspace context`

Launcher returns the approved compact block for the user to append in Guild's **Context** screen while preserving existing notes, then click **Publish**. Neither this phrase nor approval in a direct Builder Chat publishes automatically. Start a new Launcher Chat after publication to use the updated context.

## Output

Every substantial Company Context packet uses these sections in order:

1. `Consumed Context` — supplied sources, conversation intent, and missing inputs.
2. `Produced Artifact` — context drafts, save and approval state, Workspace Context candidate, and downstream context.
3. `Assumptions And Missing Evidence` — evidence labels, claims requiring review, and open questions.
4. `Approval Gate` — decisions and owners required before reuse or publication.
5. `AEO / AI-Readiness Contribution` — entity clarity, answer coverage, and source gaps.
6. `Status Payload` — structured status, persistence state, source confidence, and readiness.
7. `Downstream Handoff` — the next Marketing OS agent and what it can safely consume.

Packet status is `needs_input`, `ready_for_review`, or `blocked`. Workspace Context remains unchanged until the user publishes the prepared block in Guild's Context screen.

## Development

From `<agent-directory>`:

```sh
npm install
npm run build
guild agent test
```

`guild agent test` creates an ephemeral version from the local agent repository. Guild authentication is required; no private author workspace is required.
