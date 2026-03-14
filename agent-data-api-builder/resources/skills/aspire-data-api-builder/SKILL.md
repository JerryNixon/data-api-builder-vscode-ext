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

1. Define AppHost resources.
2. Bind DAB config and connection env vars.
3. Apply startup dependencies (`WaitFor` / `WaitForCompletion`).
4. Validate via Aspire dashboard endpoints.

## Guardrails

- Use service names for inter-container/database references.
- Ensure schema deployment completion before DAB startup when using SQL project resources.
- Keep telemetry environment assumptions explicit.

## Related skills

- `aspire-sql-projects`
- `aspire-sql-commander`
- `aspire-mcp-inspector`

## Microsoft Learn

- https://learn.microsoft.com/dotnet/aspire/get-started/aspire-overview
