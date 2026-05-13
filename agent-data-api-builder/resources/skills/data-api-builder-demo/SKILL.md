---
name: data-api-builder-demo
description: Keep DAB quickstart assets consistent, runnable, and structurally compliant across local and Azure paths.
license: MIT
---

# Data API Builder Demo Operations

## Use when

- Creating or updating quickstart samples.
- Enforcing folder/script naming and readiness checks.
- Keeping local Docker/Aspire paths and Azure deployment paths aligned.

## Workflow

1. Verify the quickstart has a runnable local path before adding Azure.
2. Keep source assets in stable folders:
   - `data-api/` for `dab-config.json` and DAB `Dockerfile`.
   - `database/` for schema/seed assets or `.sqlproj`.
   - `web-app/` for optional client UI.
   - `azure-infra/` for `azure.yaml`, IaC, and Azure helper scripts.
3. Normalize scripts:
   - Local: `local-up.ps1`, `local-down.ps1`, optional `local-reset.ps1`.
   - Azure: `azure-infra/azure-up.ps1`, `azure-infra/azure-down.ps1`, optional `post-provision.ps1`.
4. Validate build/deploy entry points and README commands from a fresh clone.
5. Confirm cleanup/reset behavior is scoped to the quickstart's containers/resources.

## DAB conventions

- Use `dab-config.json` as the config file name unless targeting Static Web Apps.
- Use `@env('DATABASE_CONNECTION_STRING')` for Azure/container configs.
- Local DAB defaults to `http://localhost:5000`; verify `/health`, REST (`/api/<Entity>`), GraphQL if enabled, and Swagger (`/swagger` local, `/api/swagger` on ACA docs).
- For Azure Container Apps, bake `dab-config.json` into the image at `/App/dab-config.json` and expose target port `5000`.

## Guardrails

- Keep conventions deterministic.
- Avoid environment-specific drift across quickstarts.
- Keep sample operations aligned to production-safe defaults where practical.
- Never commit secrets or generated deployment temp folders.
- Prefer Microsoft Container Registry image `mcr.microsoft.com/azure-databases/data-api-builder`.

## Related skills

- `aspire-data-api-builder`
- `docker-data-api-builder`
- `azure-data-api-builder`
- `data-api-builder-config`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/quickstart-sql
- https://learn.microsoft.com/azure/data-api-builder/deployment/azure-container-apps
