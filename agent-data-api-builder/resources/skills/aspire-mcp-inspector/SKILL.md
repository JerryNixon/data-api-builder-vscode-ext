---
name: aspire-mcp-inspector
description: Add MCP Inspector to .NET Aspire AppHost for local MCP endpoint validation and tool discovery.
license: MIT
---

# Aspire MCP Inspector

## Use when

- Debugging MCP endpoint connectivity in Aspire.
- Validating MCP tool availability from DAB.

## Workflow

1. Add inspector resource.
2. Wire inspector to DAB MCP resource.
3. Validate transport and tool listing.

## Guardrails

- Match transport to server behavior.
- Ensure target MCP resource is healthy before inspector startup.

## Related skills

- `data-api-builder-mcp`
- `aspire-data-api-builder`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/mcp/quickstart-visual-studio-code
