# Marketing OS Launcher

Status: non-delegating Guide fallback private alpha

The Launcher is the draft-only front door for a dedicated Guild Marketing OS workspace.

It:

- deterministically routes clear requests across Company Context Builder and the seven specialists;
- uses an LLM only when a request is genuinely ambiguous, accepting a strict route enum and one classifier format repair;
- reads the live session workspace and published compiled context before declaring context missing;
- discovers installed workspace agents but exposes only the eight exact suite packages as callable tools;
- blocks itself, unrelated agents, recursive delegation, publishing, scheduling, spend, CRM mutation, credential setup, legal approval, and other external execution;
- prepares a complete specialist handoff prompt and directs the user to select
  or `@mention` that specialist;
- validates required headings, evidence mode, and the V1 draft-only safety envelope;
- permits one format-only repair while retaining both complete attempts in its audit state;
- records route, context revision, invoked package/version ID, attempts, errors, status, and next handoff in session state.

The allowlisted same-session delegation path remains implemented but disabled.
In live evidence, a Messaging child completed while the coded Launcher root
remained dispatched, so the result was not reliably returned to the originating
chat. The delivery plan requires this Guide fallback under that condition.

The durable PostgreSQL cockpit adapter and delegated Guild tenant authorization
are also release gates. Until those are connected, Launcher session state is
private-alpha evidence rather than the public cross-session system of record.
