---
name: data-api-builder-caching
description: Configure Data API Builder result caching across L1 in-memory, L2 distributed (Redis), and HTTP Cache-Control behavior.
license: MIT
---

# Data API Builder Caching

## Use when

- Reducing repeat database round trips for read-heavy REST entities.
- Sharing cache across scaled-out DAB instances with Redis (L2).
- Letting clients force fresh reads via `Cache-Control` request headers.

## Workflow

1. Enable globally under `runtime.cache` with a sane default `ttl-seconds`.
2. Opt each entity in via `cache: { enabled, ttl-seconds, level }`; pick `L1` (in-memory only) or `L1L2` (default, adds distributed Redis when enabled).
3. For multi-instance deployments, add `runtime.cache.level-2` with `provider: redis`, `connection-string`, and optional `partition`.
4. Validate with REST reads; `Cache-Control: no-cache` forces a database refresh and updates cache, while `no-store` prevents this response from populating or refreshing cache.

## Minimal config

```json
"runtime": {
  "cache": {
    "enabled": true,
    "ttl-seconds": 30,
    "level-2": { "enabled": true, "provider": "redis", "connection-string": "localhost:6379", "partition": "prod-api" }
  }
},
"entities": {
  "Book": { "cache": { "enabled": true, "ttl-seconds": 120, "level": "L1L2" } }
}
```

## Guardrails

- Caching applies to REST query operations only; GraphQL request-level cache directives are not honored.
- Don't cache volatile or per-user-sensitive entities with long TTLs.
- If `L2` isn't enabled globally, entities set to `L1L2` silently behave as `L1`.
- DAB does not emit `Cache-Control` response headers; it only reads request directives (`no-cache`, `no-store`).
- DAB ignores other standard request directives such as `max-age` and `max-stale`.

## Related skills

- `data-api-builder-config`
- `data-api-builder-rest`
- `data-api-builder-observability`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/cache/level-1
- https://learn.microsoft.com/azure/data-api-builder/concept/cache/level-2
- https://learn.microsoft.com/azure/data-api-builder/concept/cache/http-headers
