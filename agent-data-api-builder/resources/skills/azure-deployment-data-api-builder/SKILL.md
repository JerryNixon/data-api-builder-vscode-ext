---
name: azure-deployment-data-api-builder
description: Compare Azure hosting options for Data API Builder and choose ACA, App Service, ACI, AKS, local, or source hosting.
license: MIT
---

# Azure Deployment Data API Builder

## Use when

- Picking an Azure host for DAB (MCP, REST, GraphQL).
- Standing up a new deployment and weighing trade-offs.
- Planning image, config, identity, and secret strategy before IaC.

## Workflow

1. Pick a host:
   - **Azure Container Apps** — default for serverless containers, revisions, traffic splitting, and scale-to-zero.
   - **Azure App Service (Linux)** — code-based or custom container PaaS with TLS, domains, Easy Auth, and scale-out.
   - **Azure Container Instances** — quick single-container demos and short-lived jobs.
   - **AKS** — only when you already run Kubernetes and need full control.
   - **Local Docker / CLI / source** — dev, tests, and contribution workflows.
2. Pick an image strategy:
   - ACA/AKS/ACI: custom image with `dab-config.json` baked in (immutable, versioned).
   - App Service: code ZIP with local DAB tool manifest, or a custom container.
3. Pick a secret strategy:
   - Microsoft Entra authentication and managed identity to Azure SQL where feasible.
   - Host secret refs or Key Vault references for any remaining secrets.
4. Gate rollouts on `/health` and confirm REST/GraphQL/MCP endpoints respond.

## Static Web Apps

- Static Web Apps database connections are based on DAB and use `/data-api`.
- Treat SWA database connections as legacy: Microsoft Learn marks retirement for November 30, 2025.
- For new cloud DAB deployments, prefer ACA or App Service.

## Guardrails

- Never commit connection strings or keys; use Key Vault references or managed identity.
- Avoid cloud file-share mounts for `dab-config.json`; bake or deploy it as an artifact.
- Keep one DAB config exposing MCP + REST + GraphQL — do not fork per host.
- Match host SKU to expected concurrency; DAB is stateless but DB-bound.

## Related skills

- `azure-data-api-builder` (Azure Container Apps)
- `azure-app-service-data-api-builder`
- `data-api-builder-config`
- `data-api-builder-auth`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/deployment/
- https://learn.microsoft.com/azure/static-web-apps/database-overview
