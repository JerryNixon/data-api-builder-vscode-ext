# DAB Best Practices

## Configuration

- Use `@env('VAR')` for all secrets.
- Keep config minimal; add features intentionally.
- Validate after each substantial change.

## Security

- Prefer role-scoped actions over wildcard permissions.
- Use production auth provider before internet exposure.
- Restrict CORS to explicit origins in production.

## Reliability

- Run `dab validate` before `dab start` and before deploy.
- Keep one source of truth for `dab-config.json`.
- Use reproducible deployment paths (Docker Compose locally, `azd` in Azure).

## Related docs

- [runtime.md](runtime.md)
- [troubleshooting.md](troubleshooting.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/
