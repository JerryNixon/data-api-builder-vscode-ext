# Runtime Configuration Reference

## Overview

The `runtime` section of the DAB configuration controls global settings for REST, GraphQL, MCP endpoints, authentication, caching, and monitoring.

## Runtime Structure

```json
{
  "runtime": {
    "rest": { ... },
    "graphql": { ... },
    "mcp": { ... },
    "host": { ... },
    "cache": { ... },
    "pagination": { ... },
    "telemetry": { ... },
    "health": { ... }
  }
}
```

---

## REST Configuration

Controls the REST API endpoint.

```json
{
  "rest": {
    "enabled": true,
    "path": "/api",
    "request-body-strict": true
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable REST endpoint |
| `path` | string | "/api" | Base path for REST endpoints |
| `request-body-strict` | boolean | true | Reject requests with unknown fields |

### REST Endpoints Generated

When REST is enabled, each entity gets these endpoints:

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/{entity}` | Read all (with pagination) |
| GET | `/api/{entity}/{key}` | Read one by primary key |
| POST | `/api/{entity}` | Create new record |
| PUT | `/api/{entity}/{key}` | Replace record |
| PATCH | `/api/{entity}/{key}` | Update record |
| DELETE | `/api/{entity}/{key}` | Delete record |

### Stored Procedure Endpoints

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/{entity}?param=value` | Parameters in query string |
| POST | `/api/{entity}` | Parameters in request body |

---

## GraphQL Configuration

Controls the GraphQL API endpoint.

```json
{
  "graphql": {
    "enabled": true,
    "path": "/graphql",
    "allow-introspection": true,
    "depth-limit": null,
    "multiple-create": {
      "enabled": false
    }
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable GraphQL endpoint |
| `path` | string | "/graphql" | GraphQL endpoint path |
| `allow-introspection` | boolean | true | Allow schema introspection |
| `depth-limit` | number | null | Maximum query nesting depth |
| `multiple-create.enabled` | boolean | false | Allow creating multiple items |

### GraphQL Introspection

**Development:** Enable introspection for IDE tooling and schema exploration.
```json
"allow-introspection": true
```

**Production:** Disable to prevent schema exposure.
```json
"allow-introspection": false
```

### Query Depth Limiting

Prevent deeply nested queries that could cause performance issues:
```json
"depth-limit": 5
```

This limits queries like:
```graphql
{
  orders {        # depth 1
    customer {    # depth 2
      orders {    # depth 3
        items {   # depth 4
          product { # depth 5 - max allowed
            ...
          }
        }
      }
    }
  }
}
```

### Multiple Create

When enabled, allows creating multiple records in one mutation:
```json
"multiple-create": {
  "enabled": true
}
```

GraphQL mutation:
```graphql
mutation {
  createProducts(items: [
    { name: "Widget A", price: 10 },
    { name: "Widget B", price: 20 }
  ]) {
    items {
      id
      name
    }
  }
}
```

---

## MCP Configuration (DAB 1.7+)

Controls the Model Context Protocol server for AI agents.

```json
{
  "mcp": {
    "enabled": true,
    "path": "/mcp"
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | false | Enable/disable MCP endpoint |
| `path` | string | "/mcp" | MCP endpoint path |

See [mcp.md](mcp.md) for detailed MCP configuration.

---

## Host Configuration

Controls server behavior, CORS, and authentication.

```json
{
  "host": {
    "mode": "development",
    "cors": {
      "origins": ["http://localhost:3000"],
      "allow-credentials": false
    },
    "authentication": {
      "provider": "StaticWebApps"
    }
  }
}
```

### Host Mode

| Mode | Behavior |
|------|----------|
| `development` | Detailed error messages, GraphQL playground enabled |
| `production` | Minimal error details, optimized for security |

### CORS Configuration

```json
{
  "cors": {
    "origins": ["https://myapp.com", "https://admin.myapp.com"],
    "allow-credentials": true
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `origins` | array | [] | Allowed origins |
| `allow-credentials` | boolean | false | Allow cookies/auth headers |

**Development Example:**
```json
{
  "cors": {
    "origins": ["http://localhost:3000", "http://localhost:5173"],
    "allow-credentials": true
  }
}
```

**Production Example:**
```json
{
  "cors": {
    "origins": ["https://myapp.com"],
    "allow-credentials": true
  }
}
```

### Authentication Configuration

```json
{
  "authentication": {
    "provider": "AzureAd",
    "jwt": {
      "audience": "api://my-app-id",
      "issuer": "https://login.microsoftonline.com/my-tenant-id/v2.0"
    }
  }
}
```

#### Authentication Providers

| Provider | Use Case |
|----------|----------|
| `StaticWebApps` | Azure Static Web Apps built-in auth |
| `AppService` | Azure App Service Easy Auth |
| `AzureAd` | Azure AD / Entra ID with JWT |
| `Simulator` | Development testing (accepts any token) |

#### StaticWebApps Provider
```json
{
  "authentication": {
    "provider": "StaticWebApps"
  }
}
```

No additional configuration needed. Uses SWA's built-in authentication.

#### AppService Provider
```json
{
  "authentication": {
    "provider": "AppService",
    "jwt": {
      "audience": "my-app-audience"
    }
  }
}
```

#### AzureAd / Entra ID Provider
```json
{
  "authentication": {
    "provider": "AzureAd",
    "jwt": {
      "audience": "api://my-app-client-id",
      "issuer": "https://login.microsoftonline.com/my-tenant-id/v2.0"
    }
  }
}
```

**Finding your values:**
- `audience`: Your App Registration's Application ID URI or Client ID
- `issuer`: `https://login.microsoftonline.com/{tenant-id}/v2.0`

#### Simulator Provider (Development Only)
```json
{
  "authentication": {
    "provider": "Simulator"
  }
}
```

**⚠️ WARNING:** Never use in production. Accepts any JWT without validation.

---

## Cache Configuration

Global caching settings for all entities.

```json
{
  "cache": {
    "enabled": true,
    "ttl-seconds": 30
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | false | Enable global caching |
| `ttl-seconds` | number | 5 | Default cache duration |

Entity-level cache settings override global settings:
```json
{
  "entities": {
    "Product": {
      "cache": {
        "enabled": true,
        "ttl-seconds": 120
      }
    }
  }
}
```

### Cache Behavior

- **Cached:** GET requests for read operations
- **Not cached:** POST, PUT, PATCH, DELETE operations
- **Cache key:** Based on URL and query parameters
- **Invalidation:** Time-based (TTL expiration)

---

## Pagination Configuration

Controls default pagination behavior.

```json
{
  "pagination": {
    "default-page-size": 100,
    "max-page-size": 100000
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default-page-size` | number | 100 | Records per page when not specified |
| `max-page-size` | number | 100000 | Maximum records per request |

### REST Pagination

Request:
```
GET /api/Product?$first=50
```

Response includes pagination info:
```json
{
  "value": [...],
  "nextLink": "/api/Product?$first=50&$after=eyJ..."
}
```

### GraphQL Pagination

Query:
```graphql
query {
  products(first: 50) {
    items { id, name }
    hasNextPage
    endCursor
  }
}
```

Next page:
```graphql
query {
  products(first: 50, after: "eyJ...") {
    items { id, name }
    hasNextPage
    endCursor
  }
}
```

---

## Telemetry Configuration

Controls Application Insights integration.

```json
{
  "telemetry": {
    "application-insights": {
      "enabled": true,
      "connection-string": "@env('APPLICATIONINSIGHTS_CONNECTION_STRING')"
    }
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | boolean | Enable Application Insights |
| `connection-string` | string | App Insights connection string |

### What Gets Logged

- Request traces
- Dependency calls (database)
- Exceptions and errors
- Performance metrics
- Custom events

---

## Health Configuration

Controls the health check endpoint.

```json
{
  "health": {
    "enabled": true,
    "path": "/health"
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | false | Enable health endpoint |
| `path` | string | "/health" | Health check path |

### Health Check Response

```json
{
  "status": "Healthy",
  "checks": {
    "database": {
      "status": "Healthy",
      "responseTime": "12ms"
    }
  }
}
```

Use for:
- Container orchestration (Kubernetes liveness/readiness)
- Load balancer health checks
- Monitoring systems

---

## Complete Runtime Example

### Development Configuration

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
      "allow-introspection": true
    },
    "mcp": {
      "enabled": true,
      "path": "/mcp"
    },
    "host": {
      "mode": "development",
      "cors": {
        "origins": ["http://localhost:3000"],
        "allow-credentials": true
      },
      "authentication": {
        "provider": "Simulator"
      }
    },
    "cache": {
      "enabled": true,
      "ttl-seconds": 5
    },
    "health": {
      "enabled": true,
      "path": "/health"
    }
  }
}
```

### Production Configuration

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
      "depth-limit": 5
    },
    "mcp": {
      "enabled": false
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
          "issuer": "https://login.microsoftonline.com/tenant-id/v2.0"
        }
      }
    },
    "cache": {
      "enabled": true,
      "ttl-seconds": 60
    },
    "pagination": {
      "default-page-size": 50,
      "max-page-size": 500
    },
    "telemetry": {
      "application-insights": {
        "enabled": true,
        "connection-string": "@env('APPLICATIONINSIGHTS_CONNECTION_STRING')"
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

## Next Steps

- See [entities.md](entities.md) for entity configuration
- See [mcp.md](mcp.md) for MCP Server details
- See [dab-configure.md](dab-configure.md) for CLI commands
