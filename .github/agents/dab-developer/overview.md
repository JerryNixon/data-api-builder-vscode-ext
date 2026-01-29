# Data API Builder Overview

## What is Data API Builder?

**Data API Builder (DAB)** is an open source, configuration-based engine that automatically creates REST and GraphQL APIs for your databases. Instead of writing custom API code, you define a JSON configuration file that specifies:

- How to connect to your database
- Which tables, views, and stored procedures to expose
- Permissions for each operation
- Relationships between entities

DAB then generates a fully-functional API with pagination, filtering, sorting, and security—all without writing a single line of code.

## Key Value Propositions

### 1. Zero Code Required
Traditional approach: Write controllers, models, repositories, DTOs, validation logic.
DAB approach: Write one JSON configuration file.

### 2. Multiple Endpoint Types
One configuration creates:
- **REST API** - Standard HTTP CRUD operations
- **GraphQL API** - Query language with nested data
- **MCP Server** - Model Context Protocol for AI agents

### 3. Enterprise-Ready Security
- JWT authentication (Entra ID, Auth0, custom)
- Role-based access control (RBAC)
- Field-level permissions
- Database and request policies

### 4. Free and Open Source
- MIT licensed
- No premium tier
- Self-hosted anywhere
- Active development on GitHub

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│         (Web Apps, Mobile Apps, AI Agents, Services)            │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │   REST   │ │ GraphQL  │ │   MCP    │
              │  /api/*  │ │/graphql  │ │  /mcp    │
              └──────────┘ └──────────┘ └──────────┘
                    │            │            │
                    └────────────┼────────────┘
                                 │
                    ┌────────────────────────┐
                    │   Data API Builder     │
                    │    Runtime Engine      │
                    ├────────────────────────┤
                    │  • Query Builder       │
                    │  • Permission Engine   │
                    │  • Cache Layer         │
                    │  • Telemetry           │
                    └────────────────────────┘
                                 │
                    ┌────────────────────────┐
                    │   dab-config.json      │
                    │   (Configuration)      │
                    └────────────────────────┘
                                 │
                    ┌────────────────────────┐
                    │      Database          │
                    │  (SQL Server, etc.)    │
                    └────────────────────────┘
```

## Configuration File Structure

The `dab-config.json` file has these main sections:

```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/latest/download/dab.draft.schema.json",
  
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('DATABASE_CONNECTION_STRING')"
  },
  
  "runtime": {
    "rest": { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql" },
    "mcp": { "enabled": true, "path": "/mcp" },
    "host": { "mode": "development" },
    "cache": { "enabled": true, "ttl-seconds": 5 }
  },
  
  "entities": {
    "Product": {
      "source": { "type": "table", "object": "dbo.Products" },
      "permissions": [
        { "role": "anonymous", "actions": ["read"] }
      ]
    }
  }
}
```

### Section: `data-source`
Defines database connection:
- `database-type`: mssql, postgresql, mysql, cosmosdb_nosql
- `connection-string`: Direct string or `@env('VAR_NAME')` syntax

### Section: `runtime`
Global settings for all endpoints:
- `rest`: REST API configuration
- `graphql`: GraphQL configuration  
- `mcp`: MCP Server configuration
- `host`: Development/production mode
- `cache`: Response caching
- `telemetry`: Logging and monitoring

### Section: `entities`
Database objects exposed through the API:
- Each entity maps to a table, view, or stored procedure
- Includes permissions, relationships, and field mappings

## Supported Databases

| Database | Type Value | Notes |
|----------|-----------|-------|
| SQL Server | `mssql` | Full support including session context |
| Azure SQL | `mssql` | Same as SQL Server |
| PostgreSQL | `postgresql` | Full support |
| MySQL | `mysql` | Full support |
| Cosmos DB NoSQL | `cosmosdb_nosql` | Requires GraphQL schema file |
| Cosmos DB PostgreSQL | `cosmosdb_postgresql` | PostgreSQL wire protocol |

**This agent specializes in MSSQL (SQL Server and Azure SQL).**

## Entity Types

### Tables
Standard database tables with primary keys:
```bash
dab add Product \
  --source dbo.Products \
  --source.type table \
  --permissions "anonymous:read"
```

### Views
Database views (require explicit key fields):
```bash
dab add ProductSummary \
  --source dbo.vw_ProductSummary \
  --source.type view \
  --source.key-fields "ProductId" \
  --permissions "anonymous:read"
```

### Stored Procedures
Callable database procedures:
```bash
dab add GetProductsByCategory \
  --source dbo.usp_GetProductsByCategory \
  --source.type stored-procedure \
  --permissions "anonymous:execute" \
  --rest.methods GET,POST
```

## Permission Actions

| Entity Type | Allowed Actions |
|-------------|-----------------|
| Tables | create, read, update, delete, * |
| Views | create, read, update, delete, * |
| Stored Procedures | execute, * |

## REST API Features

When REST is enabled, DAB provides:

### CRUD Operations
- `GET /api/{entity}` - Read all records
- `GET /api/{entity}/{id}` - Read single record
- `POST /api/{entity}` - Create record
- `PUT /api/{entity}/{id}` - Replace record
- `PATCH /api/{entity}/{id}` - Update record
- `DELETE /api/{entity}/{id}` - Delete record

### Query Parameters
- `$select` - Choose specific fields
- `$filter` - Filter results (OData syntax)
- `$orderby` - Sort results
- `$first` - Limit results (pagination)
- `$after` - Cursor-based pagination

### Example REST Calls
```http
GET /api/Product
GET /api/Product?$filter=price gt 100
GET /api/Product?$select=id,name&$orderby=name
GET /api/Product?$first=10
GET /api/Product/123
```

## GraphQL API Features

When GraphQL is enabled, DAB provides:

### Queries
```graphql
query {
  products {
    items {
      id
      name
      price
      category {
        name
      }
    }
    hasNextPage
    endCursor
  }
}
```

### Mutations
```graphql
mutation {
  createProduct(item: { name: "Widget", price: 19.99 }) {
    id
    name
    price
  }
}
```

### Features
- Automatic type generation from database schema
- Relationship navigation (nested queries)
- Pagination with cursors
- Filtering and sorting
- Multiple-create mutations (optional)

## MCP Server Features

Model Context Protocol (MCP) enables AI agents to interact with your data:

### DML Tools
- `describe_entities` - List available entities and their schemas
- `create_record` - Insert new data
- `read_records` - Query data with filters
- `update_record` - Modify existing data
- `delete_record` - Remove data
- `execute_entity` - Call stored procedures

### Use Cases
- AI chatbots that query business data
- Copilots that perform CRUD operations
- Automation workflows

### Security
MCP respects all DAB permissions and RBAC. Agents only see what their role allows.

## Deployment Options

DAB runs anywhere .NET 8 is supported:

1. **Local Development** - `dab start` command
2. **Docker Container** - Official container image
3. **Azure Container Apps** - Serverless containers
4. **Azure Kubernetes Service** - Kubernetes deployment
5. **Azure App Service** - Web app hosting
6. **Azure Container Instances** - Simple container hosting

## CLI Commands

| Command | Purpose |
|---------|---------|
| `dab init` | Create new configuration file |
| `dab add` | Add entity to configuration |
| `dab update` | Update existing entity |
| `dab configure` | Update runtime settings |
| `dab validate` | Validate configuration |
| `dab start` | Start the DAB engine |

## Installation

Install the DAB CLI as a .NET global tool:

```bash
# Install latest stable
dotnet tool install --global Microsoft.DataApiBuilder

# Install latest preview (for v1.7+ features like MCP)
dotnet tool install --global Microsoft.DataApiBuilder --prerelease

# Verify installation
dab --version
```

## Next Steps

- See [dab-init.md](dab-init.md) to create a new configuration
- See [dab-add.md](dab-add.md) to add database entities
- See [entities.md](entities.md) for entity configuration details
- See [runtime.md](runtime.md) for runtime settings
- See [mcp.md](mcp.md) for MCP Server configuration