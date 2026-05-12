---
name: data-api-builder-auth-mastery
description: Deep guide for choosing and configuring Data API Builder authentication providers and the role/claim flow end to end.
license: MIT
---

# Data API Builder Auth Mastery

## Use when

- Picking the right auth provider for an environment (dev, hosted, edge).
- Wiring `runtime.host.authentication` with `jwt.audience` / `jwt.issuer`.
- Designing the role flow (anonymous → authenticated → custom) and entity `permissions`.

## Providers

- `StaticWebApps` — Azure Static Web Apps; reads `X-MS-CLIENT-PRINCIPAL`.
- `AppService` — App Service / EasyAuth; reads injected auth headers.
- `AzureAD` (Entra ID) — JWT bearer; requires `jwt.audience` and `jwt.issuer`.
- Generic `Jwt` — any OIDC issuer; same `audience` / `issuer` requirement.
- `Simulator` — dev-only; trusts `X-MS-API-ROLE` without validation.
- No provider configured → all requests are `anonymous`.

## Workflow

1. Choose provider by host: SWA/App Service → matching provider; custom host or Entra → JWT/AzureAD; local dev → `Simulator`.
2. Set `runtime.host.authentication` with `provider` and (for JWT) `jwt.audience` + `jwt.issuer`.
3. Define entity `permissions` as `[{ role, actions }]`. Always include `anonymous` or `authenticated` baselines explicitly.
4. Add custom roles; clients select them via `X-MS-API-ROLE` (must also be present in the user's claims).
5. Verify with representative tokens / simulated headers per role.

## Role flow

- Every request resolves to exactly one active role.
- Unauthenticated → `anonymous`. Authenticated with no `X-MS-API-ROLE` → `authenticated`.
- Authenticated + `X-MS-API-ROLE: <role>` → that role, only if it appears in the user's `roles` claim.
- Permissions are not additive across roles; only the active role's entry applies.

## Guardrails

- Never ship `Simulator` outside local dev.
- `audience` and `issuer` must be real values — not placeholders — or tokens silently fail.
- Don't grant `anonymous` write actions unless intentional.
- Custom roles in config must match claim values exactly (case-sensitive).

## Related skills

- `data-api-builder-auth`
- `data-api-builder-rls-policies`
- `data-api-builder-config`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/security/authorization-overview
- https://learn.microsoft.com/azure/data-api-builder/concept/security/authentication
