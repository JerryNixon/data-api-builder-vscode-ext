---
name: data-api-builder-cli
description: Create, update, validate, and run Data API Builder projects from the terminal. Covers every dab subcommand.
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

## Commands

- `dab init` — scaffold `dab-config.json`; flags include `--database-type`, `--connection-string`, `--host-mode`, `--cors-origin`, `--auth.provider`, `--auth.audience`, `--auth.issuer`, `--rest.path`, `--graphql.path`.
- `dab add <entity>` — register a table, view, or stored procedure; flags include `--source`, `--source.type`, `--source.key-fields`, `--source.params`, `--permissions`, `--rest`, `--graphql`, `--fields.include`, `--fields.exclude`, `--policy-database`, `--cache.enabled`, `--cache.ttl`.
- `dab update <entity>` — modify an existing entity; same surface as `add` plus `--relationship`, `--cardinality`, `--target.entity`, `--linking.object`, `--linking.source.fields`, `--linking.target.fields`.
- `dab configure` — change runtime-level settings; flags include `--data-source.database-type`, `--data-source.connection-string`, `--azure-key-vault.endpoint`, `--runtime.rest.enabled`, `--runtime.graphql.enabled`, `--runtime.mcp.enabled`, `--runtime.telemetry.file.enabled`, `--runtime.telemetry.azure-log-analytics.enabled`.
- `dab add-telemetry` — wire OpenTelemetry / Application Insights; flags `--otel-enabled`, `--otel-endpoint`, `--app-insights-enabled`, `--app-insights-connection-string`.
- `dab auto-config` — generate entities from the live schema; flags `--patterns-include`, `--patterns-exclude`, `--template.rest.enabled`, `--template.graphql.enabled`, `--permissions`.
- `dab auto-config-simulate` — preview what `auto-config` would produce; supports `-o/--output` for CSV.
- `dab export` — emit GraphQL schema or sampled REST/GraphQL traffic; supports sampling modes.
- `dab validate` — multi-stage check of `dab-config.json` (schema, connection, entities, permissions).
- `dab start` — launch the runtime; flags include `--config`, `--LogLevel`, `--no-https-redirect`.

## Guardrails

- Use `@env('VAR')` for secrets; never inline connection strings.
- Use `execute` action for stored procedures.
- Require `--source.key-fields` for views.
- Run `dab validate` before `dab start` in CI.

## Related skills

- `data-api-builder-config`
- `data-api-builder-auto-config`
- `data-api-builder-auth`
- `data-api-builder-mcp`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/command-line/
