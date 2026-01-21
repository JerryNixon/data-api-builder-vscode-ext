# MCP Server Configuration Reference

## What is MCP?

**Model Context Protocol (MCP)** is an open protocol that enables AI models (like Claude, GPT, etc.) to interact with external data sources and tools. DAB implements an MCP server that exposes your database entities as tools that AI agents can call.

## Why Use MCP with DAB?

1. **AI-Powered Data Access** - Let AI agents query and modify your data
2. **Natural Language to Database** - AI translates user requests to API calls
3. **Secure Access** - MCP respects all DAB permissions and RBAC
4. **No Custom Code** - Configuration-only setup

## Requirements

- DAB version 1.7.0 or later (currently in preview)
- Install with: `dotnet tool install --global Microsoft.DataApiBuilder --prerelease`

---

## Enabling MCP

### Via dab init

```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --mcp.enabled true \
  --mcp.path "/mcp"
```

### Via dab configure

```bash
dab configure \
  --runtime.mcp.enabled true \
  --runtime.mcp.path "/mcp"
```

### Resulting Configuration

```json
{
  "runtime": {
    "mcp": {
      "enabled": true,
      "path": "/mcp"
    }
  }
}
```

---

## MCP Configuration Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | false | Enable/disable MCP endpoint |
| `path` | string | "/mcp" | MCP Server endpoint path |

---

## Built-in DML Tools

When MCP is enabled, DAB automatically exposes these Data Manipulation Language (DML) tools:

### 1. describe_entities

Lists all available entities and their schemas.

**Tool Name:** `describe_entities`

**Use Case:** AI agents discover what data is available.

**Example Response:**
```json
{
  "entities": [
    {
      "name": "Product",
      "type": "table",
      "fields": [
        { "name": "id", "type": "int", "nullable": false },
        { "name": "name", "type": "string", "nullable": false },
        { "name": "price", "type": "decimal", "nullable": false }
      ]
    }
  ]
}
```

### 2. read_records

Query records from an entity with optional filtering.

**Tool Name:** `read_records`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity` | string | Yes | Entity name |
| `filter` | string | No | OData filter expression |
| `select` | array | No | Fields to return |
| `orderby` | string | No | Sort expression |
| `top` | number | No | Maximum records to return |

**Example Call:**
```json
{
  "tool": "read_records",
  "parameters": {
    "entity": "Product",
    "filter": "price gt 50",
    "select": ["id", "name", "price"],
    "orderby": "name",
    "top": 10
  }
}
```

### 3. create_record

Create a new record in an entity.

**Tool Name:** `create_record`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity` | string | Yes | Entity name |
| `data` | object | Yes | Record data |

**Example Call:**
```json
{
  "tool": "create_record",
  "parameters": {
    "entity": "Product",
    "data": {
      "name": "New Widget",
      "price": 29.99
    }
  }
}
```

### 4. update_record

Update an existing record.

**Tool Name:** `update_record`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity` | string | Yes | Entity name |
| `key` | object | Yes | Primary key value(s) |
| `data` | object | Yes | Fields to update |

**Example Call:**
```json
{
  "tool": "update_record",
  "parameters": {
    "entity": "Product",
    "key": { "id": 123 },
    "data": {
      "price": 34.99
    }
  }
}
```

### 5. delete_record

Delete a record.

**Tool Name:** `delete_record`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity` | string | Yes | Entity name |
| `key` | object | Yes | Primary key value(s) |

**Example Call:**
```json
{
  "tool": "delete_record",
  "parameters": {
    "entity": "Product",
    "key": { "id": 123 }
  }
}
```

### 6. execute_entity

Execute a stored procedure entity.

**Tool Name:** `execute_entity`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity` | string | Yes | Entity name (stored procedure) |
| `parameters` | object | No | Procedure parameters |

**Example Call:**
```json
{
  "tool": "execute_entity",
  "parameters": {
    "entity": "GetProductsByCategory",
    "parameters": {
      "categoryId": 5
    }
  }
}
```

---

## Custom MCP Tools

Stored procedures can be exposed as named custom tools, giving AI agents specific capabilities.

### Enabling Custom Tools

```bash
# Add stored procedure entity
dab add SearchProducts \
  --source dbo.usp_SearchProducts \
  --source.type stored-procedure \
  --permissions "authenticated:execute"

# Enable as custom tool
dab update SearchProducts \
  --mcp.custom-tool true
