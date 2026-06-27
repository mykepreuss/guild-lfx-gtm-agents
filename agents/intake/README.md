# Guild Marketing OS Intake

Guild package: `guild-marketing-os-intake`
Package owner: `michaelpreuss`

## Purpose

Provides the chat-native default entrypoint for Guild Marketing OS. It uses a deterministic coded response for fast first-run triage, captures minimum company setup context, and routes the user to the right specialist agent without inventing facts or implying live execution.

The default no-credential path is `Use my sources`. Intake asks the user to paste a compact source packet or uploaded PDF text, then routes that material to Company Context Builder for approval and normalization.

When the user explicitly asks for public-source research with a short command such as `Research Webflow`, Intake uses the Guild Firecrawl integration to search/scrape public pages and returns source URLs plus snippets for approval. Researched facts remain unapproved until the user accepts or edits them. If Firecrawl credentials are unavailable, Intake tells the user to continue with `Use my sources` instead of exposing credential-tool instructions.

For first-run setup, the response should give clear next replies such as `Use my sources` and optional `Research Webflow`. Users should not have to infer or type a long prompt to trigger either path.

## V1 Boundary

Review-only. This agent does not call other agents, publish, install, schedule, activate credentials, change spend, or modify external systems. Public-source research is allowed only on explicit request and is blocked clearly if the Firecrawl tool or credentials are unavailable.

## Test

From this package directory:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```
