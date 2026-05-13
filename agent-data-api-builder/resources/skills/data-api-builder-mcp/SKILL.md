---
name: data-api-builder-mcp
description: Enable and control Data API Builder SQL MCP Server endpoints, client configuration, and role-safe tool exposure.
license: MIT
---

# Data API Builder MCP

## Use when

- Enabling or disabling SQL MCP Server at `/mcp`.
- Configuring VS Code or HTTP MCP client entries.
- Restricting generic DML tool exposure without redesigning the API.

## Workflow

1. Require DAB 1.7+; MCP is enabled by default at `runtime.mcp.path` `/mcp`.
2. Set only needed runtime controls: `runtime.mcp.enabled`, `path`, `description`, and `dml-tools`.
3. Use global `runtime.mcp.dml-tools` to disable tool families such as `delete-record`.
4. Use entity `mcp.dml-tools: false` to hide specific entities from MCP.
5. Ensure permissions expose only intended operations to the current role.
6. Validate with MCP Inspector: `npx -y @modelcontextprotocol/inspector http://localhost:5000/mcp`.

## Guardrails

- DAB exposes seven generic tools: `describe_entities`, `create_record`, `read_records`, `update_record`, `delete_record`, `execute_entity`, `aggregate_records`.
- Table/view CRUD is controlled by entity permissions; stored procedures use `execute_entity`.
- Anonymous access is valid only when `anonymous` permissions are intentionally granted; prefer read-only or authenticated roles for writes.
- Browsing `/mcp` directly can look like an error; use an MCP client or Inspector.

## Related skills

- `data-api-builder-config`
- `data-api-builder-mcp-mastery`
- `aspire-mcp-inspector`
- `azure-mcp-inspector`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/mcp/overview
- https://learn.microsoft.com/azure/data-api-builder/configuration/runtime#mcp-runtime
