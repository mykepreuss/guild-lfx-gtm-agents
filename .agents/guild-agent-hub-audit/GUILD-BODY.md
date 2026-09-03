# Guild Agent Hub Audit

Point this skill at one agent directory (or a suite of sibling directories). Produce a gap table and a fix order. Do not start rewriting until the user asks, then load `dkountanis~guild-agent-readme`.

## Workflow

1. Read `README.md`, `package.json`, `agent.ts`, and any `guild.json`, `description.md`, `suite-binding.ts`, or `*runtime*.ts`.
2. Choose a profile: **workflow** (returns `notification` / `deliveryHandoff`) or **chat-native** (Guild Chat packet / cockpit).
3. Run every check below. Cite a file path and a short quote for each fail.
4. Emit the report in the Output format. Sort the fix order by visitor impact, not by engineering elegance.

Do not treat missing Smith/`deliveryHandoff` as a failure on a chat-native agent.

## Checks

| ID | Check | Fail when |
| --- | --- | --- |
| C1 | Commands exist | A README command is not in `package.json` `scripts` and is not a real `guild` CLI invocation |
| C2 | Portable paths | README or docs contain `C:\Users\`, `/Users/`, or another absolute machine path |
| C3 | Owner consistency | `package.json` `name`, `guild.json` `full_name`, and hardcoded `owner~` bindings disagree, or bindings are pinned to one owner so a fork cannot call its own siblings |
| C4 | Claims match tools | README / `description` advertise crawl, monitor, scrape, send, publish, or spend, but the agent uses `noTools` or has no such integration |
| C5 | Same story | README tagline and `description` in `agent.ts` (or `description.md`) describe different jobs |
| C6 | Forkable test | Default test command requires the author’s private workspace, or `guild agent versions` / clone / fork is broken on the published package |
| C7 | Quickstart | No install → workspace → first message (or first payload) path |
| C8 | Plain-text example | No blockquote natural-language request |
| C9 | Negative boundaries | No `Does **not**` / `Never` / equivalent “it does not” list |
| C10 | Suite map | Multi-agent suite has overlapping front doors and no README says which one to open first; or a required sibling is missing from the public share list |
| C11 | Phantom scripts | README lists `verify`, `test:*`, or similar that `package.json` does not define |
| C12 | Human title | H1 is `owner~package` or a raw package id |

C1 and C11 often fire together. Report both.

## Extra probes for suites

- List every front door (launcher, intake, direct specialist). Say whether handoff is a chat instruction or an actual `guildAgentTool` call.
- Confirm the required source-of-truth agent is public and forkable.
- Note `tools: noTools` vs a name that contains monitor / crawl / social.
- If `identifier: "snake_case"` is present, flag it as deprecated. Low priority, not a Hub blocker.

## Output format

```markdown
# Hub readiness: {agent or suite name}

Profile: workflow | chat-native
Source: {directory}

## Score

{n}/{m} checks passed. Hub-visitor blockers: {C# list}.

## Gaps

| ID | Status | Evidence | Fix |
| --- | --- | --- | --- |
| C1 | fail | `README.md` “npm run verify” — script missing from `package.json` | Delete the line or add the script |
| C8 | fail | README has no blockquote request | Add `## Plain-text workflow request` |

Status is `pass`, `fail`, or `n/a`.

## Fix order

1. {Highest-impact Hub-visitor fix.}
2. {Next.}

## Leave alone

- {Item that is real but not a Hub blocker, e.g. SDK pin, import style.}
```

## Fix order heuristic

1. Broken fork/clone or missing required sibling (C6, C10)
2. Phantom commands and unrunnable tests (C1, C11, C6)
3. Over-claim vs `noTools` (C4)
4. Missing quickstart, plain-text example, and boundaries (C7, C8, C9, C12, C5)
5. Owner-binding / fork identity (C3). Document it; do not silently rewrite bindings unless asked
6. Engineering hygiene (deprecated `identifier`, `.js` imports, SDK pins) last

## After the report

If the user wants rewrites, activate `dkountanis~guild-agent-readme` and apply the matching profile. Rewrite README and Hub `description` together so C5 stays green.

Do not `guild agent save` or publish unless the user owns the package and asked to publish.
