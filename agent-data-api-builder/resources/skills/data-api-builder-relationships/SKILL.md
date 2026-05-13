---
name: data-api-builder-relationships
description: Model GraphQL relationships between Data API Builder entities, including one-to-many, many-to-one, and many-to-many via linking objects.
license: MIT
---

# Data API Builder Relationships

## Use when

- Enabling nested GraphQL traversal between two entities.
- Modeling many-to-many through a join table not exposed as its own entity.
- Defining reciprocal navigation in both directions.

## Workflow

1. Identify cardinality: `one` (to-one) or `many` (to-many).
2. Add a `relationships` block on the source entity with `target.entity` and `cardinality`.
3. Provide `source.fields` and `target.fields` when DAB cannot infer from a foreign key.
4. For many-to-many, add `linking.object` plus `linking.source.fields` and `linking.target.fields`.
5. Define a reciprocal relationship on the target entity if symmetric traversal is needed.

## Guardrails

- Relationships are GraphQL-only; REST does not traverse them.
- Only one-hop navigation is supported — do not design schemas that assume deep auto-joins.
- Both entities must live in the same config file.
- Self-referencing uses the same shape: point `target.entity` back to the source entity and provide explicit fields.
- Prefer explicit `source.fields`/`target.fields` over FK inference when schemas evolve.

## Example

```json
"Book": {
  "source": "dbo.books",
  "relationships": {
    "authors": {
      "cardinality": "many",
      "target.entity": "Author",
      "source.fields": [ "id" ],
      "target.fields": [ "id" ],
      "linking.object": "dbo.books_authors",
      "linking.source.fields": [ "book_id" ],
      "linking.target.fields": [ "author_id" ]
    }
  }
}
```

## Related skills

- `data-api-builder-graphql`
- `data-api-builder-config`
- `data-api-builder-cli`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/graphql/relationships
