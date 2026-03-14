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

1. Define `.env` (gitignored).
2. Define `docker-compose.yml` with health checks.
3. Start SQL first; ensure healthy.
4. Apply schema.
5. Start/verify DAB and companion tools.

## Guardrails

- Use service names for container-to-container connections.
- Keep `dab-config.json` mounted read-only locally.
- Avoid using `sa` for long-term app connections.

## Related skills

- `data-api-builder-config`
- `aspire-data-api-builder`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/deploy/docker
