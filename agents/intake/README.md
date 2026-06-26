# Guild Marketing OS Intake

Guild package: `guild-marketing-os-intake`
Package owner: `michaelpreuss`

## Purpose

Provides the chat-native default entrypoint for Guild Marketing OS. It triages user requests, captures minimum company setup context, and routes the user to the right specialist agent without inventing facts or implying live execution.

## V1 Boundary

Review-only. This agent does not call other agents, crawl sources, publish, install, schedule, activate credentials, change spend, or modify external systems.

## Test

From this package directory:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```
