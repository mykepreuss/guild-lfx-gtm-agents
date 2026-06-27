# Guild Marketing OS Intake

Guild package: `guild-marketing-os-intake`
Package owner: `michaelpreuss`

## Purpose

Provides the chat-native default entrypoint for Guild Marketing OS. It uses a deterministic coded response for fast first-run triage, captures minimum company setup context, and routes the user to the right specialist agent without inventing facts or implying live execution.

The default no-credential path is `Use my sources`. Intake accepts either a compact fielded source packet or long pasted/uploaded source text, then asks the user to approve or edit that material before it is used by Company Context Builder.

When the user explicitly asks for public-source research with a short command such as `Research Webflow`, Intake uses the Guild Firecrawl integration to search/scrape public pages and returns source URLs plus snippets for approval. Researched facts remain unapproved until the user accepts or edits them. If Firecrawl credentials are unavailable, Intake tells the user to continue with `Use my sources` instead of exposing credential-tool instructions.

For first-run setup, Intake sends a short visible chat message with the next replies before the run completes. The collapsed run output is only a details packet. The visible chooser should include clear replies such as `Use my sources`, `Research Webflow`, and source approval commands; users should not need to expand a `Done` row or read JSON to decide what to type next.

When a blank-workspace user asks for a specialist deliverable, Intake should usually start with Company Context Builder and preserve the requested specialist as a downstream handoff. Specialist agents should run only after company context is approved or when the user explicitly supplies approved context.

Approval is chat-readable, not hidden state. Intake can suggest replies such as `Approve source packet`, `Edit source packet: ...`, or `Approve researched facts: ...`, but it does not save durable approved context or call another agent automatically. For a reliable handoff, approved facts should be carried into Company Context Builder, an approved context artifact, or a Guild session message to the selected specialist. If the user pastes long source material after `Use my sources:`, Intake treats it as received source material and must not ask the user to paste the template again.

## V1 Boundary

Review-only. This agent does not call other agents, publish, install, schedule, activate credentials, change spend, or modify external systems. Public-source research is allowed only on explicit request and is blocked clearly if the Firecrawl tool or credentials are unavailable.

## Test

From this package directory:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```
