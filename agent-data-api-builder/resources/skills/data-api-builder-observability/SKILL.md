---
name: data-api-builder-observability
description: Wire Data API Builder telemetry to Application Insights, Azure Log Analytics, or any OpenTelemetry backend.
license: MIT
---

# Data API Builder Observability

## Use when

- Tracing REST, GraphQL, MCP, and database activity end-to-end.
- Shipping metrics (request count, errors, duration, active requests) to Azure Monitor or a collector.
- Diagnosing latency or error spikes across scaled-out DAB instances.

## Workflow

1. Stand up a destination: an OTLP-compatible collector, Jaeger, Aspire dashboard, or Azure Monitor exporter.
2. Add `runtime.telemetry.open-telemetry` (endpoint, protocol, service-name) and/or `application-insights.connection-string`.
3. Use `dab add-telemetry --otel-enabled true --otel-endpoint ... --otel-protocol grpc --otel-service-name dab` to scaffold.
4. Start DAB, drive traffic, and confirm traces/metrics appear; query with KQL in Log Analytics if using App Insights.

## Minimal config

```json
"runtime": {
  "telemetry": {
    "application-insights": { "enabled": true, "connection-string": "InstrumentationKey=..." },
    "open-telemetry": { "enabled": true, "endpoint": "http://otel-collector:4317", "exporter-protocol": "grpc", "service-name": "dab" }
  }
}
```

## Guardrails

- Allow a graceful shutdown window; ephemeral containers can exit before OTel exports flush.
- Don't log connection strings or PII via custom headers; treat `headers` as a secret.
- Sampling is controlled by the .NET OpenTelemetry SDK defaults; tune at the collector for high-throughput services.
- OpenTelemetry options are configured via `dab add-telemetry`, not `dab configure`.

## Related skills

- `data-api-builder-config`
- `data-api-builder-health`
- `data-api-builder-caching`
- `aspire-data-api-builder`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/monitor/open-telemetry
