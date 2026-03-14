# DAB Developer Quickstart

## Goal

Deliver a validated DAB API quickly with minimal moving parts.

## Workflow

1. Initialize config.
2. Add one or more entities.
3. Validate.
4. Start runtime.
5. Verify endpoints.

## Minimal command path

- `dab init --database-type mssql --connection-string "@env('DATABASE_CONNECTION_STRING')"`
- `dab add Todo --source dbo.Todo --permissions "anonymous:read"`
- `dab validate`
- `dab start`

## Verify

- REST: `http://localhost:5000/api/Todo`
- GraphQL: `http://localhost:5000/graphql`
- Health: `http://localhost:5000/health`
- MCP (if enabled): `http://localhost:5000/mcp`

## Related docs

- [dab-init.md](dab-init.md)
- [dab-add.md](dab-add.md)
- [dab-validate.md](dab-validate.md)
- [dab-start.md](dab-start.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/get-started/get-started-with-data-api-builder
