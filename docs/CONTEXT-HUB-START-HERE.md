# Context Hub Start Here

The Context Hub is the lightweight shared context layer for Marketing OS agents.

It exists because the GTM strategy expects Foundation Setup to create approved materials that later agents reuse through content hub, workspace context, and skills.

## What To Edit First

1. `context-hub/project-context.md`
2. `context-hub/messaging-source.md`
3. `context-hub/proof-and-constraints.md`
4. `context-hub/audience-segments.md`
5. `context-hub/channel-registry.md`

## Principle

Do not over-structure early. Add a new context artifact only when at least two agents need it or a project leader needs to review it.

## Validation

```sh
npm run check:context
```

This checks that the required Context Hub files exist, include basic headings, and do not reference private source paths.