```

### Entity Configuration

```json
{
  "SearchProducts": {
    "source": {
      "type": "stored-procedure",
      "object": "dbo.usp_SearchProducts",
      "parameters": {
        "searchTerm": {
          "description": "Text to search for in product names and descriptions",
          "required": true
        },
        "maxResults": {
          "description": "Maximum number of results to return",
          "required": false,
          "default": "10"
        }
      }
    },
    "permissions": [
      { "role": "authenticated", "actions": ["execute"] }
    ],
    "mcp": {
      "custom-tool": true
    }
  }
}
```

### Custom Tool Benefits

1. **Semantic Names** - `SearchProducts` instead of generic `execute_entity`
2. **Documented Parameters** - AI understands what each parameter does
3. **Specialized Operations** - Complex business logic as single tool calls
4. **Better AI Responses** - AI can explain what it's doing more clearly

---

## MCP Workflow Examples

### Example 1: AI Chatbot Querying Products

User: "Show me all products under $50"

AI uses `read_records`:
```json
{
  "tool": "read_records",
  "parameters": {
    "entity": "Product",
    "filter": "price lt 50",
    "orderby": "price"
  }
}
```

### Example 2: AI Creating an Order

User: "Create an order for customer 123 with 5 widgets"

AI uses `create_record`:
```json
{
  "tool": "create_record",
  "parameters": {
    "entity": "Order",
    "data": {
      "customerId": 123,
      "items": [
        { "productId": 456, "quantity": 5 }
      ]
    }
  }
}
```

### Example 3: AI Running Custom Search

User: "Find all products related to gardening"

AI uses custom tool `SearchProducts`:
```json
{
  "tool": "SearchProducts",
  "parameters": {
    "searchTerm": "gardening",
    "maxResults": 20
  }
}
```

---

## Security Considerations

### Permissions Apply

MCP respects all DAB permission rules:
- Roles determine which actions are allowed
- Field-level permissions hide sensitive data
- Database policies filter results

### Example: Restricted Access

```json
{
  "Order": {
    "permissions": [
      {
        "role": "authenticated",
        "actions": [
          {
            "action": "read",
            "policy": {
              "database": "@item.CustomerId eq @claims.customerId"
            }
          }
        ]
      }
    ]
  }
}
```

With this policy, an AI agent authenticated as a customer can only read their own orders.

### Token Forwarding

When an AI agent calls MCP, it should forward the user's authentication token. DAB validates the token and applies permissions based on the user's identity.

---

## MCP Client Configuration

To connect an AI agent to your DAB MCP server, configure it with:

### Endpoint URL
```
http://localhost:5000/mcp
```

### Transport
MCP uses Server-Sent Events (SSE) for real-time communication.

### Authentication
If your DAB requires authentication, include a JWT token in requests:
```
Authorization: Bearer <jwt-token>
```

---

## Connecting Claude to DAB MCP

Claude Desktop and Claude API can connect to MCP servers. Configuration example:

```json
{
  "mcpServers": {
    "dab-server": {
      "command": "dab",
      "args": ["start", "--config", "dab-config.json"],
      "env": {
        "DATABASE_CONNECTION_STRING": "Server=localhost;Database=MyDb;..."
      }
    }
  }
}
```

Or connect to a running DAB instance:
```json
{
  "mcpServers": {
    "dab-server": {
      "url": "http://localhost:5000/mcp",
      "transport": "sse"
    }
  }
}
```

---

## Complete MCP Setup Example

### 1. Initialize with MCP Enabled
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --mcp.enabled true
```

### 2. Add Entities
```bash
# Add tables for DML tools
dab add Product --source dbo.Products --permissions "authenticated:*"
dab add Order --source dbo.Orders --permissions "authenticated:*"
dab add Customer --source dbo.Customers --permissions "authenticated:read"

# Add stored procedure as custom tool
dab add SearchProducts \
  --source dbo.usp_SearchProducts \
  --source.type stored-procedure \
  --permissions "authenticated:execute"

dab update SearchProducts \
  --mcp.custom-tool true \
  --parameters.name "searchTerm" \
  --parameters.description "Text to search for" \
  --parameters.required true
```

### 3. Start Server
```bash
$env:DATABASE_CONNECTION_STRING = "Server=localhost;Database=MyDb;..."
dab start
```

### 4. Available Tools

The MCP server now exposes:
- `describe_entities` - List all entities
- `read_records` - Query any entity
- `create_record` - Create records (Product, Order)
- `update_record` - Update records
- `delete_record` - Delete records
- `SearchProducts` - Custom search tool

---

## MCP vs REST vs GraphQL

| Feature | REST | GraphQL | MCP |
|---------|------|---------|-----|
| Client Type | Web/Mobile Apps | Web/Mobile Apps | AI Agents |
| Query Style | Fixed endpoints | Flexible queries | Tool calls |
| Discovery | OpenAPI/Swagger | Introspection | describe_entities |
| Relationships | Separate requests | Nested queries | Via tools |
| Best For | Standard APIs | Complex UIs | AI Integration |

### When to Use MCP

- Building AI chatbots that access business data
- Creating Copilot experiences
- Enabling natural language data queries
- Automating workflows with AI

### When to Use REST/GraphQL

- Traditional web applications
- Mobile apps
- Third-party integrations
- Public APIs

---

## Next Steps

- See [dab-add.md](dab-add.md) for adding stored procedures
- See [dab-update.md](dab-update.md) for configuring custom tools
- See [entities.md](entities.md) for entity configuration
