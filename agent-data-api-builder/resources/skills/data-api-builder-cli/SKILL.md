---
name: data-api-builder-cli
description: Use Data API Builder CLI to initialize, add/update entities, validate config, and run DAB. Use when asked to create or modify dab-config.json via CLI commands.
license: MIT
---

# Data API Builder CLI

Use this skill for **command-driven DAB setup and changes**. Keep flows short: init → add/update → validate → start.

## Companion config assets

Pair CLI commands with these examples from the config skill:

- [../data-api-builder-config/assets/minimal.dab-config.json](../data-api-builder-config/assets/minimal.dab-config.json)
- [../data-api-builder-config/assets/auto-config.dab-config.json](../data-api-builder-config/assets/auto-config.dab-config.json)
- [../data-api-builder-config/assets/relationships.dab-config.json](../data-api-builder-config/assets/relationships.dab-config.json)
- [../data-api-builder-config/assets/multi-config/top-level.dab-config.json](../data-api-builder-config/assets/multi-config/top-level.dab-config.json)

Auto-config note: CLI terminology uses **auto-config** while runtime JSON uses the `autoentities` section name.

## When to use

- Create a new `dab-config.json`
- Add or modify entities from tables/views/stored procedures
- Change runtime settings (REST/GraphQL/MCP/auth/CORS)
- Validate and run DAB locally

## Workflow

1. Initialize config: `dab init`
2. Add entities: `dab add`
3. Adjust entities/runtime: `dab update` / `dab configure`
4. Validate: `dab validate`
5. Run: `dab start`

Always recommend env vars for secrets with `@env('VAR')`.

## Command quick reference

### `dab init`
Create/overwrite config.

```bash
dab init --database-type mssql --connection-string "@env('DATABASE_CONNECTION_STRING')"
```

### `dab add`
Add table/view/stored procedure entity.

```bash
# table
dab add Product --source dbo.Products --permissions "anonymous:read"

# view (requires key fields)
dab add ProductSummary --source dbo.vw_ProductSummary --source.type view --source.key-fields "ProductId" --permissions "anonymous:read"

# stored procedure
dab add GetProducts --source dbo.usp_GetProducts --source.type stored-procedure --permissions "authenticated:execute" --graphql.operation query
```

### `dab update`
Update existing entity.

```bash
# add role
dab update Product --permissions "admin:*"

# relationship
dab update Category --relationship "products" --cardinality many --target.entity Product --relationship.fields "CategoryId:CategoryId"

# field mapping (replaces existing mappings)
dab update Product --map "ProductName:name,UnitPrice:price"
```

### `dab configure`
Change runtime/global settings.

```bash
dab configure --runtime.mcp.enabled true --runtime.mcp.path "/mcp"
dab configure --cors-origin "https://app.example.com"
```

### `dab validate`
Validate config before running.

```bash
dab validate --config dab-config.json
```

### `dab start`
Start DAB runtime.

```bash
dab start --config dab-config.json
```

## Decision points

- **Entity change?** use `dab add`/`dab update`
- **Runtime/global change?** use `dab configure`
- **View source?** require `--source.key-fields`
- **Stored procedure?** use `execute` permission (not `read`)

## Troubleshooting (syntax gotchas)

### View entity missing key fields

```bash
# WRONG
dab add ProductSummary --source dbo.vw_ProductSummary --source.type view --permissions "anonymous:read"

# CORRECT
dab add ProductSummary --source dbo.vw_ProductSummary --source.type view --source.key-fields "ProductId" --permissions "anonymous:read"
```

### Stored procedure permission type

```bash
# WRONG
dab add RunReport --source dbo.usp_RunReport --source.type stored-procedure --permissions "authenticated:read"

# CORRECT
dab add RunReport --source dbo.usp_RunReport --source.type stored-procedure --permissions "authenticated:execute"
```

### Policy syntax must be OData, not SQL

```bash
# WRONG
dab update Order --policy-database "Status = 'Active'"

# CORRECT
dab update Order --policy-database "@item.Status eq 'Active'"
```

### `--map` replaces all mappings

```bash
# Include all desired mappings every time
dab update Product --map "ProductName:name,UnitPrice:price,UnitsInStock:stock"
```

## Consistency rules

1. Use `@env(...)` for secrets.
2. Run `dab validate` before `dab start`.
3. Keep `.gitignore` entries for `.env`, `**\bin`, `**\obj`.
4. For Azure, use custom image with embedded `dab-config.json` (no Azure Files mount).

## Completion checks

- Config exists and validates
- Entities and permissions match user intent
- Runtime endpoints enabled as requested
- DAB starts and `/health` returns success

## References

- https://learn.microsoft.com/azure/data-api-builder/command-line/
- https://learn.microsoft.com/azure/data-api-builder/command-line/dab-init
- https://learn.microsoft.com/azure/data-api-builder/command-line/dab-add
- https://learn.microsoft.com/azure/data-api-builder/command-line/dab-update
