# CMO Onboarding Acceptance — 2026-09-03

## Outcome

The revised first-time CMO journey passes in a clean Guild workspace with the
published Marketing OS Launcher `0.4.1` and Company Context Builder `1.3.1`.
A marketer can select Launcher, send `Let's get started.`, approve eight
one-at-a-time specialist installations, supply a URL, receive an honest
three-question recovery prompt, provide a natural one-paragraph baseline, and
reach a retained `ready_for_review` Company Context artifact.

No Workspace Context was approved or published, and no content, campaign,
spend, CRM data, credentials, or other external system was changed.

## Product decisions

- Natural start intent uses the built-in LLM classifier with a small fallback
  for obvious start phrases. It is not limited to one deterministic string.
- Guild's built-in `task.llm.generateText()` generates text but does not fetch
  or search the web.
- This release intentionally adds no Blaxel gateway, Firecrawl, Exa, retrieval
  service, or related credential.
- A supplied URL is retained as a reference but is not represented as read.
  The marketer is asked to paste an approved description or source excerpt.
- Proof, brand guidance, and optional detail do not block a useful baseline;
  the minimum review-ready packet is company, description, audience, goal, and
  channel scope.

## Release evidence

| Package | Live version | Guild version ID | Published (UTC) |
| --- | --- | --- | --- |
| Marketing OS Launcher | `0.4.1` | `01a06847-5b8f-cf83-0000-c55b08020541` | `2026-09-03T17:19:38.826326+00:00` |
| Company Context Builder | `1.3.1` | `01a06854-f306-cf83-0000-9e126b919433` | `2026-09-03T17:35:03.106174+00:00` |

Both published versions passed Guild validation. The acceptance workspace
auto-updated to these versions before the successful recovery run.

Repository commits:

- `b39127a` — semantic onboarding, compact missing-context response, URL
  reference behavior, artifact retrieval, documentation, and regression tests.
- `a49ab00` — Launcher `0.4.1` release retry after an orphaned `0.4.0`
  validation job.
- `3f877a9` — natural single-paragraph CMO baseline parsing and live regression
  test, released as Builder `1.3.1`.
- `8007397` — source-only cleanup that keeps audience qualifiers out of the
  audience list.

`npm run verify` passed after every final source change. The suite covers
contracts, context benchmark scoring, specialist runtime sync and behavior,
Launcher routing and cockpit behavior, Foundation state behavior, all nine
agent builds, and the Guild-native boundary check. `git diff --check` also
passed.

## Clean browser acceptance

- Account: `michaelpreuss`
- Workspace: `marketing-os-cmo-acceptance-20260903`
- Workspace ID: `01a0684a-3735-3bb9-0000-b7ea5131c5fe`
- Session: `01a0684a-b76b-351a-0000-f4e129645e4b`
- Interface: signed-in Guild in the Codex in-app browser

### Installation and start

The clean workspace initially had no agents. Launcher `0.4.1` was installed
from the Agent picker. A bare `Let's get started.` went to Guild's generic
workspace assistant because installation does not select an agent for the
first chat turn. After explicitly selecting `@guild-marketing-os-launcher`,
the same phrase started onboarding.

Launcher requested these agents in order, using eight separate Guild approval
cards: Company Context Builder, Market Signal, ICP, Audience Segmentation,
Messaging, Branding And Pitch Deck, Social Monitoring And Content, and
Campaigns And Paid Media. After all eight approvals it returned `Marketing OS
is ready`, showed every specialist as installed, stated the draft-only safety
boundary, and recommended company-context setup.

### URL-only recovery

Prompt:

> Set up Marketing OS for Guild. Our website is https://guild.ai. Ask me only
> for information you cannot establish from approved sources.

Launcher `0.4.1` and Builder `1.3.0` returned a compact `needs input` receipt:

- Company: Guild
- Evidence: source supplied
- Draft artifact: revision 1
- Workspace Context: unchanged
- Exactly three questions: paste an approved company description or excerpt,
  identify the primary audience, and state the current marketing goal
- Explicit statement that the URL cannot be opened in this version
- Read-only command for retrieving the complete retained artifact

No full artifact was appended to the missing-input receipt and no approval or
publication was requested.

### Natural baseline recovery

The first natural one-paragraph recovery attempt exposed a parser gap and was
safely blocked: labeled fields on the same paragraph did not enter the
deterministic complete-packet path. Builder `1.3.1` fixed that gap and added the
exact live paragraph as a regression test.

The identical paragraph then returned a complete `ready_for_review` artifact:

- Artifact: `d32b4543-f61c-45aa-8c33-af5a64c9b49b`, revision 1
- Workflow run: `56899f0a-153a-4611-8ab7-95da6f6e0dd8`
- Installed Builder version ID:
  `01a06854-f306-cf83-0000-9e126b919433`
- Company: Guild
- Description, audience hypotheses, marketing goal, and channels preserved
- No unsupported proof claim added
- Status: `ready_for_review`
- Workspace Context: unchanged

Both `Show current Company Context draft` and `Show Company Context artifact
revision 1` returned the retained artifact with the exact ID, revision, and
status. Each response ended with a read-only receipt confirming Workspace
Context and external systems were unchanged.

The Context screen remained at its default placeholder content with Publish
disabled, independently confirming that acceptance did not publish the draft.

## Platform observations and residuals

- Guild requires the first chat turn to select or `@mention` Launcher. Merely
  installing it does not make it the responder. The quickstart and Launcher
  onboarding copy now state this explicitly.
- Eight separate approvals are safe and auditable, but the flow takes several
  minutes because each Guild install card is sequential.
- Agent calls can take roughly 15–90 seconds; the UI shows thinking/install
  state while work is in progress.
- Launcher committed draft `01a06836-1652-cf83-0000-419122419694` (`0.4.0`)
  remains `RUNNING` with no validation steps. Launcher `0.4.1` was published
  from a clean candidate and is the verified live version.
- Builder `1.3.2` candidate `01a06858-540d-cf83-0000-1f9d2dc4ba0f` contains
  the optional audience-qualifier cleanup from commit `8007397`, but its second
  Guild publish worker remained `PUBLISHING` with no steps at the end of this
  run. Builder `1.3.1` remains the verified live version; no duplicate retry
  was created.
- No external retrieval cost, quota, or credential applies because web search
  was removed from scope.

## Acceptance status

Pass for the simplified, no-web first-time CMO journey. The core behavior is
live and reproducible with Launcher `0.4.1` and Builder `1.3.1`. The remaining
items are Guild selection/latency behavior and one non-blocking source cleanup
candidate waiting on a platform publish worker.
