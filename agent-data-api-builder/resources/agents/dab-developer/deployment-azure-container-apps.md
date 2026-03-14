# Azure Container Apps Deployment

## Purpose

Deploy DAB to Azure Container Apps with Azure SQL and ACR using repeatable IaC workflows.

## Baseline approach

- Provision infrastructure with `azd` + Bicep.
- Build custom DAB image with baked `dab-config.json`.
- Use secrets for connection strings.
- Validate health and endpoint readiness post-deploy.

## Guardrails

- Avoid config file shares/mounts for cloud DAB config.
- Keep config and image version aligned.
- Prefer managed identity where possible.

## Verification

- `https://<fqdn>/health`
- REST and/or GraphQL endpoint checks
- MCP endpoint check (if enabled)

## Related docs

- [deployment-scripts.md](deployment-scripts.md)
- [troubleshooting.md](troubleshooting.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/deploy/azure/azure-container-apps
