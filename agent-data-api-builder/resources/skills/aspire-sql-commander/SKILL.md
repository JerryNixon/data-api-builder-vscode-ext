---
name: aspire-sql-commander
description: Add SQL Commander to .NET Aspire for lightweight SQL browsing and query execution during local DAB development.
license: MIT
---

# Aspire SQL Commander

## Use when

- You want a browser SQL query tool in Aspire.
- You need quick schema/data inspection while developing DAB.

## Workflow

1. Add SQL Commander as a third-party container resource.
2. Use the verified image/tag for the project, for example `jerrynixon/sql-commander:1.1.0`.
3. Bind the Aspire SQL database connection string using the env var required by that image.
4. Add endpoint/health metadata if the image exposes it, and `WaitFor(db)`.

## Guardrails

- SQL Commander is not a Microsoft Learn-supported Aspire integration; verify image docs before hard-coding env names.
- Aspire SQL resources expose connection strings as `ConnectionStrings__{databaseName}` to referenced resources.
- Do not expose SQL Commander beyond local/dev networks without authentication controls.
- Ensure DB resource readiness before startup; schema jobs should complete before browsing data.

## Related skills

- `aspire-data-api-builder`
- `docker-data-api-builder`

## Microsoft Learn

- https://learn.microsoft.com/dotnet/aspire/get-started/aspire-overview
- https://aspire.dev/integrations/databases/sql-server/sql-server-host/
