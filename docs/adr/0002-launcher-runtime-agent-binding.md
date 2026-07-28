# ADR 0002: Public Launcher agent binding

- Status: accepted for the private alpha; public decision blocked
- Date: 2026-07-28
- SDK evaluated: `@guildai/agents-sdk` 0.4.2

## Context

The Marketing OS Launcher must call only Company Context Builder and the seven
Marketing OS specialists installed in the current workspace. It must never
expose itself, an unrelated customer agent, or an arbitrary agent named in user
input.

The private-alpha Launcher declares eight `guildAgentTool` dependencies with
fixed qualified package calls. That is deterministic and passed the normal-Chat
browser acceptance suite. It is appropriate for the current private publisher
and workspace, but it does not satisfy the plan's provider-neutral public
installation requirement.

SDK 0.4.2 exposes `withWorkspaceAgentTools` and the `llmAgent`
`useWorkspaceAgents` option. The package source is the documented ground truth.
The helper:

1. reads every agent installed in the task workspace;
2. adds every discovered agent to the supplied mutable toolset;
3. derives a tool name from the installed package name; and
4. binds the tool to that package and installed version.

It does not accept an allowlist. `llmAgent` enables this behavior by default.
The helper mutates the toolset captured by the agent definition, so public V1
would also need a documented runtime isolation guarantee before relying on
mutation for tenant-sensitive per-task binding.

The coded, automatically managed Launcher cannot add a new task-local tool
after compilation. Switching the current Launcher to the SDK helper would
therefore either expose unrelated workspace agents or require an unproven
state-model rewrite.

## Decision

Keep the browser-proven private Launcher on its explicit eight-agent static
allowlist. Do not replace it with `useWorkspaceAgents` or the unfiltered
`withWorkspaceAgentTools` helper.

Public delegation remains blocked until one of these paths passes a targeted
live proof:

1. Guild provides a coded-agent API that binds installed agent package and
   version per task, accepts an explicit allowlist, excludes the caller, and
   does not mutate cross-task shared state; or
2. a self-managed coded Launcher implementation demonstrates the same
   guarantees under concurrent sessions and returns complete child output with
   honest failure behavior.

The proof must cover two organizations concurrently, a same-named unrelated
agent, attempted self-delegation, missing and suspended suite agents, stale
installed versions, specialist failure, malformed output, and format-repair
failure.

If neither path is reliable, public V1 will use the already-approved
non-delegating Marketing OS Guide fallback. The Guide may classify the
workflow, inspect suite status, prepare a complete handoff prompt, and direct
the user to select or `@mention` the named specialist. It must not claim that a
specialist ran or that cockpit state was persisted.

## Consequences

- The working private alpha is not destabilized while the durable service is
  being built.
- Arbitrary customer workspace agents remain unreachable from the Launcher.
- A public package cannot be represented as fully delegated until the binding
  proof passes.
- The public Guide fallback remains a valid release path for routing UX, but
  durable cockpit delegation still requires the task-local allowlisted API or
  an equivalent proven implementation.

## Evidence

- Installed SDK implementation:
  `agents/launcher/node_modules/@guildai/agents-sdk/dist/services/guild.js`
- Installed SDK LLM wiring:
  `agents/launcher/node_modules/@guildai/agents-sdk/dist/llm-agent.js`
- Private browser acceptance:
  `docs/validation/2026-07-28-browser-ux.md`
- Guild SDK documentation:
  <https://docs.guild.ai/packages/agents-sdk>
