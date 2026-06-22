# Local Agent Lab

Local-only workspace for the GTM Marketing OS agent suite.

This is not a remote agent package and intentionally has no platform lifecycle config. It lets us develop the nine-agent deliverable locally before any remote agent records are created.

## Shape

- Nine independent Agent Hub agent definitions.
- One orchestrator/router that can choose among them.
- Shared fixture context so the agents feel like one Marketing OS.
- Substantive fixture-backed outputs for review.
- Local smoke tests and demo packet generation.

## Commands

```sh
npm run verify
npm run generate:demos
```

`npm run verify` runs local-only tests and checks that demo packets are current.

`npm run generate:demos` writes demo packets to:

`../../delivery/local-demo-packets/`

## Non-Goals

- No `guild agent init`.
- No `guild agent save`.
- No publishing.
- No workspace install.
- No live SaaS execution.

After scope is approved, each definition can be copied into real agent packages.
