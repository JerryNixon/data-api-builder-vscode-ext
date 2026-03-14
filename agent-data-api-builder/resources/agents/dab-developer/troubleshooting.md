# DAB Troubleshooting

## Fast triage order

1. `dab --version`
2. `dab validate`
3. Verify environment variables used by `@env(...)`
4. Verify database connectivity
5. Start and inspect runtime logs

## Frequent issues

- Missing env var for connection string
- View entity missing key fields
- Stored procedure configured with non-`execute` action
- Wrong endpoint path (`/api` vs `/graphql` vs `/mcp`)
- Container networking mismatch (`localhost` vs service name)

## Recommended diagnostics

- Check `/health`
- Verify an entity REST endpoint
- Verify GraphQL endpoint (if enabled)
- Verify MCP endpoint (if enabled)

## Related docs

- [dab-validate.md](dab-validate.md)
- [deploy-localhost-docker.md](deploy-localhost-docker.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/troubleshoot
