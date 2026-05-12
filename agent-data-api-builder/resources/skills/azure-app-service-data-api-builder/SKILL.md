---
name: azure-app-service-data-api-builder
description: Deploy Data API Builder (and SQL MCP Server) to Azure App Service for Linux with managed identity to Azure SQL.
license: MIT
---

# Azure App Service Data API Builder

## Use when

- Hosting DAB on managed PaaS without container orchestration.
- Running SQL MCP Server on App Service (no-container pattern).
- You want built-in TLS, custom domains, scale-out, and Entra auth.

## Workflow

1. Create a Linux App Service (code-based with .NET, or container).
2. Ship `dab-config.json` with the app artifact (or bake into image); avoid file-share mounts.
3. Configure connection to Azure SQL using **managed identity** (no passwords).
4. Set DAB env vars (e.g. `DAB_ENVIRONMENT`) via App Service **app settings**; use Key Vault references for any secrets.
5. Start DAB via `dab start --config dab-config.json` (startup command for code deploys).
6. Protect the endpoint with **App Service Authentication (Entra ID)** for MCP/REST/GraphQL.
7. Scale up (SKU) or out (instances); verify `/health` before routing traffic.

## App settings vs config file

- **App settings** — runtime knobs, secrets, env selectors. Source of truth for secrets.
- **`dab-config.json`** — entities, relationships, policies, runtime options. Source of truth for shape. Ship it with the app; do not edit live.

## Guardrails

- Prefer managed identity to Azure SQL over connection strings.
- Do not mount `dab-config.json` from Azure Files; bake or deploy with the app.
- Enable Always On for production plans so DAB stays warm.
- Use ACA instead when you need scale-to-zero or fine-grained revisions.

## Related skills

- `azure-deployment-data-api-builder`
- `azure-data-api-builder`
- `data-api-builder-config`
- `data-api-builder-auth`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/deployment/
- https://devblogs.microsoft.com/azure-sql/sql-mcp-server-app-service/
