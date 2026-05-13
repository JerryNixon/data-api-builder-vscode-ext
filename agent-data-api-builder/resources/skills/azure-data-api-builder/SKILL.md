---
name: azure-data-api-builder
description: Deploy Data API Builder to Azure Container Apps with ACR, Bicep or azd, managed identity, and secure config.
license: MIT
---

# Azure Data API Builder

## Use when

- Deploying DAB as a containerized API on Azure Container Apps (ACA).
- Building repeatable IaC-backed deployments with Azure CLI, Bicep, or `azd`.

## Workflow

1. Create `dab-config.json` with `@env('DATABASE_CONNECTION_STRING')`.
2. Build a custom image from `mcr.microsoft.com/azure-databases/data-api-builder`, copying config to `/App/dab-config.json`.
3. Provision ACA environment, Container App, ACR, identity, secrets, and ingress (`targetPort: 5000`).
4. Use `azd` only when the repo has `azure.yaml` plus `infra/` Bicep/Terraform; otherwise use Azure CLI/Bicep directly.
5. Prefer Microsoft Entra authentication to Azure SQL via managed identity; keep fallback connection strings in ACA secrets.
6. Deploy revisions and verify `/health`, `/api/swagger`, REST/GraphQL/MCP paths as enabled.

## IaC shape

- `azure.yaml` names services and maps them to the ACA host; it does not replace Bicep.
- Bicep should define `Microsoft.App/containerApps`, ingress, registry pull, env vars, and `secretRef` values.
- Use custom images for immutable config. Treat sidecars or mounted config as exceptions for advanced scenarios.

## Guardrails

- Do not rely on cloud file mounts for DAB config.
- Do not commit database credentials; use ACA secret refs or Key Vault integration.
- Use "Microsoft Entra", not "AAD", in user-facing guidance.
- ACA is best for serverless containers, revisions, traffic splitting, and scale-to-zero HTTP workloads.

## Related skills

- `azure-deployment-data-api-builder`
- `azure-sql-commander`
- `azure-mcp-inspector`
- `data-api-builder-auth`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/deployment/azure-container-apps
- https://learn.microsoft.com/azure/container-apps/overview
- https://learn.microsoft.com/azure/developer/azure-developer-cli/overview
