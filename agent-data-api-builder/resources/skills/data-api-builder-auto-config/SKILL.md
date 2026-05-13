---
name: data-api-builder-auto-config
description: Use Data API Builder autoentities to discover and expose database objects by pattern instead of hand-listing every entity.
license: MIT
---

# Data API Builder Auto Config

## Use when

- A database has many tables/views and listing each entity by hand is tedious.
- New tables matching a naming convention should appear automatically on DAB restart.
- Bootstrapping a config for a predictable schema (e.g. all of `dbo.%`).

## Workflow

1. Add an `autoentities` block with a named definition (e.g. `"public-tables"`).
2. Set `patterns.include` (T-SQL `LIKE` syntax against `schema.object`) and optional `patterns.exclude`.
3. Optionally set `patterns.name` to template entity names (e.g. `"{schema}_{object}"`).
4. Provide a shared `template` (rest/graphql/mcp/health/cache) and `permissions` for matched objects.
5. Restart DAB; matched objects are re-evaluated and exposed each startup.
6. Use `dab auto-config-simulate --config <file>` to preview matches; add `--output <csv>` for review.

## Guardrails

- MSSQL only — autoentities are not supported on other providers today.
- Shared permissions apply to every matched object; never use `anonymous:*` in production.
- Always exclude staging, migration, and internal tables (e.g. `%_staging`, `dbo.__migration%`).
- Prefer explicit `entities` for sensitive objects that need bespoke rules; they take precedence over same-name autoentities matches.

## Example

```json
"autoentities": {
  "public-tables": {
    "patterns": { "include": [ "dbo.%" ], "exclude": [ "dbo.__migration%" ] },
    "template": { "rest": { "enabled": true }, "graphql": { "enabled": true } },
    "permissions": [ { "role": "authenticated", "actions": [ { "action": "read" } ] } ]
  }
}
```

## Related skills

- `data-api-builder-config`
- `data-api-builder-auth`
- `data-api-builder-cli`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/config/auto-config
