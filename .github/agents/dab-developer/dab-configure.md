# dab configure Command Reference

## Purpose

The `dab configure` command modifies runtime settings in the DAB configuration without affecting entity definitions. Use it to change REST, GraphQL, MCP, cache, authentication, CORS, and telemetry settings.

## Syntax

```bash
dab configure [options]
```

## Key Principle

`dab configure` modifies the `runtime` section and `data-source` section of the configuration. It does NOT modify entities. For entity changes, use `dab update`.

---

## Data Source Options

| Option | Type | Description |
|--------|------|-------------|
| `--data-source.database-type` | string | Change database type |
| `--data-source.connection-string` | string | Change connection string |
| `--data-source.options.set-session-context` | boolean | (MSSQL) Enable session context |

### Example: Change Connection String
```bash
dab configure \
  --data-source.connection-string "@env('PROD_CONNECTION_STRING')"
```

### Example: Enable Session Context
```bash
dab configure \
  --data-source.options.set-session-context true
```

---

## REST Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--runtime.rest.enabled` | boolean | true | Enable/disable REST endpoint |
| `--runtime.rest.path` | string | /api | REST API base path |
| `--runtime.rest.request-body-strict` | boolean | true | Reject unknown fields |

### Example: Disable REST
```bash
dab configure --runtime.rest.enabled false
```

### Example: Change REST Path
```bash
dab configure --runtime.rest.path "/v1/api"
```

### Example: Allow Extra Fields
```bash
dab configure --runtime.rest.request-body-strict false
```

---

## GraphQL Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--runtime.graphql.enabled` | boolean | true | Enable/disable GraphQL |
| `--runtime.graphql.path` | string | /graphql | GraphQL endpoint path |
| `--runtime.graphql.allow-introspection` | boolean | true | Allow introspection queries |
| `--runtime.graphql.depth-limit` | number | | Maximum query depth |
| `--runtime.graphql.multiple-create.enabled` | boolean | false | Allow multiple-create mutations |

### Example: Disable GraphQL
```bash
dab configure --runtime.graphql.enabled false
```

### Example: Disable Introspection (Production)
```bash
dab configure --runtime.graphql.allow-introspection false
```

### Example: Enable Multiple Create
```bash
dab configure --runtime.graphql.multiple-create.enabled true
```

### Example: Limit Query Depth
```bash
dab configure --runtime.graphql.depth-limit 5
```

---

## MCP Options (DAB 1.7+)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--runtime.mcp.enabled` | boolean | false | Enable MCP Server |
| `--runtime.mcp.path` | string | /mcp | MCP endpoint path |

### Example: Enable MCP
```bash
dab configure \
  --runtime.mcp.enabled true \
  --runtime.mcp.path "/mcp"
```

### Example: Disable MCP
```bash
dab configure --runtime.mcp.enabled false
```

---

## Host Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--runtime.host.mode` | string | development | Host mode: development or production |
| `--runtime.host.cors.origins` | string | | CORS allowed origins (comma-separated) |
| `--runtime.host.cors.allow-credentials` | boolean | false | Allow credentials in CORS |

### Example: Set Development Mode
```bash
dab configure --runtime.host.mode development
```

### Example: Set Production Mode
```bash
dab configure --runtime.host.mode production
```

### Example: Configure CORS
```bash
dab configure \
  --runtime.host.cors.origins "http://localhost:3000,https://myapp.com" \
  --runtime.host.cors.allow-credentials true
```

---

## Authentication Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--runtime.host.authentication.provider` | string | StaticWebApps | Auth provider type |
| `--runtime.host.authentication.jwt.audience` | string | | JWT audience |
| `--runtime.host.authentication.jwt.issuer` | string | | JWT issuer URL |

### Provider Types

| Provider | Description |
|----------|-------------|
| `StaticWebApps` | Azure Static Web Apps built-in auth |
| `AppService` | Azure App Service Easy Auth |
| `AzureAd` | Azure Active Directory / Entra ID |
| `Simulator` | Development simulator (any token accepted) |

### Example: Static Web Apps Auth (Default)
```bash
dab configure \
  --runtime.host.authentication.provider StaticWebApps
```

### Example: Azure AD / Entra ID Auth
```bash
dab configure \
  --runtime.host.authentication.provider AzureAd \
  --runtime.host.authentication.jwt.audience "api://my-app-id" \
  --runtime.host.authentication.jwt.issuer "https://login.microsoftonline.com/my-tenant-id/v2.0"
```

### Example: App Service Easy Auth
```bash
dab configure \
  --runtime.host.authentication.provider AppService \
  --runtime.host.authentication.jwt.audience "my-app-audience"
```

### Example: Development Simulator
```bash
dab configure \
  --runtime.host.authentication.provider Simulator
```

**Warning:** Never use `Simulator` in production. It accepts any JWT token without validation.

---

## Cache Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--runtime.cache.enabled` | boolean | false | Enable global caching |
| `--runtime.cache.ttl-seconds` | number | 5 | Default cache TTL |

### Example: Enable Caching
```bash
dab configure \
  --runtime.cache.enabled true \
  --runtime.cache.ttl-seconds 30
```

### Example: Disable Caching
```bash
dab configure --runtime.cache.enabled false
```

---

## Telemetry Options

| Option | Type | Description |
|--------|------|-------------|
| `--runtime.telemetry.application-insights.enabled` | boolean | Enable Application Insights |
| `--runtime.telemetry.application-insights.connection-string` | string | App Insights connection string |

### Example: Enable Application Insights
```bash
dab configure \
  --runtime.telemetry.application-insights.enabled true \
  --runtime.telemetry.application-insights.connection-string "@env('APPLICATIONINSIGHTS_CONNECTION_STRING')"
```

