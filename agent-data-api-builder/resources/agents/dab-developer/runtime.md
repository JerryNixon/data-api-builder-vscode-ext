# Runtime Reference

## Purpose

Configure global runtime behavior for REST, GraphQL, MCP, host mode, auth, cache, pagination, telemetry, and health.

## Typical configuration areas

- `runtime.rest`
- `runtime.graphql`
- `runtime.mcp`
- `runtime.host` (mode, CORS, auth provider)
- `runtime.cache`
- `runtime.pagination`
- `runtime.health`

## Recommended defaults

- Development: introspection enabled, short cache, explicit local CORS.
- Production: strict CORS, production auth provider, reduced introspection exposure.

## Related docs

- [entities.md](entities.md)
- [mcp.md](mcp.md)
- [dab-start.md](dab-start.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/configuration/runtime
