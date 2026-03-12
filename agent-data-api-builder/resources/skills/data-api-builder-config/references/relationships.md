# Relationships in Data API Builder

This guide is intentionally relationship-only so the rules are easy to find during config work.

## What relationships are for

- Relationships are used for GraphQL navigation between entities.
- They are not used to traverse related data in REST endpoints.
- DAB relationship names are API-shaping decisions: choose names for query readability.

## Required shape

Define under `entities.<entity>.relationships.<relationship-name>`:

- `cardinality`: `one` or `many` (required)
- `target.entity`: target entity name (required)

Optional (or required by scenario):

- `source.fields`
- `target.fields`
- `linking.object`
- `linking.source.fields`
- `linking.target.fields`

`relationship-name` must be unique within the source entity.

## Cardinality patterns

### One-to-many

- Source side uses `cardinality: many`.
- Typical mapping: source PK -> target FK.

### Many-to-one

- Source side uses `cardinality: one`.
- Typical mapping: source FK -> target PK.

### One-to-one

- Use `cardinality: one` and explicit field mapping.
- Keep mapping fields unique/consistent in underlying schema.

## Many-to-many patterns

### Linking object pattern (hidden join object)

Use when you want direct GraphQL traversal between two main entities while keeping join object out of public GraphQL surface.

Required pieces:

- `linking.object`
- `linking.source.fields`
- `linking.target.fields`

You may also define `source.fields` + `target.fields` explicitly when needed.

### Explicit join-entity pattern

Expose the join object as an entity and define two one-side relationships from it.

Use this when the join object has first-class business meaning (metadata columns, lifecycle, auditing semantics).

## Reciprocal relationships

If you want navigation in both directions, define a second relationship on the target entity with reversed field intent.

Example intent:

- `Book -> authors`
- `Author -> books`

This enables symmetric traversal in GraphQL queries.

## Inference vs explicit mapping

- DAB can infer one-to-many / many-to-one relationships when the database exposes foreign keys.
- That FK metadata is used during metadata population to wire relationship navigation in GraphQL and the metadata model.
- Prefer explicit `source.fields`/`target.fields` when troubleshooting, using nonstandard names, or working with composite keys.
- Arrays support composite key mappings.

### What FK inference covers

- Relationship linkage between entities (especially one-to-many and many-to-one).
- Navigation-style relationship shape in GraphQL/metadata.

### What FK inference does **not** cover

- Custom relationship names (you define these in config).
- Manual mappings for nonstandard naming/shape requirements.
- Relationships where no FK exists.
- Creation of new database columns/fields (columns come from table/view metadata, not FK inference).

In short: FK metadata helps DAB infer **relationships between entities**, not invent schema fields.

## Constraints and limitations (important)

- Relationships must target entities available in the same config file context.
- Multi-file config cannot define cross-file relationship targets.
- One-hop navigation is supported; deep/cyclic traversal is not optimized.
- REST does not support relationship traversal.
- Views do not support relationships.

## Practical checklist

1. Confirm both entities exist and are spelled exactly as configured.
2. Choose clear relationship names (these appear in GraphQL queries).
3. Set correct cardinality from source-entity perspective.
4. Add explicit field mapping if inference is unclear.
5. For many-to-many, ensure linking object exists and linking fields are correct.
6. Define reciprocal relationship if bidirectional traversal is needed.
7. Validate config and run a minimal GraphQL nested query.

## Troubleshooting quick hits

- Empty nested collection: cardinality or field mapping likely wrong.
- Startup/config error: target entity missing, misspelled, or out-of-scope for config file.
- Unexpected schema shape: relationship name or GraphQL type naming mismatch.
- Join traversal failing: check `linking.object` and both linking field lists.

## References

- https://learn.microsoft.com/en-us/azure/data-api-builder/concept/database/relationships
- https://learn.microsoft.com/en-us/azure/data-api-builder/configuration/entities#relationships
- https://learn.microsoft.com/en-us/azure/data-api-builder/concept/database/views
- https://devblogs.microsoft.com/azure-sql/data-api-builder-relationships/
