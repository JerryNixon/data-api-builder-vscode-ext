---
name: data-api-builder-mcp
description: Enable and secure Data API Builder MCP endpoints so AI agents can query databases through DAB tools. Use when asked to set up /mcp, client config, or MCP tool restrictions.
license: MIT
---

# Data API Builder MCP

This skill configures **MCP access through DAB** (v1.7+). MCP is part of DAB, not a separate server product.

## Included script template

- [write-vscode-mcp.ps1](./scripts/write-vscode-mcp.ps1) — creates/updates `.vscode/mcp.json` with a DAB MCP server entry.

## When to use

- Enable `/mcp` endpoint
- Configure MCP client access (for example `.vscode/mcp.json`)
- Restrict agent write/delete capabilities
- Deploy MCP-capable DAB locally or in Azure

## Fast setup

1. Install/upgrade DAB prerelease (1.7+)
2. Ensure `runtime.mcp.enabled: true`
3. Add entities + permissions
4. Validate and start
5. Connect MCP client to `/mcp`

```bash
dotnet tool update microsoft.dataapibuilder --prerelease
dab validate && dab start
```

## Minimal MCP runtime block

```json
"runtime": {
  "mcp": {
    "enabled": true,
    "path": "/mcp"
  }
}
```

## Client config example (VS Code)

```json
{
  "servers": {
    "my-database": {
      "type": "http",
      "url": "http://localhost:5000/mcp"
    }
  }
}
```

## Security model

MCP operations still use DAB RBAC and entity abstraction.

- Table/view operations: `create`, `read`, `update`, `delete`
- Stored procedure operations: `execute`
- Restrict globally or per-entity with `mcp.dml-tools`

Example: disable delete globally:

```bash
dab configure --runtime.mcp.dml-tools.delete-record false
```

## Troubleshooting (syntax gotchas)

### Wrong endpoint path

```text
# WRONG
http://localhost:5000/api

# CORRECT
http://localhost:5000/mcp
```

### Wrong client transport assumptions

Use MCP over HTTP with an MCP URL (not GraphQL/REST URLs):

```json
{
  "servers": {
    "my-database": {
      "type": "http",
      "url": "http://localhost:5000/mcp"
    }
  }
}
```

### Stored procedure permission mismatch

```bash
# WRONG
dab add GetReport --source dbo.usp_GetReport --source.type stored-procedure --permissions "anonymous:read"

# CORRECT
dab add GetReport --source dbo.usp_GetReport --source.type stored-procedure --permissions "anonymous:execute"
```

### DML tool key names are hyphenated

```bash
# CORRECT
dab configure --runtime.mcp.dml-tools.delete-record false
```

## Description quality for AI

Add meaningful descriptions to entities/fields so agents reason better.

```bash
dab update Products --description "Product catalog with price and inventory"
```

## Deployment notes

- Local: Docker/Aspire + `http://localhost:5000/mcp`
- Azure: build custom DAB image with embedded `dab-config.json`; do not use Azure Files mounts for config

## Completion checks

- `/mcp` endpoint reachable
- `describe_entities` returns expected entities
- Role restrictions behave as intended
- Unwanted write/delete tools are disabled where required

## References

- https://learn.microsoft.com/azure/data-api-builder/mcp/overview
- https://learn.microsoft.com/azure/data-api-builder/mcp/data-manipulation-language-tools
- https://learn.microsoft.com/azure/data-api-builder/mcp/quickstart-visual-studio-code
