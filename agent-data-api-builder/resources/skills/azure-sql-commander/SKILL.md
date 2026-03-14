---
name: azure-sql-commander
description: Deploy SQL Commander to Azure Container Apps for browser-based SQL access in cloud-hosted DAB environments.
license: MIT
---

# Azure SQL Commander

## Use when

- Adding a lightweight SQL browser tool to Azure environments.
- Supporting operational data inspection in non-local workflows.

## Workflow

1. Deploy SQL Commander container to ACA.
2. Provide secure connection string via secret reference.
3. Validate `/health` and DB connectivity.

## Guardrails

- Keep connection string in secret references.
- Limit scale footprint for admin tooling scenarios.

## Related skills

- `azure-data-api-builder`
- `aspire-sql-commander`

## Microsoft Learn

- https://learn.microsoft.com/azure/container-apps/overview
