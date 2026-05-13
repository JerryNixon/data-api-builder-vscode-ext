---
name: aspire-data-api-builder
description: Orchestrate SQL Server and Data API Builder with .NET Aspire for local development, health-aware startup, and dashboard-driven diagnostics.
license: MIT
---

# Aspire Data API Builder

## Use when

- You want local orchestration via .NET Aspire.
- You want built-in dashboards, dependency wiring, and health visibility.

## Workflow

1. Create or update the `.AppHost.csproj` using current Aspire templates/packages.
2. Add SQL Server with `Aspire.Hosting.SqlServer` (`builder.AddSqlServer(...).AddDatabase(...)`).
3. Model DAB as a container/Dockerfile resource; no first-party DAB hosting integration is documented.
4. Bind DAB config and `DATABASE_CONNECTION_STRING` for configs using `@env(...)`.
5. Use `WaitFor` for long-running resources and `WaitForCompletion` only for schema/deployment jobs.
6. Validate through the Aspire dashboard and DAB `/health`.

## Guardrails

- Use service names for inter-container/database references.
- `WithReference(db)` injects `ConnectionStrings__{name}` for consuming resources; map it explicitly if DAB expects a different env var.
- Keep AppHost target framework and Aspire package versions aligned with the installed Aspire workload/template.
- Ensure schema deployment completion before DAB startup when using SQL project resources.
- Keep telemetry environment assumptions explicit.

## Related skills

- `aspire-sql-projects`
- `aspire-sql-commander`
- `aspire-mcp-inspector`

## Microsoft Learn

- https://learn.microsoft.com/dotnet/aspire/get-started/aspire-overview
- https://aspire.dev/integrations/databases/sql-server/sql-server-host/
