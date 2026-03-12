---
name: data-api-builder-config
description: Create and refine dab-config.json for Data API Builder, including data-source, runtime, entities, permissions, relationships, and MCP settings.
license: MIT
---

# Data API Builder Configuration

Use this skill for **editing `dab-config.json` directly**.

## When to use

- Create or fix `dab-config.json`
- Configure runtime (REST/GraphQL/MCP/auth/CORS)
- Add entity permissions, mappings, and relationships
- Troubleshoot validation/configuration errors

## Fast workflow

1. Start from a sample config asset.
2. Set `data-source` and `runtime`.
3. Add or refine `entities`.
4. Validate with `dab validate`.
5. Start runtime and verify endpoint behavior.

If the user asks to automate edits via commands instead of hand-editing JSON, switch to the `data-api-builder-cli` skill.

## Bundled sample configs

Use these ready-to-copy assets:

- Minimal config: [assets/minimal.dab-config.json](./assets/minimal.dab-config.json)
- Auto-config sample: [assets/auto-config.dab-config.json](./assets/auto-config.dab-config.json)
- Relationships sample: [assets/relationships.dab-config.json](./assets/relationships.dab-config.json)
- Multi-data-source samples:
  - [assets/multi-config/top-level.dab-config.json](./assets/multi-config/top-level.dab-config.json)
  - [assets/multi-config/dab-config-sql.json](./assets/multi-config/dab-config-sql.json)
  - [assets/multi-config/dab-config-cosmos.json](./assets/multi-config/dab-config-cosmos.json)

## Minimal valid config

```json
{
  "$schema": "https://dataapibuilder.azureedge.net/schemas/latest/dab.draft.schema.json",
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('DATABASE_CONNECTION_STRING')"
  },
  "runtime": {
    "rest": { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql" },
    "mcp": { "enabled": true, "path": "/mcp" },
    "host": { "mode": "development" }
  },
  "entities": {}
}
```

## Core sections to get right

- `data-source`: DB type + connection string (`@env(...)`)
- `runtime`: global endpoints/auth/CORS/mode
- `entities`: exposed objects and security model

## Reference playbooks

Use these for deep details instead of bloating this file:

- Auto-config/autoentities details: [references/auto-config.md](./references/auto-config.md)
- Entity rules: [references/entity-and-relationship-rules.md](./references/entity-and-relationship-rules.md)
- Relationship rules (comprehensive): [references/relationships.md](./references/relationships.md)
- Multi-file config constraints: [references/multi-file-rules.md](./references/multi-file-rules.md)
- Runtime + validation loop: [references/runtime-and-validation.md](./references/runtime-and-validation.md)
- Syntax gotchas + startup failures: [references/troubleshooting.md](./references/troubleshooting.md)

## Quick correctness checks

- Keep `$schema` present.
- Keep secrets out of config (`@env(...)` only).
- Ensure each exposed entity has intentional permissions.
- Validate after every meaningful change.
- For Azure deployment, bake config into image (no volume/file share pattern).

## Consistency rules

1. Prefer minimal changes per request.
2. Keep runtime surface area intentionally small.
3. Use references for advanced troubleshooting and edge cases.
4. Keep samples and references aligned when behavior changes.

## References

- https://learn.microsoft.com/azure/data-api-builder/configuration/
- https://learn.microsoft.com/azure/data-api-builder/configuration/entities
- https://learn.microsoft.com/azure/data-api-builder/configuration/runtime
