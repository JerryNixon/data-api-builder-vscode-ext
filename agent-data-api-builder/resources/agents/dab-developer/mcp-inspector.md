# MCP Inspector with Data API Builder

## Overview

MCP Inspector is a debugging tool for Model Context Protocol (MCP) servers. Data API Builder can act as an MCP server, and MCP Inspector allows developers to test and debug MCP tool calls interactively.

## Critical Configuration Requirements

### 1. Container Networking

**Container-to-container communication must use Docker Compose service names, NOT localhost:**

| Context | Correct | Wrong |
|---------|---------|-------|
| Container → Container | `Server=sql-server` | `Server=localhost` |
| Container → Container | `http://data-api-builder:5000/mcp` | `http://localhost:5000/mcp` |
| Host → Container | `Server=localhost,14330` | N/A |

### 2. MCP Inspector Environment Variables

```yaml
mcp-inspector:
  image: ghcr.io/modelcontextprotocol/inspector:latest
  container_name: mcp-inspector
  restart: unless-stopped
  environment:
    - HOST=0.0.0.0                    # Required: Listen on all interfaces
    - MCP_AUTO_OPEN_ENABLED=false     # Required: Don't open browser in container
    - DANGEROUSLY_OMIT_AUTH=true      # Required: Disable session token requirement
  ports:
    - "6274:6274"                      # Web UI
    - "6277:6277"                      # Proxy server
  depends_on:
    - data-api-builder
```

**Why `DANGEROUSLY_OMIT_AUTH=true` is required:**
- MCP Inspector generates a session token on startup
- Without this setting, connections fail with OAuth/authentication errors
- For local development in isolated Docker networks, this is acceptable

### 3. Data API Builder MCP Configuration

**dab-config.json must include:**

```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/download/v1.7.83-rc/dab.draft.schema.json",
  "runtime": {
    "rest": { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql", "allow-introspection": true },
    "mcp": { 
      "enabled": true, 
      "path": "/mcp" 
    },
    "host": {
      "cors": { "origins": ["*"] },
      "authentication": { "provider": "StaticWebApps" },
      "mode": "development"
    }
  }
}
```

**Entities must have anonymous permissions for MCP:**

```json
"permissions": [
  { "role": "anonymous", "actions": [{ "action": "*" }] }
]
```

### 4. The Pre-Configured Connection URL

**MCP Inspector does NOT auto-connect.** Users must use a special URL with query parameters:

```
http://localhost:6274/?transport=streamable-http&serverUrl=http%3A%2F%2Fdata-api-builder%3A5000%2Fmcp
```

URL-decoded parameters:
- `transport=streamable-http` - DAB uses Streamable HTTP transport
- `serverUrl=http://data-api-builder:5000/mcp` - Docker service name, NOT localhost

**Plain `http://localhost:6274` will NOT work** - it opens the UI but doesn't connect to DAB.

## Complete Docker Compose Example

```yaml
name: sql-dev

services:
  sql-server:
    image: mcr.microsoft.com/mssql/server:2025-latest
    container_name: sql-server-2025
    restart: unless-stopped
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=YourStrong@Passw0rd
    ports:
      - "14330:1433"
    volumes:
      - sqlserver-data:/var/opt/mssql
    healthcheck:
      test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  data-api-builder:
    image: mcr.microsoft.com/azure-databases/data-api-builder:1.7.83-rc
    container_name: data-api-builder
    restart: unless-stopped
    environment:
      - DATABASE_CONNECTION_STRING=Server=sql-server;Database=TodoDb;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true
    ports:
      - "5000:5000"
    volumes:
      - ./dab-config.json:/App/dab-config.json:ro
    depends_on:
      sql-server:
        condition: service_healthy

  mcp-inspector:
    image: ghcr.io/modelcontextprotocol/inspector:latest
    container_name: mcp-inspector
    restart: unless-stopped
    environment:
      - HOST=0.0.0.0
      - MCP_AUTO_OPEN_ENABLED=false
      - DANGEROUSLY_OMIT_AUTH=true
    ports:
      - "6274:6274"
      - "6277:6277"
    depends_on:
      - data-api-builder

volumes:
  sqlserver-data:
    external: false
```

## Troubleshooting

### "Connection failed" or "OAuth error"

**Cause:** Missing `DANGEROUSLY_OMIT_AUTH=true` environment variable.

**Fix:** Add to mcp-inspector service:
```yaml
environment:
  - DANGEROUSLY_OMIT_AUTH=true
```

### Inspector opens but doesn't connect

**Cause:** Using plain `http://localhost:6274` URL.

**Fix:** Use the pre-configured URL:
```
http://localhost:6274/?transport=streamable-http&serverUrl=http%3A%2F%2Fdata-api-builder%3A5000%2Fmcp
```

### "Cannot connect to server"

**Cause:** Using `localhost` instead of Docker service name in serverUrl.

**Fix:** The serverUrl must use the Docker Compose service name:
- ✅ `http://data-api-builder:5000/mcp`
- ❌ `http://localhost:5000/mcp`

### MCP endpoint returns 404

**Cause:** MCP not enabled in dab-config.json or using wrong DAB version.

**Fix:** 
1. Ensure `runtime.mcp.enabled: true` in dab-config.json
2. Use DAB version 1.7.83-rc or later (MCP is a preview feature)

## Verification Commands

```bash
# Check all containers running
docker compose ps

# Test DAB REST endpoint (should return data)
curl http://localhost:5000/api/Todo

# Test DAB MCP endpoint (400 is expected for GET - MCP uses POST)
curl http://localhost:5000/mcp

# Test container-to-container connectivity from Inspector
docker exec mcp-inspector node -e "fetch('http://data-api-builder:5000/mcp').then(r => console.log(r.status))"
```

## QUICKSTART.md Template

Always generate a QUICKSTART.md with clickable links for the user:

```markdown
# SQL Dev Environment - Quick Reference

## 🔗 Service URLs

| Service | URL |
|---------|-----|
| SQL Commander | http://localhost:8080 |
| REST API | http://localhost:5000/api/{EntityName} |
| GraphQL | http://localhost:5000/graphql |
| **MCP Inspector** | [**Click to Connect →**](http://localhost:6274/?transport=streamable-http&serverUrl=http%3A%2F%2Fdata-api-builder%3A5000%2Fmcp) |

> ⚠️ MCP Inspector requires the special link above - plain `localhost:6274` won't auto-connect to DAB.

## Commands

\`\`\`bash
docker compose up -d    # Start
docker compose down     # Stop
docker compose down -v  # Stop + delete data
\`\`\`

## SQL Server Connection

**From host**: `Server=localhost,14330;Database={DbName};User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true`
```

**Important:** Regenerate QUICKSTART.md whenever the environment changes to keep URLs and entity names current.
