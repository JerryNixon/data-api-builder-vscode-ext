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

1. Add an SDK-style `.sqlproj` using `Microsoft.Build.Sql` for new work.
2. Build with `dotnet build`; the output artifact is a `.dacpac`.
3. Publish the `.dacpac` with `SqlPackage /Action:Publish` or an equivalent deployment task.
4. Model publish as an Aspire run-to-completion executable/container resource.
5. Ensure DAB and tools `WaitForCompletion` on the schema deployment resource.

## Guardrails

- Use `WaitForCompletion` for run-to-completion schema tasks.
- Do not assert a first-party `Aspire.Hosting.MSBuild` SQL-project flow unless verified in current docs.
- Keep SQL projects declarative: one source file per object; publish computes the target diff.
- Treat publish as a deployment step, not just a project reference.
- Keep DDL declarative and idempotency-aware where applicable.

## Related skills

- `aspire-data-api-builder`
- `data-api-builder-config`

## Microsoft Learn

- https://learn.microsoft.com/sql/tools/sql-database-projects/sql-database-projects
- https://learn.microsoft.com/dotnet/aspire/get-started/aspire-overview