---

## Health Check Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--runtime.health.enabled` | boolean | false | Enable health endpoint |
| `--runtime.health.path` | string | /health | Health endpoint path |

### Example: Enable Health Checks
```bash
dab configure \
  --runtime.health.enabled true \
  --runtime.health.path "/health"
```

---

## Pagination Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--runtime.pagination.default-page-size` | number | 100 | Default items per page |
| `--runtime.pagination.max-page-size` | number | 100000 | Maximum items per page |

### Example: Configure Pagination
```bash
dab configure \
  --runtime.pagination.default-page-size 50 \
  --runtime.pagination.max-page-size 500
```

---

## Configuration File Options

| Option | Type | Description |
|--------|------|-------------|
| `--config`, `-c` | string | Config file path |

### Example: Configure Specific File
```bash
dab configure --config ./configs/dab-config.production.json \
  --runtime.host.mode production
```

---

## Complete Configuration Examples

### Development Configuration
```bash
dab configure \
  --runtime.host.mode development \
  --runtime.host.cors.origins "http://localhost:3000" \
  --runtime.rest.enabled true \
  --runtime.graphql.enabled true \
  --runtime.graphql.allow-introspection true \
  --runtime.mcp.enabled true \
  --runtime.cache.enabled true \
  --runtime.cache.ttl-seconds 5 \
  --runtime.health.enabled true
```

### Production Configuration
```bash
dab configure \
  --runtime.host.mode production \
  --runtime.host.cors.origins "https://myapp.com" \
  --runtime.rest.enabled true \
  --runtime.graphql.enabled true \
  --runtime.graphql.allow-introspection false \
  --runtime.mcp.enabled false \
  --runtime.cache.enabled true \
  --runtime.cache.ttl-seconds 60 \
  --runtime.host.authentication.provider AzureAd \
  --runtime.host.authentication.jwt.audience "api://my-app" \
  --runtime.host.authentication.jwt.issuer "https://login.microsoftonline.com/my-tenant/v2.0" \
  --runtime.telemetry.application-insights.enabled true \
  --runtime.telemetry.application-insights.connection-string "@env('APPINSIGHTS_CONNECTION_STRING')"
```

### API-Only Configuration (No MCP)
```bash
dab configure \
  --runtime.rest.enabled true \
  --runtime.graphql.enabled true \
  --runtime.mcp.enabled false \
  --runtime.health.enabled true
```

### MCP-Only Configuration (For AI Agents)
```bash
dab configure \
  --runtime.rest.enabled false \
  --runtime.graphql.enabled false \
  --runtime.mcp.enabled true \
  --runtime.mcp.path "/mcp"
```

### High-Traffic API Configuration
```bash
dab configure \
  --runtime.cache.enabled true \
  --runtime.cache.ttl-seconds 120 \
  --runtime.pagination.default-page-size 25 \
  --runtime.pagination.max-page-size 100
```

---

## Resulting Configuration Structure

After running `dab configure`, the `runtime` section looks like:

```json
{
  "runtime": {
    "rest": {
      "enabled": true,
      "path": "/api",
      "request-body-strict": true
    },
    "graphql": {
      "enabled": true,
      "path": "/graphql",
      "allow-introspection": false,
      "multiple-create": {
        "enabled": false
      }
    },
    "mcp": {
      "enabled": true,
      "path": "/mcp"
    },
    "host": {
      "mode": "production",
      "cors": {
        "origins": ["https://myapp.com"],
        "allow-credentials": true
      },
      "authentication": {
        "provider": "AzureAd",
        "jwt": {
          "audience": "api://my-app",
          "issuer": "https://login.microsoftonline.com/my-tenant/v2.0"
        }
      }
    },
    "cache": {
      "enabled": true,
      "ttl-seconds": 60
    },
    "pagination": {
      "default-page-size": 100,
      "max-page-size": 100000
    },
    "telemetry": {
      "application-insights": {
        "enabled": true,
        "connection-string": "@env('APPINSIGHTS_CONNECTION_STRING')"
      }
    },
    "health": {
      "enabled": true,
      "path": "/health"
    }
  }
}
```

---

## Common Mistakes

### 1. Confusing with dab update

```bash
# Wrong - dab configure doesn't modify entities
dab configure --permissions "admin:*"

# Correct - use dab update for entities
dab update Product --permissions "admin:*"
```

### 2. Missing JWT Configuration for AzureAd

```bash
# Wrong - missing audience and issuer
dab configure --runtime.host.authentication.provider AzureAd

# Correct - include required JWT settings
dab configure \
  --runtime.host.authentication.provider AzureAd \
  --runtime.host.authentication.jwt.audience "api://my-app" \
  --runtime.host.authentication.jwt.issuer "https://login.microsoftonline.com/tenant/v2.0"
```

### 3. Using Simulator in Production

```bash
# DANGEROUS - accepts any token
dab configure --runtime.host.authentication.provider Simulator

# Safe - use proper auth provider
dab configure --runtime.host.authentication.provider AzureAd ...
```

### 4. Hardcoding Connection Strings

```bash
# Bad - secrets in config file
dab configure --data-source.connection-string "Server=...;Password=secret"

# Good - use environment variable
dab configure --data-source.connection-string "@env('DATABASE_CONNECTION_STRING')"
```

---

## Next Steps

- See [runtime.md](runtime.md) for detailed runtime configuration schema
- See [dab-validate.md](dab-validate.md) to validate your configuration
- See [dab-start.md](dab-start.md) to run the engine
