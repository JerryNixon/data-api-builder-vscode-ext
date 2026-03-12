# Auto-config essentials

Use `dab auto-config` to generate entities at startup from catalog introspection.

## Quick start

```bash
dab auto-config publicTables \
  -c dab-config.json \
  --patterns.include "dbo.%" \
  --patterns.name "{object}" \
  --permissions anonymous:read

dab start -c dab-config.json
```

## What matters most

- Tables without primary keys are skipped.
- Internal exclusion filters remove many system/special objects by default.
- Entity name collisions with existing `entities` fail startup.

## Patterns and naming

- `patterns.include` / `patterns.exclude` use T-SQL `LIKE` on `schema.object`.
- `patterns.name` supports `{schema}` and `{object}`.
- Use `{schema}_{object}` if collisions are likely.

## Template and permissions

- `template` sets defaults for generated entities (`rest`, `graphql`, `mcp`, `cache`, `health`).
- `permissions` are applied to each generated entity and are security-critical.

## Internal exclusions (built-in)

You usually should not repeat these in `patterns.exclude`.

1. Microsoft-shipped objects (`sys.objects.is_ms_shipped = 1`)
2. `sys` and `INFORMATION_SCHEMA` schemas
3. Migration/metadata names: `__EFMigrationsHistory`, `__MigrationHistory`, `__FlywayHistory`, `sysdiagrams`
4. Name patterns: `service_broker_%`, `queue_messages_%`, `MSmerge_%`, `MSreplication_%`, `FileTableUpdates$%`, `graph_%`
5. Feature flags: CDC, temporal, FileTable, memory-optimized tables

## Troubleshooting

- No generated entities: check pattern scope, PK eligibility, and exclusion effects.
- Startup collision: change `patterns.name`.
- Unsupported object/type: review table/object metadata and simplify scope.
