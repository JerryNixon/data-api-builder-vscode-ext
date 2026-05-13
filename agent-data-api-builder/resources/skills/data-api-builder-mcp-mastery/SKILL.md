---
name: data-api-builder-mcp-mastery
description: Polish Data API Builder SQL MCP Server surfaces with descriptions, curated tools, and role-gated DML for reliable agent use.
license: MIT
---

# Data API Builder MCP Mastery

## Use when

- An existing MCP endpoint works but agents pick wrong tools or hallucinate parameters.
- Tightening the tool surface: hiding entities and exposing curated stored procedures as custom tools.
- Hardening DML so writes only run under authenticated roles.

## Workflow

1. Set `runtime.mcp.description`; DAB sends it as MCP `instructions` during initialization.
2. Add `entity.description` and `fields[]` entries with `name`, `description`, and `primary-key` where needed.
3. For stored procedures, describe the entity and `source.parameters[]` (`name`, `description`, `required`, `default`).
4. Prune with `runtime.mcp.dml-tools` globally and entity `mcp.dml-tools: false` locally.
5. For curated stored procedures, set entity `mcp.custom-tool: true` so the procedure appears as a named tool.
6. Validate with MCP Inspector: tool list, `describe_entities`, CRUD operations, and stored-procedure calls.

## Guardrails

- Descriptions flow through `describe_entities`; missing `fields[]` metadata can leave agents with empty field arrays.
- DAB intentionally does not support NL2SQL; don't try to bolt it on — expose deterministic tools instead.
- Per-tool toggles exist only under `runtime.mcp.dml-tools`; entity `mcp` is a gate, not per-tool CRUD control.
- Entity RBAC, field include/exclude rules, and policies apply through MCP; hidden fields stay hidden.
- Avoid `anonymous` writes; if unauthenticated access is required, grant the narrowest read/execute actions.

## Related skills

- `data-api-builder-mcp`
- `data-api-builder-config`
- `data-api-builder-auth`
- `aspire-mcp-inspector`
- `azure-mcp-inspector`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/mcp/
- https://learn.microsoft.com/azure/data-api-builder/mcp/how-to-add-descriptions
- https://learn.microsoft.com/azure/data-api-builder/mcp/data-manipulation-language-tools
