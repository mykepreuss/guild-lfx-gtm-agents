# Guild Marketing OS Approved Context Artifacts

Status: starter source draft

This folder contains starter source templates for approved context artifacts used by the Guild Marketing OS agents.

It is not the Guild runtime context layer and it is not a formal database-backed knowledge graph. Guild workspace context is the concise Platform Context briefing injected into every agent run. These files are reviewable artifact bodies that the Company Context Builder creates or updates and that other agents use when supplied by the user, workspace, or an approved source system.

## Guild Boundary

- Agent Hub agents own reusable behavior.
- Guild workspace context should hold a short always-on company summary.
- `context-hub/` files hold approved company context artifact templates and source bodies.
- Skills can hold reusable methods or approved style guidance.
- Live systems stay behind explicit integrations and approvals.

## Starter Artifacts

- `company-context.md`: company summary, operating mode, entity facts, owner, and missing context.
- `messaging-source.md`: short overview, boilerplate, ICP, positioning, and answer-ready language.
- `brand-kit.md`: visual direction, voice direction, and web presence guidance.
- `audience-segments.md`: personas, segment rules, and suppressions.
- `channel-registry.md`: website, email, social, event, and paid channel status.
- `proof-and-constraints.md`: claims, evidence requirements, AEO/AI-readiness constraints, and no-go claims.
- `dashboard-signals.md`: project leader dashboard signals and approval states.

## What To Edit First

When setting up a new project, update the smallest useful set of artifacts:

1. `company-context.md`
2. `messaging-source.md`
3. `proof-and-constraints.md`
4. `audience-segments.md`
5. `channel-registry.md`

Add a new context artifact only when at least two agents need it or a project leader needs to review it.

## Intake Questions

Use these questions when the Company Context Builder starts a new project:

1. Company name:
2. One-sentence project description:
3. Primary project leader:
4. Primary audiences:
5. Top three goals this quarter:
6. Approved short overview:
7. Approved boilerplate:
8. Brand or trademark constraints:
9. Channels in scope:
10. Tools already connected:
11. Claims that require approval:
12. Dashboard signals the project leader wants first:

Leave unknowns as `TBD`. The Company Context Builder should also return a concise Guild workspace context draft, approval decisions, recommended next agents, and live actions that are explicitly not approved yet.

## Operating Rule

If a fact is not approved here or supplied by the user in the run, agents should ask for it or mark it `TBD`.

## V1 Rule

For Guild-native V1, the Company Context Builder drafts or refreshes these artifacts and returns them for human approval. It must not claim that Guild workspace context, live tools, channels, dashboards, or external systems were updated unless an approved tool call confirms that change.

## Validation

```sh
npm run check:context
```

This checks that required approved context artifact files exist, include basic headings, and match the agent catalog references.
