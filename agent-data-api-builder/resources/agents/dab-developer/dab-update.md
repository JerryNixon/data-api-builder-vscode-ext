# dab update Command Reference

## Purpose

The `dab update` command modifies an existing entity in the DAB configuration. Use it to change permissions, add relationships, update mappings, or configure policies.

## Syntax

```bash
dab update <entity-name> [options]
```

Where `<entity-name>` is the name of an existing entity in your configuration.

## Source Options

| Option | Type | Description |
|--------|------|-------------|
| `--source`, `-s` | string | Change the database object |
| `--source.type` | string | Change entity type: `table`, `view`, `stored-procedure` |
| `--source.key-fields` | string | Change key field(s) |
| `--source.params` | string | Change stored procedure default parameters |

## Permission Options

| Option | Type | Description |
|--------|------|-------------|
| `--permissions`, `-p` | string | Add or replace permissions: `"role:actions"` |

**Note:** Using `--permissions` replaces the permissions for the specified role. To add additional roles, run `dab update` multiple times.

## Field Options

| Option | Type | Description |
|--------|------|-------------|
| `--fields.include` | string | Fields to include (replaces existing) |
| `--fields.exclude` | string | Fields to exclude (replaces existing) |
| `--map` | string | Add/update field mapping: `dbField:apiField` |

## REST Options

| Option | Type | Description |
|--------|------|-------------|
| `--rest` | boolean/string | Enable/disable REST or set custom path |
| `--rest.methods` | string | HTTP methods for stored procedures |

## GraphQL Options

| Option | Type | Description |
|--------|------|-------------|
| `--graphql` | boolean/string | Enable/disable GraphQL or set custom name |
| `--graphql.operation` | string | GraphQL operation type for stored procedures |
| `--graphql.singular` | string | Singular name for GraphQL type |
| `--graphql.plural` | string | Plural name for GraphQL type |

## Relationship Options

| Option | Type | Description |
|--------|------|-------------|
| `--relationship` | string | Relationship name |
| `--cardinality` | string | `one` or `many` |
| `--target.entity` | string | Target entity name |
| `--source.fields` | string | Source entity field(s) for join |
| `--target.fields` | string | Target entity field(s) for join |
| `--linking.object` | string | Linking table for many-to-many |
| `--linking.source.fields` | string | Linking table source fields |
| `--linking.target.fields` | string | Linking table target fields |

## Policy Options

| Option | Type | Description |
|--------|------|-------------|
| `--policy-request` | string | Request policy expression |
| `--policy-database` | string | Database policy (WHERE clause) |

## MCP Options (DAB 1.7+)

| Option | Type | Description |
|--------|------|-------------|
| `--mcp.custom-tool` | boolean | Expose as custom MCP tool |

## Stored Procedure Parameter Options

| Option | Type | Description |
|--------|------|-------------|
| `--parameters.name` | string | Parameter name to configure |
| `--parameters.description` | string | Parameter description |
| `--parameters.required` | boolean | Whether parameter is required |
| `--parameters.default` | string | Default parameter value |

## Cache Options

| Option | Type | Description |
|--------|------|-------------|
| `--cache.enabled` | boolean | Enable/disable caching |
| `--cache.ttl-seconds` | number | Cache TTL |

## Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `--config`, `-c` | string | Config file path |

---

## Examples

### Changing Permissions

#### Add a New Role
```bash
dab update Product \
  --permissions "admin:*"
```

#### Modify Existing Role
```bash
dab update Product \
  --permissions "anonymous:read"
```

### Adding Field Mappings

```bash
dab update Product \
  --map "ProductName:name" \
  --map "UnitPrice:price"
```

Result:
```json
{
  "Product": {
    "mappings": {
      "ProductName": "name",
      "UnitPrice": "price"
    }
  }
}
```

### Excluding Fields

```bash
dab update User \
  --fields.exclude "PasswordHash,SecurityStamp,TwoFactorSecret"
```

### Changing REST Path

```bash
dab update Product \
  --rest "products"
```

This changes the REST path from `/api/Product` to `/api/products`.

### Disabling GraphQL for Entity

```bash
dab update InternalData \
  --graphql false
```

### Enabling MCP Custom Tool

```bash
dab update GetCustomerOrders \
  --mcp.custom-tool true
```

---

## Relationship Examples

For detailed relationship patterns (one-to-many, many-to-many, self-referencing), see [relationships.md](relationships.md).

**Quick Reference:**

