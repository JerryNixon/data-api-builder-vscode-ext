---
name: data-api-builder-auth-mastery
description: Deep guide for choosing and configuring Data API Builder authentication providers and the role/claim flow end to end.
license: MIT
---

# Data API Builder Auth Mastery

## Use when

- Picking a DAB auth provider for local, hosted, Entra, or third-party JWT scenarios.
- Wiring `runtime.host.authentication` with `jwt.audience` / `jwt.issuer`.
- Designing effective roles, `X-MS-API-ROLE`, entity permissions, and claim-backed policies.

## Providers

- `Unauthenticated` — default; DAB validates no identity and every request is `Anonymous`.
- `StaticWebApps` — Azure Static Web Apps platform identity headers.
- `AppService` — EasyAuth; trusts `X-MS-CLIENT-PRINCIPAL` and claims injected by App Service.
- `EntraID` / `AzureAD` — Microsoft Entra JWT bearer; requires `jwt.audience` and `jwt.issuer`.
- `Custom` — generic OIDC/JWT providers (Okta, Auth0, Keycloak); also requires `jwt.audience` and `jwt.issuer`.
- `Simulator` — development mode only; defaults to `Authenticated` and lets `X-MS-API-ROLE` choose test roles.

## Workflow

1. Choose provider by trust boundary: no DAB identity → `Unauthenticated`; Azure host → `StaticWebApps`/`AppService`; Entra → `EntraID`; third-party JWT → `Custom`; local role testing → `Simulator`.
2. Configure `runtime.host.authentication.provider`; add `jwt.audience` + `jwt.issuer` only for JWT providers.
3. Define entity `permissions` as `[{ role, actions }]`; use valid actions: `create`, `read`, `update`, `delete`, `execute`, `*`.
4. For user roles, ensure the identity includes a `roles` claim (or platform role claims) and send `X-MS-API-ROLE: <role>`.
5. Verify no-header, bad-token, default `Authenticated`, and each custom-role path.

## Role flow

- No valid identity → `Anonymous`; valid identity with no `X-MS-API-ROLE` → `Authenticated`.
- User roles require both membership in the identity's roles and the `X-MS-API-ROLE` header; missing membership is 403.
- DAB evaluates exactly one effective role per request; permissions aren't additive across roles.
- Role and claim names must match exactly; treat them as case-sensitive in config and policies.

## Guardrails

- Don't ship `Simulator`; DAB rejects it outside development mode.
- `Custom` is the provider name for generic JWT, not `Jwt`.
- `Unauthenticated` can't drive claim policies, custom roles, or `Authenticated` permissions.
- App Service/SWA providers trust platform headers; prevent direct client bypass.

## Related skills

- `data-api-builder-auth`
- `data-api-builder-rls-policies`
- `data-api-builder-config`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/security/authorization-overview
- https://learn.microsoft.com/azure/data-api-builder/concept/security/overview
- https://learn.microsoft.com/azure/data-api-builder/concept/security/authenticate-simulator
