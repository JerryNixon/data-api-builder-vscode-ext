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

1. Add container resource.
2. Bind `ConnectionStrings__db` to Aspire SQL database resource.
3. Add health check and dependency ordering.

## Guardrails

- Keep connection string key name exact (`ConnectionStrings__db`).
- Ensure DB resource readiness before startup.

## Related skills

- `aspire-data-api-builder`
- `docker-data-api-builder`

## Microsoft Learn

- https://learn.microsoft.com/dotnet/aspire/get-started/aspire-overview
