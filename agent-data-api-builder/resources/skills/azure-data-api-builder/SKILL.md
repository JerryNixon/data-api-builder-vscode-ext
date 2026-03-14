---
name: azure-data-api-builder
description: Deploy Data API Builder to Azure using Azure Container Apps, Azure SQL, ACR, and Azure Developer CLI workflows.
license: MIT
---

# Azure Data API Builder

## Use when

- Deploying DAB to Azure.
- Building repeatable IaC-backed deployment pipelines.

## Workflow

1. Provision infra (`azd` + Bicep).
2. Build custom image with baked `dab-config.json`.
3. Deploy schema and app updates.
4. Verify health and endpoint readiness.

## Guardrails

- Do not rely on cloud file mounts for DAB config.
- Keep secrets in secure environment/secret stores.
- Prefer managed identity when feasible.

## Related skills

- `azure-sql-commander`
- `azure-mcp-inspector`
- `data-api-builder-auth`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/deploy/azure/azure-container-apps
