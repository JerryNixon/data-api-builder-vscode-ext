---
name: data-api-builder-rest
description: Design and consume Data API Builder REST endpoints, including filtering, sorting, pagination, and per-entity REST configuration.
license: MIT
---

# Data API Builder REST

## Use when

- Building or testing REST calls against a DAB-exposed entity.
- Tuning `$select`, `$filter`, `$orderby`, `$first`, `$after` query options.
- Customizing the REST path or disabling REST per entity.

## Workflow

1. Confirm `runtime.rest.enabled` is true and note `runtime.rest.path` (default `/api`).
2. Set `entity.rest.enabled` and optional `entity.rest.path` per entity.
3. Compose requests as `{rest-path}/{entity}` with OData-style query options.
4. Page with `$first=N` then follow `nextLink` using `$after=<token>`.
5. Validate error payloads (HTTP status + JSON `error` object) when shaping clients.

## Guardrails

- REST does not traverse relationships; use GraphQL for nested reads.
- Keep `$first` bounded by `runtime.pagination` defaults to avoid runaway responses.
- Disable REST on entities that should be GraphQL-only instead of relying on auth alone.

## Example

```
GET /api/Book?$select=id,title&$filter=year gt 2020&$orderby=title&$first=20
```

## Related skills

- `data-api-builder-config`
- `data-api-builder-graphql`
- `data-api-builder-auth`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/rest/
