---
name: docker-data-api-builder
description: Run SQL Server and Data API Builder locally with Docker Compose, including optional SQL Commander and MCP Inspector services.
license: MIT
---

# Docker Data API Builder

## Use when

- You need local containerized DAB development.
- You want predictable startup ordering and health checks.

## Workflow

1. Define a gitignored `.env` for secrets.
2. Configure SQL Server with a `sqlcmd` health check.
3. Run DAB from `mcr.microsoft.com/azure-databases/data-api-builder:<tag>`.
4. Mount `dab-config.json` read-only at `/App/dab-config.json` or pass `--ConfigFileName`.
5. Apply schema before DAB, then verify `http://localhost:5000/health`.

## Guardrails

- Use service names for container-to-container connections.
- In DAB config, prefer `@env('DATABASE_CONNECTION_STRING')`; set `DATABASE_CONNECTION_STRING` in Compose.
- Do not use the stale Docker Hub repo name `azure/data-api-builder`; use Microsoft Container Registry.
- DAB defaults to port `5000`; `/health` is the health endpoint and `/swagger` is development-only.
- Compose `depends_on: { condition: service_healthy }` is valid with current Docker Compose, but health checks must be real readiness checks.
- Avoid using `sa` for long-term app connections.

## Related skills

- `data-api-builder-config`
- `aspire-data-api-builder`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/quickstart-sql
- https://mcr.microsoft.com/v2/azure-databases/data-api-builder/tags/list
