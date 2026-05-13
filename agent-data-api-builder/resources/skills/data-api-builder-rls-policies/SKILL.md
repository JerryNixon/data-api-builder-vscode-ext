---
name: data-api-builder-rls-policies
description: Choose between DAB database policies and SQL Server Row-Level Security, and wire SESSION_CONTEXT claims for per-row authorization.
license: MIT
---

# Data API Builder RLS & Policies

## Use when

- Filtering rows per user/role beyond CRUD action grants.
- Deciding between entity `policy.database` (DAB-generated predicates) and database-native SQL Server RLS.
- Passing authenticated claims into SQL Server via `SESSION_CONTEXT`.

## Options

- **DAB database policy** — per-role/action predicate in `permissions[].actions[].policy.database`; uses `@item.<field>` and `@claims.<claim>`.
- **SQL Server RLS** — `CREATE SECURITY POLICY` plus inline table-valued predicate function; enforced by SQL for tables/views and SQL objects that query them.
- **SESSION_CONTEXT** — for SQL Server/Azure SQL only, DAB calls `sp_set_session_context` for authenticated claims when `set-session-context` is enabled.

## Workflow

1. Use DAB policy for simple row filters on generated `read`, `update`, or `delete` queries.
2. Use SQL Server RLS when filtering must be enforced inside the database or cover stored procedures/views/shared access paths.
3. Write policies with OData operators: `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `and`, `or`; use mapped API field names after `@item.`.
4. For SQL RLS, set data-source `options.set-session-context: true`, read claims with `SESSION_CONTEXT(N'<claim>')`, and test `sp_set_session_context` manually.
5. Validate with tokens/headers for each effective role; missing `@claims.*` values should produce 403.

## Provider notes

- **SQL Server / Azure SQL / Synapse dedicated** — DAB can set session context; SQL Server 2016+ supports `SESSION_CONTEXT`.
- **PostgreSQL / MySQL** — DAB database policies are supported; DAB doesn't provide the SQL Server session-context claim flow.
- **Cosmos DB for NoSQL** — no REST, no database policies, no stored procedure entities, no session context; use GraphQL `@authorize` plus entity permissions.
- **Stored procedures** — DAB database policies don't apply to `execute`; use SQL logic/RLS where supported.

## Guardrails

- Policies require an authenticated identity when using `@claims`; `Unauthenticated` has no claims.
- Enabling SQL Server `set-session-context` disables response caching for that data source.
- Don't duplicate equivalent predicates in both DAB policy and SQL RLS unless defense-in-depth is intentional.
- Keep database predicates SARGable and indexed; they're on the hot path.

## Related skills

- `data-api-builder-auth-mastery`
- `data-api-builder-auth`
- `data-api-builder-config`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/security/database-policies?tabs=bash
- https://learn.microsoft.com/azure/data-api-builder/concept/security/row-level-security
- https://learn.microsoft.com/azure/data-api-builder/reference-database-specific-features
