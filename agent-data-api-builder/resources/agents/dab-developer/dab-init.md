# `dab init` Reference

## Purpose

Create a new `dab-config.json`.

## Standard pattern

`dab init --database-type mssql --connection-string "@env('DATABASE_CONNECTION_STRING')"`

## Common options

- `--database-type mssql|postgresql|mysql|cosmosdb_nosql`
- `--connection-string <value or @env(...)>`
- `--host-mode development|production`
- `--rest.enabled true|false`
- `--graphql.enabled true|false`
- `--mcp.enabled true|false`

## Notes

- Prefer `@env(...)` for secrets.
- `dab init` overwrites existing config.
- Initialize once, then use `dab add`, `dab update`, and `dab configure`.

## Related docs

- [dab-add.md](dab-add.md)
- [runtime.md](runtime.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/command-line/dab-init
