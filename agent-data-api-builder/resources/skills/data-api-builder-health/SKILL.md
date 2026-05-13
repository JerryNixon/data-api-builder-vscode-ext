---
name: data-api-builder-health
description: Configure and operate the Data API Builder /health endpoint for runtime, data-source, and per-entity readiness checks.
license: MIT
---

# Data API Builder Health

## Use when

- Wiring `/health` into a load balancer, container probe, or uptime monitor.
- Tuning per-entity or per-data-source response thresholds.
- Restricting who can read the comprehensive health report via roles.

## Workflow

1. Enable `runtime.health` and set `roles` (in production, roles is mandatory or `/health` returns 403).
2. Configure `data-source.health` with a friendly `name` and `threshold-ms` connectivity budget.
3. Add `health` blocks on important entities with `first` (row sample size) and `threshold-ms`.
4. Run `dab start` and `curl /health`; expect a cached comprehensive report with aggregate `Healthy` status and per-check details.

## Minimal config

```json
"runtime": {
  "health": { "enabled": true, "roles": ["monitoring"], "cache-ttl-seconds": 10, "max-query-parallelism": 4 }
},
"data-source": {
  "health": { "enabled": true, "name": "primary-sql-db", "threshold-ms": 1500 }
},
"entities": {
  "Book": { "health": { "enabled": true, "first": 50, "threshold-ms": 500 } }
}
```

## Guardrails

- The basic root endpoint `/` is always public and returns version/status only — use it for liveness.
- Use `/health` for readiness; protect it via `roles` in production (`["anonymous"]` to expose publicly).
- The runtime concurrency key is `max-query-parallelism` (range 1-8), not `max-dop`; set `cache-ttl-seconds` to `0` to disable report caching.
- Stored procedures are excluded from health checks (nondeterministic, parameter-required).
- Entity checks respect REST/GraphQL enablement and authorization; failures can indicate role permissions, latency threshold breaches, or data-source errors.

## Related skills

- `data-api-builder-config`
- `data-api-builder-cli`
- `data-api-builder-auth`
- `data-api-builder-observability`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/monitor/health-checks