```bash
# One-to-many: Category has many Products
dab update Category --relationship "products" --cardinality many \
  --target.entity Product --source.fields "CategoryId" --target.fields "CategoryId"

# Many-to-many: Student to Courses via Enrollments
dab update Student --relationship "courses" --cardinality many \
  --target.entity Course --linking.object "dbo.Enrollments" \
  --linking.source.fields "StudentId" --linking.target.fields "CourseId"

# Self-referencing: Employee has a Manager
dab update Employee --relationship "manager" --cardinality one \
  --target.entity Employee --source.fields "ManagerId" --target.fields "EmployeeId"
```

---

## Policy Examples

### Database Policy (Row-Level Security)

Restrict read access to user's own records:

```bash
dab update Order \
  --permissions "authenticated:read" \
  --policy-database "@item.UserId eq @claims.userId"
```

The policy expression uses:
- `@item.<field>` - Reference entity fields
- `@claims.<claim>` - Reference JWT claims

### Request Policy

Validate request data:

```bash
dab update Order \
  --permissions "authenticated:create" \
  --policy-request "@item.Quantity gt 0 and @item.Quantity lt 100"
```

### Combined Policies Example

```bash
# Users can only read their own orders
dab update Order \
  --permissions "authenticated:read" \
  --policy-database "@item.CustomerId eq @claims.customerId"

# Users can only create orders for themselves
dab update Order \
  --permissions "authenticated:create" \
  --policy-request "@item.CustomerId eq @claims.customerId"
```

---

## Stored Procedure Parameter Configuration

### Adding Parameter Description

```bash
dab update GetProductsByCategory \
  --parameters.name "categoryId" \
  --parameters.description "The category ID to filter products"
```

### Setting Parameter as Required

```bash
dab update GetProductsByCategory \
  --parameters.name "categoryId" \
  --parameters.required true
```

### Setting Default Parameter Value

```bash
dab update GetProductsByCategory \
  --parameters.name "categoryId" \
  --parameters.default "1"
```

### Complete Parameter Configuration

```bash
dab update GetProductsByCategory \
  --parameters.name "categoryId" \
  --parameters.description "The category ID to filter products" \
  --parameters.required false \
  --parameters.default "1"
```

Result:
```json
{
  "GetProductsByCategory": {
    "source": {
      "type": "stored-procedure",
      "object": "dbo.usp_GetProductsByCategory",
      "parameters": {
        "categoryId": {
          "description": "The category ID to filter products",
          "required": false,
          "default": "1"
        }
      }
    }
  }
}
```

---

## Updating Multiple Properties

You can combine multiple options in one command:

```bash
dab update Product \
  --permissions "admin:*" \
  --map "ProductName:name" \
  --map "UnitPrice:price" \
  --fields.exclude "InternalCode" \
  --cache.enabled true \
  --cache.ttl-seconds 120
```

---

## Common Patterns

### Migrating from REST to GraphQL Only

```bash
dab update LegacyEntity \
  --rest false \
  --graphql true
```

### Adding Caching to High-Traffic Entity

```bash
dab update ProductCatalog \
  --cache.enabled true \
  --cache.ttl-seconds 300
```

### Enabling MCP for AI Agent Access

```bash
dab update SearchProducts \
  --mcp.custom-tool true
```

### Securing Sensitive Entity

```bash
dab update FinancialData \
  --permissions "admin:read" \
  --graphql false \
  --rest true \
  --policy-database "@claims.department eq 'Finance'"
```

---

## Common Mistakes

### 1. Entity Doesn't Exist

```bash
# Error: Entity 'Products' not found
dab update Products --permissions "admin:*"

# Solution: Check entity name (case-sensitive)
dab update Product --permissions "admin:*"
```

### 2. Invalid Relationship Configuration

```bash
# Error: Missing required relationship options
dab update Category --relationship "products"

# Solution: Include all required relationship options
dab update Category \
  --relationship "products" \
  --cardinality many \
  --target.entity Product \
  --source.fields "CategoryId" \
  --target.fields "CategoryId"
```

### 3. Invalid Policy Syntax

```bash
# Error: Invalid policy expression
dab update Order --policy-database "UserId = @claims.userId"

# Solution: Use correct OData-style syntax
dab update Order --policy-database "@item.UserId eq @claims.userId"
```

### 4. Wrong Parameter Name

```bash
# Error: Parameter not found
dab update GetProducts --parameters.name "category"

# Solution: Check stored procedure definition for exact parameter names
dab update GetProducts --parameters.name "categoryId"
```

---

## Next Steps

- See [relationships.md](relationships.md) for detailed relationship patterns
- See [entities.md](entities.md) for entity configuration options
- See [runtime.md](runtime.md) for runtime settings
