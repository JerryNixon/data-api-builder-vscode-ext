---
name: azure-data-api-builder
description: >-
  Provision, build, and deploy Data API Builder (DAB) to Azure Container Apps
  with Azure SQL, Azure Container Registry, and Azure Developer CLI (azd).
  Use when deploying DAB to Azure, running azd up for Data API Builder,
  pushing a DAB container image to ACR, provisioning ACA infrastructure
  with Bicep, or troubleshooting a DAB deployment on Azure Container Apps.
license: MIT
---

# Azure Data API Builder

Deploy Data API Builder to Azure Container Apps with a baked-in config image.

## Workflow

1. **Initialize the project** — scaffold with `azd init` using the DAB template:
   ```bash
   azd init --template data-api-builder
   ```
2. **Provision infrastructure** — create Azure SQL, ACR, and Container Apps:
   ```bash
   azd provision
   ```
   This runs the Bicep templates under `infra/` that create the resource group,
   Azure SQL server + database, ACR instance, Container Apps Environment, and
   a managed identity with roles for ACR pull and SQL access.

3. **Build the container image** — bake `dab-config.json` into the image:
   ```dockerfile
   FROM mcr.microsoft.com/azure-databases/data-api-builder:latest
   COPY dab-config.json /App/dab-config.json
   ```
   Build and push:
   ```bash
   az acr build --registry $ACR_NAME --image dab-app:latest .
   ```

4. **Deploy the app** — update the Container App with the new image:
   ```bash
   az containerapp update \
     --name $APP_NAME \
     --resource-group $RG_NAME \
     --image $ACR_NAME.azurecr.io/dab-app:latest
   ```
   Or deploy everything at once:
   ```bash
   azd up
   ```

5. **Verify the deployment** — confirm health and test an endpoint:
   ```bash
   curl https://$APP_FQDN/api/health
   curl https://$APP_FQDN/api/<entity-name>
   ```
   If unhealthy, check logs:
   ```bash
   az containerapp logs show --name $APP_NAME --resource-group $RG_NAME
   ```

## Guardrails

- Always bake `dab-config.json` into the image; do not rely on cloud file mounts.
- Store connection strings and secrets in Container Apps secrets or Azure Key Vault — never hard-code them.
- Use managed identity for SQL and ACR access instead of passwords.
- Validate `dab-config.json` locally before building: `dab validate --config dab-config.json`.

## Related skills

- `azure-sql-commander` — run SQL schema migrations
- `azure-mcp-inspector` — inspect MCP endpoints
- `data-api-builder-auth` — configure DAB authentication and authorization
