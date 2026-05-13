---
name: data-api-builder-cli
description: Create, update, validate, and run Data API Builder projects from the terminal. Covers every dab subcommand.
license: MIT
---

# Data API Builder CLI

## Use when

- You want command-based config changes.
- You need repeatable terminal/automation workflows.

## Workflow

1. `dab init`
2. `dab add` / `dab update` / `dab configure`
3. `dab validate`
4. `dab start`

## Commands

- `dab init` — scaffold `dab-config.json`; flags include `--database-type`, `--connection-string`, `--host-mode`, `--cors-origin`, `--auth.provider`, `--auth.audience`, `--auth.issuer`, `--rest.enabled`, `--rest.path`, `--graphql.enabled`, `--graphql.path`, `--mcp.enabled`.
- `dab add <entity>` — register a table, view, or stored procedure; flags include `--source`, `--source.type`, `--source.key-fields`, `--source.params`, `--permissions`, `--rest`, `--graphql`, `--fields.include`, `--fields.exclude`, `--policy-database`, `--cache.enabled`, `--cache.ttl-seconds`, `--cache.level`.
- `dab update <entity>` — modify an existing entity; same surface as `add` plus `--relationship`, `--cardinality`, `--target.entity`, `--linking.object`, `--linking.source.fields`, `--linking.target.fields`.
- `dab configure` — change non-entity settings; flags include `--data-source.database-type`, `--data-source.connection-string`, `--data-source-files`, `--azure-key-vault.endpoint`, `--runtime.rest.enabled`, `--runtime.graphql.enabled`, `--runtime.mcp.enabled`, `--runtime.pagination.default-page-size`, `--show-effective-permissions`.
- `dab add-telemetry` — wire OpenTelemetry / Application Insights; flags `--otel-enabled`, `--otel-endpoint`, `--app-insights-enabled`, `--app-insights-connection-string`.
- `dab auto-config <definition>` — create/update an `autoentities` definition; flags `--patterns.include`, `--patterns.exclude`, `--patterns.name`, `--template.rest.enabled`, `--template.graphql.enabled`, `--template.mcp.dml-tools`, `--template.cache.ttl-seconds`, `--permissions`.
- `dab auto-config-simulate` — preview what `auto-config` would produce; supports `-o/--output` for CSV.
- `dab export --graphql` — emit or generate a GraphQL schema; flags include `-o/--output`, `--graphql-schema-file`, `--generate`, `--sampling-mode`, `--sampling-count`.
- `dab validate` — multi-stage check of `dab-config.json`; only accepts `-c/--config`.
- `dab start` — launch the runtime; flags include `--config`, `--LogLevel`, `--verbose`, `--no-https-redirect`, `--mcp-stdio`.

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
