# Deployment Script Guidance

## Purpose

Define a consistent script contract for Azure deployment automation.

## Recommended artifacts

- `azure.yaml` (azd project)
- `infra/main.bicep` (infrastructure)
- `post-provision.ps1` (schema + image update)

## Script expectations

- Idempotent where practical.
- Explicit environment-variable contract.
- Clear failure output and non-zero exit on failure.
- No embedded secrets in source-controlled files.

## Related docs

- [deployment-azure-container-apps.md](deployment-azure-container-apps.md)
- [scripts/README.md](scripts/README.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/developer/azure-developer-cli/
