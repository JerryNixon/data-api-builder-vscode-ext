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

1. Stand up a destination: Application Insights, an OTLP collector/backend, or Azure Log Analytics with DCE/DCR/custom table.
2. Configure `runtime.telemetry`: `application-insights`, `open-telemetry`, `azure-log-analytics`, and optional `log-level`.
3. Use `dab add-telemetry` for App Insights/OTel; use `dab configure` for Log Analytics and log-level filters.
4. Start DAB, drive traffic, and confirm requests, dependencies, traces, metrics, or custom-table logs arrive.

## Minimal config

```json
"runtime": {
  "telemetry": {
    "application-insights": { "enabled": true, "connection-string": "@env('app-insights-connection-string')" },
    "open-telemetry": { "enabled": true, "endpoint": "http://otel-collector:4317", "headers": "@env('otel-headers')", "exporter-protocol": "grpc", "service-name": "dab" },
    "azure-log-analytics": {
      "enabled": true, "dab-identifier": "my-dab-instance", "flush-interval-seconds": 10,
      "auth": { "custom-table-name": "DabLogs_CL", "dcr-immutable-id": "dcr-...", "dce-endpoint": "https://my-dce.eastus-1.ingest.monitor.azure.com" }
    },
    "log-level": { "default": "Warning", "Azure.DataApiBuilder.Core": "Information" }
  }
}
```

## Guardrails

- Allow a graceful shutdown window; ephemeral containers can exit before OTel exports flush.
- Don't log connection strings or PII via custom headers; treat `headers` as a secret.
- Application Insights uses connection strings; avoid bare instrumentation keys except for legacy compatibility.
- OpenTelemetry options are configured via `dab add-telemetry`, not `dab configure`.
- Log Analytics requires Managed Identity with `Monitoring Metrics Publisher` on the DCR and a custom table ending `_CL`.
- App Insights Learn KQL uses `requests`, `dependencies`, `traces`, and `customDimensions`; custom Log Analytics tables use suffixed columns like `Identifier_s`.

## Related skills

- `data-api-builder-config`
- `data-api-builder-health`
- `data-api-builder-caching`
- `aspire-data-api-builder`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/monitor/open-telemetry
- https://learn.microsoft.com/azure/data-api-builder/concept/monitor/application-insights
- https://learn.microsoft.com/azure/data-api-builder/concept/monitor/log-analytics
- https://learn.microsoft.com/azure/data-api-builder/concept/monitor/log-levels
