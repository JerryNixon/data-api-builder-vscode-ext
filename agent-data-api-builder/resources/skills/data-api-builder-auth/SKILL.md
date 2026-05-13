---
name: data-api-builder-auth
description: Select a Data API Builder authentication pattern and wire roles, permissions, policies, and SQL RLS correctly.
license: MIT
---

# Data API Builder Auth

## Use when

- Choosing anonymous, JWT, platform-header, local-simulator, or SQL RLS auth patterns.
- Updating `runtime.host.authentication`, entity `permissions`, or role headers.
- Deciding whether row filters belong in DAB database policies or SQL RLS.

## Workflow

1. Pick provider: `Unauthenticated`, `EntraID`/`AzureAD`, `Custom`, `AppService`, `StaticWebApps`, or dev-only `Simulator`.
2. For JWT providers (`EntraID`/`AzureAD`, `Custom`), set `jwt.audience` and `jwt.issuer`; platform providers don't use JWT settings.
3. Grant entity permissions with `permissions: [{ role, actions: [...] }]`; actions are `create`, `read`, `update`, `delete`, `execute`, or `*`.
4. Use `Anonymous`/`Authenticated` system roles or custom roles from the user's `roles` claim; clients select custom roles with `X-MS-API-ROLE`.
5. Add row filtering only where needed: DAB `policy.database` for `read`/`update`/`delete`, or SQL Server RLS with `SESSION_CONTEXT` for database-enforced filtering.
6. Validate each effective role and denied path with representative tokens or local provider headers.

## Guardrails

- `Unauthenticated` always runs as `Anonymous`; it doesn't activate `Authenticated`, custom roles, or claims.
- `Simulator` requires development mode and doesn't validate tokens or provide arbitrary claims.
- Database policies use OData-style `@item.<field>` and `@claims.<claim>`; missing claims return 403.
- Database policies don't apply to `create`, `execute`, Cosmos DB for NoSQL, or stored procedure predicates.
- SQL Server `SESSION_CONTEXT` requires data-source `options.set-session-context: true` and disables response caching.

## Related skills

- `data-api-builder-auth-mastery`
- `data-api-builder-rls-policies`
- `data-api-builder-config`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/security/overview
- https://learn.microsoft.com/azure/data-api-builder/concept/security/authorization-overview
- https://learn.microsoft.com/azure/data-api-builder/concept/security/database-policies?tabs=bash
- https://learn.microsoft.com/azure/data-api-builder/concept/security/row-level-security
