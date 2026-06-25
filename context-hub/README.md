# Guild Marketing OS Context Hub

Status: starter source draft

The Context Hub is the lightweight shared context layer for the Guild Marketing OS agents.

It is not a formal database-backed knowledge graph. It is a small set of approved project artifacts that the Company Context Builder creates or updates, and the other agents reuse as a practical context graph.

## Guild Boundary

- Agent Hub agents own reusable behavior.
- Guild Workspace Context should hold a short always-on project summary.
- Context Hub files hold approved project artifacts.
- Skills can hold reusable methods or approved style guidance.
- Live systems stay behind explicit integrations and approvals.

## Starter Artifacts

- `project-context.md`: project summary, operating mode, entity facts, owner, and missing context.
- `messaging-source.md`: short overview, boilerplate, ICP, positioning, and answer-ready language.
- `brand-kit.md`: visual direction, voice direction, and web presence guidance.
- `audience-segments.md`: personas, segment rules, and suppressions.
- `channel-registry.md`: website, email, social, event, and paid channel status.
- `proof-and-constraints.md`: claims, evidence requirements, AEO/AI-readiness constraints, and no-go claims.
- `dashboard-signals.md`: project leader dashboard signals and approval states.

## Operating Rule

If a fact is not approved here or supplied by the user in the run, agents should ask for it or mark it `TBD`.

## V1 Rule

For Guild-native V1, the Company Context Builder drafts or refreshes these artifacts and returns them for human approval. It must not claim that Guild Workspace Context, live tools, channels, dashboards, or external systems were updated unless an approved tool call confirms that change.
