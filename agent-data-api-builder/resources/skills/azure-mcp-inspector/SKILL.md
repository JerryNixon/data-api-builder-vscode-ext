---
name: azure-mcp-inspector
description: Deploy MCP Inspector to Azure Container Apps using an nginx same-origin proxy so UI and proxy work behind a single ingress port.
---

# MCP Inspector on Azure Container Apps

Azure Container Apps exposes one ingress port. MCP Inspector uses UI + proxy ports, so deploy with **nginx same-origin routing**.

## When to use

- Deploy Inspector to Azure Container Apps
- Preconfigure transport/server URL for users
- Avoid direct `:6277` proxy connectivity issues

## Required pattern

1. Build a custom image with:
   - Inspector
   - nginx
   - entrypoint script
2. Expose port `80` only.
3. Route:
   - `/config`, `/mcp`, `/stdio`, `/sse`, `/message`, `/health` → Inspector proxy
   - `/` → Inspector UI
4. Set `MCP_SERVER_URL` to DAB `/mcp` endpoint.

## Minimal container contract

Environment variables:
- `HOST=0.0.0.0`
- `MCP_AUTO_OPEN_ENABLED=false`
- `DANGEROUSLY_OMIT_AUTH=true`
- `MCP_SERVER_URL=https://<dab-fqdn>/mcp`

## Why this works

- Single public origin for browser + proxy requests
- No browser attempt to hit non-exposed `:6277`
- `/config` can prefill transport and server URL

## Bicep essentials

- Container app ingress `external: true`, `targetPort: 80`
- ACR-backed image
- Env vars wired in container spec
- Scale can be low (`minReplicas: 0`, `maxReplicas: 1`) for admin tooling

## Troubleshooting

- **UI loads, connect fails**: check nginx routes for `/mcp` and `/config`.
- **Defaults not prefilled**: `MCP_SERVER_URL` missing or entrypoint not passing args.
- **502 at startup**: short warm-up race; retry after container is ready.
- **Timeout to backend**: verify DAB URL and health endpoint accessibility.

### Route syntax for streaming endpoints

```nginx
location /mcp {
   proxy_pass http://127.0.0.1:6277;
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_buffering off;
}
```

### Required env var syntax

```text
HOST=0.0.0.0
MCP_AUTO_OPEN_ENABLED=false
DANGEROUSLY_OMIT_AUTH=true
MCP_SERVER_URL=https://<dab-fqdn>/mcp
```

## Completion checks

- Inspector URL opens with plain origin URL
- Transport is `streamable-http`
- Connect works against DAB MCP endpoint
- Tool list is visible in UI

## Related

- Local inspector setup: `aspire-mcp-inspector`
- Azure DAB deployment: `azure-data-api-builder`
