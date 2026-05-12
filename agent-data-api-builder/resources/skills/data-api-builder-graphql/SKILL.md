---
name: data-api-builder-graphql
description: Use and customize the Data API Builder GraphQL surface, including auto-generated queries, mutations, filters, pagination, and schema naming.
license: MIT
---

# Data API Builder GraphQL

## Use when

- Querying or mutating DAB entities via GraphQL.
- Customizing singular/plural type names or disabling GraphQL per entity.
- Composing nested reads across related entities in a single request.

## Workflow

1. Confirm `runtime.graphql.enabled` is true and note `runtime.graphql.path` (default `/graphql`).
2. For each entity set `graphql.enabled` and optional `graphql.type.singular` / `graphql.type.plural`.
3. Use the auto-generated singular query (`book_by_pk`) and plural query (`books`) with `filter`, `orderBy`, `first`, `after`.
4. Use `create<Entity>`, `update<Entity>`, `delete<Entity>` mutations; multi-create where supported.
5. Inspect schema via introspection or the built-in Banana Cake Pop UI in dev.

## Guardrails

- Disable GraphQL on entities you do not want exposed; permissions alone is not discoverability control.
- Set explicit `singular`/`plural` names to avoid ambiguous pluralization.
- Bound `first` and rely on `endCursor` / `hasNextPage` instead of offset hacks.

## Example

```graphql
query {
  books(first: 10, filter: { year: { gt: 2020 } }, orderBy: { title: ASC }) {
    items { id title }
    endCursor
    hasNextPage
  }
}
```

## Related skills

- `data-api-builder-config`
- `data-api-builder-rest`
- `data-api-builder-relationships`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/graphql/
