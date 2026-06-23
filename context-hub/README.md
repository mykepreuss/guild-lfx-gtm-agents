# Marketing OS Context Hub

Status: starter fixture

The Context Hub is the lightweight shared context layer for the Marketing OS agents.

It is not a formal knowledge graph. It is a small set of approved project artifacts that the Foundation Setup Agent creates or updates, and the other agents reuse.

## Guild Boundary

- Agent Hub agents own reusable behavior.
- Guild Workspace Context should hold a short always-on project summary.
- Context Hub files hold approved project artifacts.
- Skills can hold reusable methods or approved style guidance.
- Live systems stay behind explicit integrations and approvals.

## Starter Artifacts

- `project-context.md`: project summary, operating mode, owner, and missing context.
- `messaging-source.md`: short overview, boilerplate, ICP, and positioning.
- `brand-kit.md`: visual and voice direction.
- `audience-segments.md`: personas, segment rules, and suppressions.
- `channel-registry.md`: website, email, social, event, and paid channel status.
- `proof-and-constraints.md`: claims, evidence requirements, and no-go claims.
- `dashboard-signals.md`: project leader dashboard signals and approval states.

## Operating Rule

If a fact is not approved here or supplied by the user in the run, agents should ask for it or mark it `TBD`.

## Phase 1 Rule

For Guild-native Phase 1, Foundation Setup drafts or refreshes these artifacts and returns them for human approval. It must not claim that Guild Workspace Context, live tools, channels, dashboards, or external systems were updated unless an approved tool call confirms that change.
