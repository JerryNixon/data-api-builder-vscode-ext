# Local Docker Deployment

## Purpose

Run SQL Server + DAB locally with deterministic startup behavior.

## Requirements

- `docker compose`
- `dab-config.json`
- `.env` for secrets (gitignored)

## Rules

- Use Docker Compose, not ad-hoc `docker run`.
- Use service names for container-to-container connectivity.
- Mount `dab-config.json` read-only.
- Wait for SQL health before starting DAB-dependent services.

## Suggested sequence

1. Start SQL service.
2. Wait for healthy status.
3. Apply schema/seed (if applicable).
4. Start DAB and companion services.
5. Verify `/health` and one entity endpoint.

## Related docs

- [QUICKSTART.md](QUICKSTART.md)
- [troubleshooting.md](troubleshooting.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/deploy/docker
