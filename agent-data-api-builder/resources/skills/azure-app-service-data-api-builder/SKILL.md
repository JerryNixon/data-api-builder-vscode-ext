---
name: azure-app-service-data-api-builder
description: Deploy Data API Builder and SQL MCP Server to Azure App Service for Linux, with or without containers.
license: MIT
---

# Azure App Service Data API Builder

## Use when

- Hosting DAB on managed PaaS without container orchestration.
- Running SQL MCP Server on App Service using the no-container pattern.
- You want built-in TLS, custom domains, scale-out, monitoring, and Microsoft Entra auth.

## Workflow

1. Prefer code-based Linux App Service for SQL MCP: include `dab-config.json`, `.config/dotnet-tools.json`, and `startup.sh`.
2. Install DAB as a local .NET tool; startup restores tools and runs `dotnet tool run dab start`.
3. Set `DATABASE_CONNECTION_STRING` as an app setting or Key Vault reference; use `@env()` in config.
4. Configure `runtime.host.authentication.provider` to `AppService` when Easy Auth protects the endpoint.
5. For custom containers, set the listening port with App Service config (for DAB, commonly `WEBSITES_PORT=5000`).
6. For Linux custom containers, leave `WEBSITES_ENABLE_APP_SERVICE_STORAGE` disabled unless `/home` persistence is required.
7. Verify `/health`, REST, GraphQL, and `/mcp`; raw `/mcp` can look like an error in a browser.

## App settings vs config file

- **App settings** — runtime knobs, secrets, env selectors. Source of truth for secrets.
- **`dab-config.json`** — entities, relationships, policies, runtime options. Source of truth for shape. Ship it with the app; do not edit live.

## Guardrails

- Prefer managed identity and Microsoft Entra authentication to Azure SQL over password-bearing connection strings.
- Do not live-edit `dab-config.json`; deploy it with ZIP/code artifacts or bake it into a container image.
- Enable Always On for production plans so DAB stays warm.
- Use ACA instead when you need serverless containers, scale-to-zero, revisions, or traffic splitting.

## Related skills

- `azure-deployment-data-api-builder`
- `azure-data-api-builder`
- `data-api-builder-config`
- `data-api-builder-auth`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/deployment/azure-app-service
- https://learn.microsoft.com/azure/app-service/configure-custom-container
- https://devblogs.microsoft.com/azure-sql/sql-mcp-server-app-service/
