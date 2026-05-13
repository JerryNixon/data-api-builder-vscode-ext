---
name: azure-sql-commander
description: Deploy SQL Commander to Azure Container Apps for browser-based SQL access using ACA secrets and optional Key Vault.
license: MIT
---

# Azure SQL Commander

## Use when

- Adding a lightweight SQL browser tool to Azure environments.
- Supporting operational data inspection in non-local workflows.
- Co-locating admin tooling with DAB in Azure Container Apps.

## Workflow

1. Deploy SQL Commander as a separate Container App, not a sidecar in the public DAB app.
2. Provision ACA environment, Container App, ingress policy, identity, and secrets via Bicep or `azd`.
3. Store DB connection values as ACA secrets (`secretRef`) or Key Vault references; never inline in env vars.
4. Prefer Microsoft Entra / managed identity to Azure SQL when the tool supports it; otherwise use least-privilege SQL credentials.
5. Restrict ingress (internal, IP allowlist, or Entra-protected front door) for admin tooling.
6. Validate `/health` and DB connectivity, then scale to zero/min replicas appropriate for an admin-only tool.

## Bicep shape

- `configuration.secrets[]` holds `sql-connection-string` or Key Vault-backed values.
- `template.containers[].env[]` maps env vars with `secretRef: 'sql-connection-string'`.
- `configuration.ingress.targetPort` must match the container's actual HTTP port; do not guess if the image docs differ.

## Guardrails

- Keep SQL Commander separate from production DAB traffic paths.
- Use read-only or narrowly scoped database permissions by default.
- Do not print or log full connection strings in deployment output.

## Related skills

- `azure-deployment-data-api-builder`
- `azure-data-api-builder`
- `aspire-sql-commander`

## Microsoft Learn

- https://learn.microsoft.com/azure/container-apps/overview
- https://learn.microsoft.com/azure/data-api-builder/deployment/azure-container-apps
