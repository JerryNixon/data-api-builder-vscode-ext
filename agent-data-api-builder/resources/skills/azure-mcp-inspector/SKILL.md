---
name: azure-mcp-inspector
description: Safely use MCP Inspector with Azure-hosted SQL MCP Server endpoints for remote debugging.
license: MIT
---

# Azure MCP Inspector

## Use when

- Debugging an Azure-hosted DAB `/mcp` endpoint from MCP Inspector.
- Considering whether to host Inspector in Azure Container Apps.

## Workflow

1. Prefer local Inspector against the remote endpoint: `npx -y @modelcontextprotocol/inspector https://<host>/mcp`.
2. If hosting Inspector in Azure, use the official image and keep ingress authenticated or IP-restricted.
3. Preserve the Inspector UI/proxy pairing: web UI on 6274, proxy on 6277, or front both with a trusted same-origin route.
4. Configure the target as streamable HTTP with the DAB `/mcp` URL.
5. Validate `/health`, then `list_tools`, `describe_entities`, and one safe read.

## Guardrails

- Do not expose the Inspector proxy to untrusted networks; it can connect to arbitrary servers and spawn local processes in some modes.
- Keep proxy authentication enabled; never set `DANGEROUSLY_OMIT_AUTH=true` in hosted scenarios.
- Protect the DAB endpoint separately with App Service, Entra ID, APIM, or ACA ingress controls.
- Anonymous DAB access is allowed only if `anonymous` permissions are intentionally narrow.

## Related skills

- `azure-data-api-builder`
- `data-api-builder-mcp`
- `data-api-builder-mcp-mastery`

## Microsoft Learn

- https://learn.microsoft.com/azure/container-apps/overview
- https://learn.microsoft.com/azure/data-api-builder/mcp/quickstart-azure-container-apps
- https://github.com/modelcontextprotocol/inspector
