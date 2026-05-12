---
name: azure-deployment-data-api-builder
description: Compare Azure hosting options for Data API Builder (ACA, App Service, ACI, AKS) and choose the right deployment pattern.
license: MIT
---

# Azure Deployment Data API Builder

## Use when

- Picking an Azure host for DAB (MCP, REST, GraphQL).
- Standing up a new deployment and weighing trade-offs.
- Planning image, config, and secret strategy before IaC.

## Workflow

1. Pick a host:
   - **Azure Container Apps** — default for containerized, scale-to-zero workloads.
   - **Azure App Service (Linux)** — managed PaaS, code or container, easy Entra auth, no orchestration.
   - **Azure Container Instances** — quick single-container demos and short-lived jobs.
   - **AKS** — only when you already run Kubernetes and need full control.
2. Pick an image strategy:
   - Custom container with `dab-config.json` baked in (preferred — immutable, versioned).
   - Sidecar/mounted config (avoid unless required; harder to reason about).
3. Pick a secret strategy:
   - Managed identity to Azure SQL (preferred, no secrets).
   - Key Vault references for any remaining connection strings or keys.
4. Gate rollouts on `/health` and confirm REST/GraphQL/MCP endpoints respond.

## Guardrails

- Never commit connection strings or keys; use Key Vault references or managed identity.
- Avoid cloud file-share mounts for `dab-config.json`; bake it into the image.
- Keep one DAB config exposing MCP + REST + GraphQL — do not fork per host.
- Match host SKU to expected concurrency; DAB is stateless but DB-bound.

## Related skills

- `azure-data-api-builder` (Azure Container Apps)
- `azure-app-service-data-api-builder`
- `data-api-builder-config`
- `data-api-builder-auth`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/deployment/
