---
name: aspire-sql-projects
description: Use SQL Database Projects (.sqlproj) with .NET Aspire for declarative schema deployment via dacpac.
license: MIT
---

# Aspire SQL Projects

## Use when

- Replacing ad-hoc SQL scripts with declarative schema management.
- Needing repeatable schema deployment in Aspire startup.

## Workflow

1. Add SQL project to solution.
2. Reference project in AppHost.
3. Deploy schema resource in startup flow.
4. Ensure app services wait for schema deployment completion.

## Guardrails

- Use `WaitForCompletion` for run-to-completion schema tasks.
- Keep DDL declarative and idempotency-aware where applicable.

## Related skills

- `aspire-data-api-builder`
- `data-api-builder-config`

## Microsoft Learn

- https://learn.microsoft.com/sql/tools/sql-database-projects/sql-database-projects
