---
name: data-api-builder-mcp
description: Enable and control Data API Builder MCP endpoints, client configuration, and tool-surface safety.
license: MIT
---

# Data API Builder MCP

## Use when

- Enabling `/mcp` for AI workflows.
- Configuring client entries (for example VS Code MCP settings).
- Restricting DML tool exposure.

## Workflow

1. Enable runtime MCP block.
2. Ensure entity permissions align with intended tool usage.
3. Validate MCP endpoint and tool listing.

## Guardrails

- Keep MCP endpoint distinct from REST/GraphQL endpoints.
- Restrict write/delete operations when not needed.
- Keep tool descriptions meaningful for agent reasoning.

## Related skills

- `data-api-builder-config`
- `aspire-mcp-inspector`
- `azure-mcp-inspector`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/mcp/overview
