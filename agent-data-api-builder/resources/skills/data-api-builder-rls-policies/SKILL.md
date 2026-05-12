---
name: data-api-builder-rls-policies
description: Choose between DAB database policies and SQL Server Row-Level Security, and wire SESSION_CONTEXT claims for per-row authorization.
license: MIT
---

# Data API Builder RLS & Policies

## Use when

- Filtering rows per user/role beyond CRUD action grants.
- Deciding between entity `policy.database` (DAB-side) and database-native RLS.
- Passing claims into the database via `SESSION_CONTEXT`.

## Options

- **DAB database policy** — predicate appended to generated SQL via `permissions[].policy.database`. Uses `@claims.<name>` and `@item.<column>` tokens. Works on all supported providers.
- **SQL Server RLS** — `CREATE SECURITY POLICY` + inline table-valued predicate function. Enforced by the engine for every query, including stored procs.
- **SESSION_CONTEXT (SQL Server)** — DAB calls `sp_set_session_context` per request, exposing each token claim as `@claims.<claim>`. Predicate functions read it via `SESSION_CONTEXT(N'<claim>')`.

## Workflow

1. Pick scope: column-shaping or simple per-row filter → DAB policy. Defense-in-depth or shared DB → SQL RLS.
2. For DAB policy: add `policy.database` to the entity's permission entry, e.g. `"@item.OwnerId eq @claims.oid"`.
3. For SQL RLS (SQL Server): write a predicate function reading `SESSION_CONTEXT`, then bind via `CREATE SECURITY POLICY ... ADD FILTER PREDICATE ...`.
4. Confirm DAB sets session context (default for SQL Server with auth providers); test with a token whose claims drive the predicate.
5. Validate with representative requests per role.

## Provider notes

- **SQL Server / Azure SQL / Fabric SQL** — full SESSION_CONTEXT + native RLS support.
- **PostgreSQL** — DAB policies supported; native RLS exists but DAB does not push session claims; enforce via DAB policy or app role.
- **MySQL / Cosmos DB (NoSQL)** — DAB policies supported on relational entities; no native RLS equivalent.

## Guardrails

- Don't duplicate the same predicate in both DAB policy and SQL RLS unless intentional — debugging diverges fast.
- Claim names are case-sensitive in `@claims.<name>` and `SESSION_CONTEXT`.
- Stored procedures bypass DAB policies; use SQL RLS to cover them.
- Keep predicates SARGable; complex policies become hot-path overhead.

## Related skills

- `data-api-builder-auth-mastery`
- `data-api-builder-auth`
- `data-api-builder-config`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/security/row-level-security
- https://learn.microsoft.com/azure/data-api-builder/concept/security/database-policies?tabs=bash
- https://learn.microsoft.com/azure/data-api-builder/reference-database-specific-features
