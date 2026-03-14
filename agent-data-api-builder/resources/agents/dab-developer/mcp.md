# MCP Reference

## Purpose

Enable and control DAB as an MCP server for AI-agent workflows.

## Minimal runtime block

```json
"mcp": {
  "enabled": true,
  "path": "/mcp"
}
```

## Operational points

- MCP access still respects DAB entity permissions.
- Stored procedures can be exposed as custom tools.
- Disable unsafe DML tools where required.

## Client endpoint

- `http://localhost:5000/mcp` (local)

## Related docs

- [runtime.md](runtime.md)
- [mcp-inspector.md](mcp-inspector.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/mcp/overview
