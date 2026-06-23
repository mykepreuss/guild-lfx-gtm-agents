# Context Hub Start Here

The Context Hub is the lightweight shared context layer for Marketing OS agents.

It exists because Foundation Setup should create approved materials that later agents reuse through Guild Workspace Context, approved context artifacts, and future Skills.

## What To Edit First

1. `context-hub/project-context.md`
2. `context-hub/messaging-source.md`
3. `context-hub/proof-and-constraints.md`
4. `context-hub/audience-segments.md`
5. `context-hub/channel-registry.md`

## Principle

Do not over-structure early. Add a new context artifact only when at least two agents need it or a project leader needs to review it.

## Guild Placement

- Put concise always-needed project context in Guild Workspace Context.
- Put approved project artifacts in the Context Hub.
- Put reusable methods and review rubrics in Guild Skills.
- Put live execution behind explicit integrations, credentials, and approvals.

## Validation

```sh
npm run check:context
```

This checks that required Context Hub files exist, include basic headings, and match the agent catalog references.
