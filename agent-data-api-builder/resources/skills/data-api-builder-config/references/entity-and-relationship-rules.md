# Entity rules

## Entity essentials

Each entity should define:

- `source.object`
- `source.type` (`table`, `view`, `stored-procedure`)
- `permissions` (at least one role)

Optional sections:

- `mappings`
- `relationships`
- `rest`, `graphql`, `mcp`

## Source-type constraints

- Views require `key-fields`.
- Stored procedures require `execute` action permissions.
- Row policies use OData-style expressions (`eq`, `and`, `@item`, `@claims`).

## Relationship guidance moved

For comprehensive relationship coverage (cardinality patterns, many-to-many modes, reciprocal relationships, limitations, and troubleshooting), use:

- [relationships.md](./relationships.md)
