---
name: aspire-mcp-inspector
description: Add MCP Inspector to .NET Aspire AppHost for local SQL MCP Server validation and tool discovery.
license: MIT
---

# Aspire MCP Inspector

## Use when

- Debugging MCP endpoint connectivity in Aspire.
- Validating MCP tool availability from DAB.
- Reproducing the Microsoft Learn Aspire quickstart pattern.

## Workflow

1. Add `CommunityToolkit.Aspire.Hosting.McpInspector` to the AppHost.
2. Run the DAB container with `dab-config.json` mounted and an HTTP endpoint.
3. Add Inspector with `AddMcpInspector("mcp-inspector").WithMcpServer(mcp)`.
4. Use the Aspire dashboard Inspector link; ports are assigned dynamically.
5. Validate `list_tools`, `describe_entities`, and a safe `read_records` call.

## Guardrails

- SQL MCP Server uses streamable HTTP at `/mcp` in the Aspire container pattern.
- Ensure target MCP resource is healthy before inspector startup.
- Keep Inspector local to Aspire dev; it is a browser UI plus proxy, not a production gateway.
- If tools are missing, check DAB version, `runtime.mcp.enabled`, entity `mcp.dml-tools`, and role permissions.

## Related skills

- `data-api-builder-mcp`
- `data-api-builder-mcp-mastery`
- `aspire-data-api-builder`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/mcp/quickstart-dotnet-aspire
- https://github.com/modelcontextprotocol/inspector
