---
name: aspire-mcp-inspector
description: Add MCP Inspector to a .NET Aspire AppHost for debugging MCP servers such as Data API Builder.
---

# MCP Inspector in .NET Aspire

Use this skill to run MCP Inspector as an Aspire-managed resource next to your MCP server.

## When to use

- Add Inspector to Aspire AppHost
- Debug MCP connectivity/tool discovery
- Test DAB MCP endpoints locally

## Canonical pattern

```csharp
var mcpInspector = builder
    .AddMcpInspector("mcp-inspector", options =>
    {
        options.InspectorVersion = "0.20.0";
    })
    .WithMcpServer(dabServer, transportType: McpTransportType.StreamableHttp)
    .WithParentRelationship(dabServer)
    .WithEnvironment("DANGEROUSLY_OMIT_AUTH", "true")
    .WaitFor(dabServer);
```

## Critical defaults

- Pin Inspector version (avoid buggy defaults).
- Use `StreamableHttp` for DAB.
- For local dev, set `DANGEROUSLY_OMIT_AUTH=true` to avoid auth-token friction.
- Do not override generated dashboard URLs in a way that removes Inspector links.

## Troubleshooting

- **Connection Error**: transport mismatch (`Sse` vs `StreamableHttp`) or MCP server not healthy.
- **Auth prompt**: missing `DANGEROUSLY_OMIT_AUTH=true`.
- **No server URL prefill**: verify `WithMcpServer(...)` targets the right resource.

### Transport syntax

```csharp
// WRONG for DAB
.WithMcpServer(dabServer, transportType: McpTransportType.Sse)

// CORRECT for DAB
.WithMcpServer(dabServer, transportType: McpTransportType.StreamableHttp)
```

### Dependency wait syntax

```csharp
// CORRECT: Inspector waits for running MCP server resource
.WaitFor(dabServer)
```

## Prerequisites

- Node.js + `npx` available on host
- MCP server resource (for example DAB) already configured
- Docker running if MCP server is containerized

## Completion checks

- Inspector appears in Aspire dashboard
- Inspector UI opens successfully
- Connection succeeds and MCP tools are listed

## Related

- Azure deployment: `azure-mcp-inspector`
- Local DAB stack: `aspire-data-api-builder`
