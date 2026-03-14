---
name: azure-mcp-inspector
description: Deploy MCP Inspector to Azure Container Apps with a single-origin routing pattern suitable for browser-based MCP debugging.
license: MIT
---

# Azure MCP Inspector

## Use when

- Publishing MCP Inspector in Azure for remote debugging.
- Needing stable browser connectivity with ACA ingress constraints.

## Workflow

1. Build inspector image with proxy/routing strategy.
2. Deploy as ACA app behind single ingress.
3. Configure DAB MCP target URL.
4. Validate tool listing and connectivity.

## Guardrails

- Keep UI and proxy routes consistent.
- Verify upstream DAB `/mcp` health.

## Related skills

- `azure-data-api-builder`
- `data-api-builder-mcp`

## Microsoft Learn

- https://learn.microsoft.com/azure/container-apps/overview
