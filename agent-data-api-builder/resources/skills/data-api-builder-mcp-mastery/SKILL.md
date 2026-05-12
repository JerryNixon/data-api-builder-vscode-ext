---
name: data-api-builder-mcp-mastery
description: Polish Data API Builder MCP surfaces with high-quality descriptions, pruned tools, and safe role-gated DML for reliable agent use.
license: MIT
---

# Data API Builder MCP Mastery

## Use when

- An existing MCP endpoint works but agents pick wrong tools or hallucinate parameters.
- Tightening the tool surface: hiding entities, exposing curated stored procedures, adding custom tools.
- Hardening DML so writes only run under authenticated roles.

## Workflow

1. Set `runtime.mcp.description` (server purpose) — clients surface this as MCP `instructions`.
2. Add a clear `description` to every exposed entity, mapped column/field, and stored-procedure parameter.
3. Prune: disable MCP on entities the agent shouldn't see; promote curated sprocs as tools with intent-revealing names.
4. Enable `mcp.custom-tool: true` on stored procedures you want surfaced as first-class tools.
5. Gate Create/Update/Delete behind authenticated roles; keep `anonymous` read-only or off.
6. Validate with MCP Inspector (`npx @modelcontextprotocol/inspector http://localhost:5000/mcp`) — confirm tool list, descriptions, and parameter schemas.

## Guardrails

- Descriptions are the primary signal an agent uses to choose a tool — treat them like API docs, not afterthoughts.
- DAB intentionally does not support NL2SQL; don't try to bolt it on — expose deterministic tools instead.
- Never expose DML to `anonymous`; use the simulator provider only for local stdio dev.
- Entity-level RBAC still applies through MCP — a hidden field stays hidden in tool schemas.

## Related skills

- `data-api-builder-mcp`
- `data-api-builder-config`
- `data-api-builder-auth`
- `aspire-mcp-inspector`
- `azure-mcp-inspector`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/mcp/
