# dab add Command Reference

## Purpose

The `dab add` command adds an entity (table, view, or stored procedure) to an existing DAB configuration file. Each entity becomes accessible through the REST, GraphQL, and/or MCP endpoints.

## Syntax

```bash
dab add <entity-name> [options]
```

Where `<entity-name>` is the name that will be used in the API (e.g., `Product` becomes `/api/Product`).

## Required Options

| Option | Description |
|--------|-------------|
| `--source`, `-s` | Database object name (e.g., `dbo.Products`, `get_product_by_id`) |
| `--permissions`, `-p` | Permission string(s): `"role:action"` or `"role:action1,action2"` |

## Source Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--source`, `-s` | string | Required | Database object name |
| `--source.type`, `-st` | string | table | Entity type: `table`, `view`, `stored-procedure` |
| `--source.key-fields` | string | | Primary key field(s), comma-separated. **Required for views** |
| `--source.params` | string | | Default parameter values for stored procedures |

**IMPORTANT Constraints:**
- **Views**: Cannot be added automatically - developer MUST specify primary key using `--source.key-fields`
- **Tables without PKs**: Cannot be added to DAB - database must have primary key constraint defined
  - Solution 1: Add primary key constraint to the table in database
  - Solution 2: Create a view with `--source.key-fields` parameter

## Permission Options

| Option | Type | Description |
|--------|------|-------------|
| `--permissions`, `-p` | string | Permission definition: `"role:actions"` |

### Permission Format
```
"role:action1,action2"
```

### Available Actions by Entity Type

| Entity Type | Allowed Actions |
|-------------|-----------------|
| Tables | `create`, `read`, `update`, `delete`, `*` (all) |
| Views | `create`, `read`, `update`, `delete`, `*` (all) |
| Stored Procedures | `execute`, `*` (all) |

### Built-in Roles

| Role | Description |
|------|-------------|
| `anonymous` | Unauthenticated requests |
| `authenticated` | Any authenticated user |
| Custom roles | Defined by your auth provider |

## REST Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--rest` | boolean/string | true | Enable REST or set custom path |
| `--rest.methods` | string | POST | HTTP methods for stored procedures |

## GraphQL Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--graphql` | boolean/string | true | Enable GraphQL or set custom name |
| `--graphql.operation` | string | | GraphQL operation type for stored procedures: `query` or `mutation` |
| `--graphql.singular` | string | | Singular name for GraphQL type |
| `--graphql.plural` | string | | Plural name for GraphQL type |

## Field Options

| Option | Type | Description |
|--------|------|-------------|
| `--fields.include` | string | Fields to include (comma-separated) |
| `--fields.exclude` | string | Fields to exclude (comma-separated) |
| `--map` | string | Field mapping: `dbField:apiField` |

## Stored Procedure Options

| Option | Type | Description |
|--------|------|-------------|
| `--source.params` | string | Default parameter values |
| `--rest.methods` | string | HTTP methods: `GET`, `POST`, or `GET,POST` |
| `--parameters.name` | string | Parameter name (for later update) |
| `--parameters.description` | string | Parameter description |
| `--parameters.required` | boolean | Whether parameter is required |
| `--parameters.default` | string | Default parameter value |

## MCP Options (DAB 1.7+)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--mcp.custom-tool` | boolean | false | Expose as custom MCP tool |

## Cache Options

| Option | Type | Description |
|--------|------|-------------|
| `--cache.enabled` | boolean | Enable caching for this entity |
| `--cache.ttl-seconds` | number | Cache TTL (overrides global) |

## Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `--config`, `-c` | string | Config file path (default: `dab-config.json`) |

---

## Examples by Entity Type

### Adding a Table

#### Basic Table (Anonymous Read-Only)
```bash
dab add Product \
  --source dbo.Products \
  --source.type table \
  --permissions "anonymous:read"
```

#### Full CRUD Table
```bash
dab add Product \
  --source dbo.Products \
  --source.type table \
  --permissions "authenticated:*"
```

#### Table with Multiple Roles
```bash
dab add Product \
  --source dbo.Products \
  --source.type table \
  --permissions "anonymous:read" \
  --permissions "authenticated:create,read,update" \
  --permissions "admin:*"
```

#### Table with Field Exclusions
```bash
dab add User \
  --source dbo.Users \
  --source.type table \
  --permissions "anonymous:read" \
  --fields.exclude "PasswordHash,SecurityStamp"
```

#### Table with Field Mappings
```bash
dab add Product \
  --source dbo.Products \
  --source.type table \
  --permissions "anonymous:read" \
  --map "ProductName:name,ProductPrice:price"
```

Result JSON:
```json
{
  "Product": {
    "source": {
      "type": "table",
      "object": "dbo.Products"
    },
    "permissions": [
      { "role": "anonymous", "actions": ["read"] }
    ],
    "mappings": {
      "ProductName": "name",
      "ProductPrice": "price"
    }
  }
}
```

### Adding a View

Views require explicit key fields since they don't have primary keys in metadata.

```bash
dab add ProductSummary \
  --source dbo.vw_ProductSummary \
  --source.type view \
  --source.key-fields "ProductId" \
  --permissions "anonymous:read"
```

Result JSON:
```json
{
  "ProductSummary": {
    "source": {
      "type": "view",
      "object": "dbo.vw_ProductSummary",
      "key-fields": ["ProductId"]
    },
    "permissions": [
      { "role": "anonymous", "actions": ["read"] }
    ]
  }
}
```

#### View with Composite Key
```bash
dab add OrderDetail \
  --source dbo.vw_OrderDetails \
  --source.type view \
  --source.key-fields "OrderId,ProductId" \
  --permissions "anonymous:read"
```

### Adding a Stored Procedure

