# Entity Configuration Reference

## Overview

Entities are the core of a DAB configuration. Each entity maps a database object (table, view, or stored procedure) to API endpoints.

## Entity Structure

```json
{
  "entities": {
    "EntityName": {
      "source": { ... },
      "permissions": [ ... ],
      "mappings": { ... },
      "relationships": { ... },
      "rest": { ... },
      "graphql": { ... },
      "mcp": { ... },
      "cache": { ... }
    }
  }
}
```

---

## Source Configuration

The `source` property defines what database object the entity represents.

### Table Source

```json
{
  "source": {
    "type": "table",
    "object": "dbo.Products"
  }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | Yes | Must be `"table"` |
| `object` | string | Yes | Schema-qualified table name |

### View Source

Views require explicit key fields since they lack primary key metadata.

```json
{
  "source": {
    "type": "view",
    "object": "dbo.vw_ProductSummary",
    "key-fields": ["ProductId"]
  }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | Yes | Must be `"view"` |
| `object` | string | Yes | Schema-qualified view name |
| `key-fields` | array | Yes | Primary key field(s) for the view |

### Stored Procedure Source

```json
{
  "source": {
    "type": "stored-procedure",
    "object": "dbo.usp_GetProductsByCategory",
    "parameters": {
      "categoryId": {
        "description": "The category to filter by",
        "required": false,
        "default": "1"
      }
    }
  }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | Yes | Must be `"stored-procedure"` |
| `object` | string | Yes | Schema-qualified procedure name |
| `parameters` | object | No | Parameter configuration |

#### Parameter Properties

| Property | Type | Description |
|----------|------|-------------|
| `description` | string | Human-readable description |
| `required` | boolean | Whether parameter is required |
| `default` | string | Default value if not provided |

---

## Permissions Configuration

Permissions control who can perform what actions on an entity.

### Basic Permission Structure

```json
{
  "permissions": [
    {
      "role": "anonymous",
      "actions": ["read"]
    },
    {
      "role": "authenticated",
      "actions": ["create", "read", "update", "delete"]
    }
  ]
}
```

### Permission with All Actions

```json
{
  "permissions": [
    {
      "role": "admin",
      "actions": ["*"]
    }
  ]
}
```

### Expanded Action Format

For field-level permissions or policies, use the expanded format:

```json
{
  "permissions": [
    {
      "role": "authenticated",
      "actions": [
        {
          "action": "read",
          "fields": {
            "include": ["id", "name", "price"],
            "exclude": ["cost", "margin"]
          }
        },
        {
          "action": "create",
          "fields": {
            "include": ["name", "price"]
          }
        }
      ]
    }
  ]
}
```

### Permission with Database Policy

```json
{
  "permissions": [
    {
      "role": "authenticated",
      "actions": [
        {
          "action": "read",
          "policy": {
            "database": "@item.OwnerId eq @claims.userId"
          }
        }
      ]
    }
  ]
}
```

### Permission with Request Policy

```json
{
  "permissions": [
    {
      "role": "authenticated",
      "actions": [
        {
          "action": "create",
          "policy": {
            "request": "@item.quantity gt 0 and @item.quantity lt 100"
          }
        }
      ]
    }
  ]
}
```

### Available Actions by Entity Type

| Entity Type | Valid Actions |
|-------------|---------------|
| Table | `create`, `read`, `update`, `delete`, `*` |
| View | `create`, `read`, `update`, `delete`, `*` |
| Stored Procedure | `execute`, `*` |

### Built-in Roles

| Role | Description |
|------|-------------|
| `anonymous` | Unauthenticated requests |
| `authenticated` | Any authenticated user |

Custom roles come from your authentication provider (JWT claims).

---

## Mappings Configuration

Mappings rename database columns to different API field names.

```json
{
  "mappings": {
    "ProductName": "name",
    "UnitPrice": "price",
    "UnitsInStock": "stock"
  }
}
```

**Format:** `"DatabaseColumnName": "apiFieldName"`

### When to Use Mappings

1. **Clean up legacy names**
   - Database: `tbl_prod_nm` → API: `productName`

2. **Follow API conventions**
   - Database: `product_id` → API: `productId` (camelCase)

3. **Hide implementation details**
   - Database: `CustomerPK` → API: `customerId`

---

## Relationships Configuration

Relationships enable navigation between entities in GraphQL queries.

### One-to-Many Relationship

A Category has many Products:

```json
{
  "Category": {
    "source": { "type": "table", "object": "dbo.Categories" },
    "relationships": {
      "products": {
        "cardinality": "many",
        "target.entity": "Product",
        "source.fields": ["CategoryId"],
        "target.fields": ["CategoryId"]
      }
    }
  }
}
```

### Many-to-One Relationship

A Product belongs to one Category:

```json
{
  "Product": {
    "source": { "type": "table", "object": "dbo.Products" },
    "relationships": {
      "category": {
        "cardinality": "one",
        "target.entity": "Category",
        "source.fields": ["CategoryId"],
        "target.fields": ["CategoryId"]
      }
    }
  }
}
```

### Many-to-Many Relationship

Students and Courses through Enrollments:

```json
{
  "Student": {
    "source": { "type": "table", "object": "dbo.Students" },
    "relationships": {
      "courses": {
        "cardinality": "many",
        "target.entity": "Course",
        "linking.object": "dbo.Enrollments",
        "linking.source.fields": ["StudentId"],
        "linking.target.fields": ["CourseId"]
      }
    }
  }
}
```

### Relationship Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `cardinality` | string | Yes | `"one"` or `"many"` |
| `target.entity` | string | Yes | Target entity name |
| `source.fields` | array | Yes* | Source entity join fields |
| `target.fields` | array | Yes* | Target entity join fields |
| `linking.object` | string | No | Linking table for many-to-many |
| `linking.source.fields` | array | No | Linking table source fields |
| `linking.target.fields` | array | No | Linking table target fields |

*Required unless using a linking table.

---

## REST Configuration

Control how the entity is exposed via REST.

### Enable/Disable REST

```json
{
  "rest": {
    "enabled": true
  }
}
```

### Custom REST Path

```json
{
  "rest": {
    "enabled": true,
    "path": "/products"
  }
}
```

This changes the endpoint from `/api/Product` to `/api/products`.

### Stored Procedure REST Methods

```json
{
  "rest": {
    "enabled": true,
    "methods": ["GET", "POST"]
  }
}
```

| Method | Use Case |
|--------|----------|
| GET | Read-only procedures (query string parameters) |
| POST | Procedures with complex input (body parameters) |

---

## GraphQL Configuration

Control how the entity is exposed via GraphQL.

### Enable/Disable GraphQL

```json
{
  "graphql": {
    "enabled": true
  }
}
```

### Custom Type Names

```json
{
  "graphql": {
    "enabled": true,
    "type": {
      "singular": "Product",
      "plural": "Products"
    }
  }
}
```

### Stored Procedure Operation Type

```json
{
  "graphql": {
    "enabled": true,
    "operation": "query"
  }
}
```

| Operation | Use Case |
|-----------|----------|
| `query` | Read-only procedures |
| `mutation` | Procedures that modify data |

---

## MCP Configuration (DAB 1.7+)

Control how the entity is exposed via MCP (Model Context Protocol).

### Enable as Custom Tool

```json
{
  "mcp": {
    "custom-tool": true
  }
}
```

When `custom-tool` is true, the entity (typically a stored procedure) is exposed as a named tool that AI agents can call directly.

### MCP Tool Name

The entity name becomes the MCP tool name. Choose descriptive names:
- Good: `GetCustomerOrders`, `SearchProducts`, `CreateInvoice`
- Bad: `SP1`, `Proc_GetData`, `dbo.usp_get`

---

## Cache Configuration

Enable caching for frequently accessed entities.

```json
{
  "cache": {
    "enabled": true,
    "ttl-seconds": 60
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | false | Enable caching |
| `ttl-seconds` | number | 5 | Cache time-to-live |

### When to Use Caching

- Reference data that changes infrequently
- High-traffic read endpoints
- Expensive database queries

### When NOT to Use Caching

- Real-time data requirements
- Frequently updated entities
- User-specific data

---

## Complete Entity Example

```json
{
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
            "action": "read",
            "fields": {
              "exclude": ["cost", "supplierCode"]
            }
          }
        ]
      },
      {
        "role": "authenticated",
        "actions": ["read"]
      },
      {
        "role": "admin",
        "actions": ["*"]
      }
    ],
    "mappings": {
      "ProductName": "name",
      "UnitPrice": "price",
      "UnitsInStock": "stock"
    },
    "relationships": {
      "category": {
        "cardinality": "one",
        "target.entity": "Category",
        "source.fields": ["CategoryId"],
        "target.fields": ["CategoryId"]
      },
      "orderDetails": {
        "cardinality": "many",
        "target.entity": "OrderDetail",
        "source.fields": ["ProductId"],
        "target.fields": ["ProductId"]
      }
    },
    "rest": {
      "enabled": true,
      "path": "/products"
    },
    "graphql": {
      "enabled": true,
      "type": {
        "singular": "product",
        "plural": "products"
      }
    },
    "cache": {
      "enabled": true,
      "ttl-seconds": 30
    }
  }
}
```

---

## Policy Expression Syntax

Policies use OData-style expressions.

### Comparison Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equals | `@item.Status eq 'Active'` |
| `ne` | Not equals | `@item.Status ne 'Deleted'` |
| `gt` | Greater than | `@item.Price gt 100` |
| `ge` | Greater than or equal | `@item.Quantity ge 1` |
| `lt` | Less than | `@item.Stock lt 10` |
| `le` | Less than or equal | `@item.Discount le 50` |

### Logical Operators

| Operator | Example |
|----------|---------|
| `and` | `@item.Price gt 0 and @item.Price lt 1000` |
| `or` | `@item.Status eq 'Active' or @item.Status eq 'Pending'` |
| `not` | `not @item.IsDeleted eq true` |

### Special References

| Reference | Description |
|-----------|-------------|
| `@item.<field>` | Entity field value |
| `@claims.<claim>` | JWT claim value |

### Policy Examples

```json
// User can only see their own orders
"@item.UserId eq @claims.sub"

// User can only modify items in their department
"@item.DepartmentId eq @claims.departmentId"

// Quantity must be positive and reasonable
"@item.Quantity gt 0 and @item.Quantity lt 10000"

// Either admin or owner
"@claims.role eq 'admin' or @item.OwnerId eq @claims.sub"
```

---

## Next Steps

- See [relationships.md](relationships.md) for detailed relationship patterns
- See [runtime.md](runtime.md) for global configuration
- See [mcp.md](mcp.md) for AI agent integration
