---
name: data-api-builder-cli
description: Create or update Data API Builder configuration via CLI commands. Use for init/add/update/configure/validate/start workflows.
license: MIT
---

# Data API Builder CLI

## Use when

- You want command-based config changes.
- You need repeatable terminal/automation workflows.

## Canonical flow

1. `dab init`
2. `dab add` / `dab update` / `dab configure`
3. `dab validate`
4. `dab start`

## Guardrails

- Use `@env('VAR')` for secrets.
- Use `execute` action for stored procedures.
- Require `--source.key-fields` for views.

## Related skills

- `data-api-builder-config`
- `data-api-builder-mcp`
- `data-api-builder-auth`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/command-line/