#### Basic Stored Procedure
```bash
dab add GetProductsByCategory \
  --source dbo.usp_GetProductsByCategory \
  --source.type stored-procedure \
  --permissions "anonymous:execute"
```

#### Stored Procedure with Default Parameters
```bash
dab add GetProductsByCategory \
  --source dbo.usp_GetProductsByCategory \
  --source.type stored-procedure \
  --source.params "categoryId:1" \
  --permissions "anonymous:execute"
```

#### Stored Procedure with REST Methods
```bash
dab add GetProductsByCategory \
  --source dbo.usp_GetProductsByCategory \
  --source.type stored-procedure \
  --permissions "anonymous:execute" \
  --rest.methods "GET,POST"
```

#### Stored Procedure as GraphQL Query
```bash
dab add GetProducts \
  --source dbo.usp_GetAllProducts \
  --source.type stored-procedure \
  --permissions "anonymous:execute" \
  --graphql.operation query
```

#### Stored Procedure as GraphQL Mutation
```bash
dab add CreateOrder \
  --source dbo.usp_CreateOrder \
  --source.type stored-procedure \
  --permissions "authenticated:execute" \
  --graphql.operation mutation
```

#### Stored Procedure as MCP Custom Tool
```bash
dab add GetCustomerOrders \
  --source dbo.usp_GetCustomerOrders \
  --source.type stored-procedure \
  --permissions "authenticated:execute" \
  --mcp.custom-tool true
```

Result JSON:
```json
{
  "GetCustomerOrders": {
    "source": {
      "type": "stored-procedure",
      "object": "dbo.usp_GetCustomerOrders"
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

---

## Advanced Examples

### Custom REST and GraphQL Names
```bash
dab add Product \
  --source dbo.tbl_Products_Legacy \
  --source.type table \
  --permissions "anonymous:read" \
  --rest products \
  --graphql.singular "product" \
  --graphql.plural "products"
```

### Disable REST for Entity
```bash
dab add InternalLog \
  --source dbo.AuditLogs \
  --source.type table \
  --permissions "admin:read" \
  --rest false \
  --graphql true
```

### Disable GraphQL for Entity
```bash
dab add LegacyData \
  --source dbo.OldSystem \
  --source.type table \
  --permissions "anonymous:read" \
  --rest true \
  --graphql false
```

### Entity with Caching
```bash
dab add Product \
  --source dbo.Products \
  --source.type table \
  --permissions "anonymous:read" \
  --cache.enabled true \
  --cache.ttl-seconds 60
```

### Entity with Description (for MCP/Documentation)
```bash
dab add Product \
  --source dbo.Products \
  --source.type table \
  --permissions "anonymous:read" \
  --description "Product catalog with pricing and inventory"
```

---

## Permission Patterns

### Public Read, Authenticated Write
```bash
dab add Product \
  --source dbo.Products \
  --source.type table \
  --permissions "anonymous:read" \
  --permissions "authenticated:create,update,delete"
```

### Read-Only API
```bash
dab add Product \
  --source dbo.Products \
  --source.type table \
  --permissions "anonymous:read" \
  --permissions "authenticated:read"
```

### Admin-Only Entity
```bash
dab add Configuration \
  --source dbo.SystemConfig \
  --source.type table \
  --permissions "admin:*"
```

### Multi-Tier Permissions
```bash
dab add Order \
  --source dbo.Orders \
  --source.type table \
  --permissions "anonymous:read" \
  --permissions "customer:create,read" \
  --permissions "support:read,update" \
  --permissions "admin:*"
```

---

## Result JSON Structure

After running `dab add`, the entity appears in the `entities` section:

```json
{
  "entities": {
    "Product": {
      "source": {
        "type": "table",
        "object": "dbo.Products"
      },
      "permissions": [
        {
          "role": "anonymous",
          "actions": [
            {
              "action": "read"
            }
          ]
        },
        {
          "role": "authenticated",
          "actions": [
            {
              "action": "create"
            },
            {
              "action": "update"
            },
            {
              "action": "delete"
            }
          ]
        }
      ],
      "rest": {
        "enabled": true,
        "path": "/Product"
      },
      "graphql": {
        "enabled": true,
        "type": {
          "singular": "Product",
          "plural": "Products"
        }
      }
    }
  }
}
```

---

## Common Mistakes

### 1. Missing Source Type for Views
```bash
# Wrong - defaults to table, may not work correctly
dab add ProductSummary --source dbo.vw_ProductSummary --permissions "anonymous:read"

# Correct - explicitly set view type and key fields
dab add ProductSummary --source dbo.vw_ProductSummary --source.type view --source.key-fields "ProductId" --permissions "anonymous:read"
```

### 2. Wrong Action for Stored Procedures
```bash
# Wrong - stored procedures use 'execute', not 'read'
dab add GetData --source dbo.usp_GetData --source.type stored-procedure --permissions "anonymous:read"

# Correct
dab add GetData --source dbo.usp_GetData --source.type stored-procedure --permissions "anonymous:execute"
```

### 3. Missing Schema Name
```bash
# May work but ambiguous
dab add Product --source Products --permissions "anonymous:read"

# Better - include schema
dab add Product --source dbo.Products --permissions "anonymous:read"
```

### 4. Entity Name Conflicts
```bash
# If you already have 'Product' entity, this will fail
dab add Product --source dbo.Products --permissions "anonymous:read"

# Use a different entity name or update the existing one
dab add ProductV2 --source dbo.Products --permissions "anonymous:read"
```

---

## Next Steps

- Use `dab update` to modify existing entities (see [dab-update.md](dab-update.md))
- Add relationships between entities
- Configure field-level permissions
- Add database policies for row-level security
