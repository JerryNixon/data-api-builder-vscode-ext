---
name: data-api-builder-auth
description: Plan and implement Data API Builder auth scenarios across anonymous, Entra ID, API policy filtering, and SQL RLS patterns. Use when choosing or deploying DAB auth architecture.
---

# Data API Builder Authentication Scenarios

Use this skill to choose and implement the right DAB auth pattern based on quickstarts 1-5.

## When to use

- Decide between anonymous, Entra ID, API-level policy, and SQL RLS
- Migrate from one auth model to another
- Implement auth changes in `dab-config.json`, web auth flow, and SQL layer
- Deploy auth scenarios to Azure with minimal rework

## Scenario map

See the scenario matrix file in this skill's `resources` folder.

Quick summary:
- **QS1**: Anonymous + SQL Auth
- **QS2**: Anonymous + Managed Identity (API→SQL)
- **QS3**: Entra provider configured, still anonymous role
- **QS4**: Entra + authenticated role + DAB policy (`@item ... @claims ...`)
- **QS5**: Entra + authenticated role + SQL Row-Level Security (no DAB row policy)

## Bundled assets

### DAB config templates
- `qs1-anonymous-sql-auth.json`
- `qs3-entra-provider-anonymous-role.json`
- `qs4-entra-authenticated-policy.json`
- `qs5-entra-authenticated-rls-ready.json`

### SQL RLS templates
- `UserFilterPredicate.sql`
- `UserFilterPolicy.sql`

### Scripts
- `new-dab-auth-config.ps1`
- `auth-scenario-checklist.ps1`

## Implementation workflow

1. Pick target scenario (`qs1`, `qs3`, `qs4`, or `qs5` template baseline).
2. Generate `dab-config.json` from template using script.
3. Fill placeholders (`__AUDIENCE__`, `__ISSUER__`, `__WEB_URL_AZURE__`).
4. If moving to RLS, add SQL objects and remove DAB row policies.
5. Validate and run:
   - `dab validate`
   - start app stack
6. Verify behavior with scenario checklist script.

## Critical correctness checks

- For stored procedures, use `execute` permission, not `read`.
- DAB policy syntax is OData style (`@item.Owner eq @claims.preferred_username`).
- RLS scenario should **not** keep DAB row policies for the same rule.
- Entra provider requires real audience/issuer values (no placeholders at runtime).
- Managed Identity changes are infra/runtime connection concerns, not just `dab-config`.

## Troubleshooting (syntax gotchas)

### Policy syntax

```json
// WRONG
"policy": { "database": "Owner = preferred_username" }

// CORRECT
"policy": { "database": "@item.Owner eq @claims.preferred_username" }
```

### Auth role mismatch

```json
// WRONG for user-token flow
"role": "anonymous"

// CORRECT for token-protected flow
"role": "authenticated"
```

### RLS duplication

If SQL RLS is enabled (QS5 pattern), avoid duplicating the same row filter policy in DAB unless intentionally layering controls.

## Related skills

- `data-api-builder-config`
- `data-api-builder-cli`
- `azure-data-api-builder`
- `data-api-builder-demo`
