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
4. Run `dab start` and `curl /health`; expect a `Healthy` status aggregating all checks.

## Minimal config

```json
"runtime": {
  "health": { "enabled": true, "roles": ["monitoring"], "cache-ttl-seconds": 10, "max-query-parallelism": 4 }
}
```

## Guardrails

- The basic root endpoint `/` is always public and returns version/status only — use it for liveness.
- Use `/health` for readiness; protect it via `roles` in production (`["anonymous"]` to expose publicly).
- Stored procedures are excluded from health checks (nondeterministic, parameter-required).
- A failing entity check usually means the configured role lacks permission — check RBAC first.

## Related skills

- `data-api-builder-config`
- `data-api-builder-cli`
- `data-api-builder-auth`
- `data-api-builder-observability`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/monitor/health-checks
