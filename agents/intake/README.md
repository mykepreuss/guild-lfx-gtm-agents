# Guild Marketing OS Intake

Guild package: `guild-marketing-os-intake`
Package owner: `michaelpreuss`

## Purpose

Provides the chat-native default entrypoint for Guild Marketing OS. It uses a deterministic coded response for fast first-run triage, captures minimum company setup context, and routes the user to the right specialist agent without inventing facts or implying live execution.

When the user explicitly asks for public-source research, Intake uses the Guild Firecrawl integration to search/scrape public pages and returns source URLs plus snippets for approval. Researched facts remain unapproved until the user accepts or edits them.

## V1 Boundary

Review-only. This agent does not call other agents, publish, install, schedule, activate credentials, change spend, or modify external systems. Public-source research is allowed only on explicit request and is blocked clearly if the Firecrawl tool or credentials are unavailable.

## Test

From this package directory:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```
