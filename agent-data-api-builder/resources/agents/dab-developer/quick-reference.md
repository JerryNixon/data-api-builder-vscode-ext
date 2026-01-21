# DAB Quick Reference

## CLI Commands Overview

| Command | Purpose | Common Usage |
|---------|---------|--------------|
| `dab init` | Create new configuration | `dab init --database-type mssql --connection-string "@env('DB_CONN')"` |
| `dab add` | Add entity to config | `dab add Product --source dbo.Products --permissions "anonymous:*"` |
| `dab update` | Modify existing entity | `dab update Product --relationship "category" --cardinality one --target.entity Category` |
| `dab configure` | Change runtime settings | `dab configure --runtime.rest.enabled true --runtime.graphql.enabled true` |
| `dab validate` | Validate configuration | `dab validate -c dab-config.json` |
| `dab start` | Start DAB engine | `dab start -c dab-config.json` |

---

## Quick Start Workflow

### 1. Install DAB
```bash
# Latest stable version
dotnet tool install --global Microsoft.DataApiBuilder

# Preview version (for MCP features)
dotnet tool install --global Microsoft.DataApiBuilder --prerelease

# Verify installation
dab --version
```

### 2. Create Configuration
```bash
# Initialize with MSSQL
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode development \
  --rest.enabled true \
  --graphql.enabled true \
  --mcp.enabled true

# Set environment variable
export DATABASE_CONNECTION_STRING="Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true"
```

### 3. Add Entities
```bash
# Add a table
dab add Product \
  --source dbo.Products \
  --permissions "anonymous:*" \
  --rest true \
  --graphql true

# Add a view
dab add ProductSummary \
  --source dbo.vw_ProductSummary \
  --source.type view \
  --source.key-fields "ProductId" \
  --permissions "anonymous:read" \
  --rest true \
  --graphql true

# Add a stored procedure
dab add GetProductById \
  --source dbo.usp_GetProductById \
  --source.type stored-procedure \
  --permissions "anonymous:execute" \
  --rest true \
  --graphql false
```

### 4. Add Relationships
```bash
# One-to-many: Category → Products
dab update Category \
  --relationship "products" \
  --cardinality many \
  --target.entity Product \
  --source.fields "CategoryId" \
  --target.fields "CategoryId"

# Many-to-one: Product → Category
dab update Product \
  --relationship "category" \
  --cardinality one \
  --target.entity Category \
  --source.fields "CategoryId" \
  --target.fields "CategoryId"
```

### 5. Validate and Start
```bash
# Validate configuration
dab validate

# Start the engine
dab start
```

### 6. Test Endpoints
```bash
# REST - Get all products
curl http://localhost:5000/api/Product

# REST - Get specific product
curl http://localhost:5000/api/Product/id/1

# GraphQL - Query with relationship
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ products { id name category { name } } }"}'

# MCP - List tools
curl http://localhost:5000/mcp/tools/list
```

---

## Common Patterns

### Development Configuration (Permissive)
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode development \
  --auth.provider Simulator \
  --rest.enabled true \
  --graphql.enabled true \
  --mcp.enabled true \
  --cache.enabled true \
  --cache.ttl-seconds 5

dab add Entity --source dbo.Table --permissions "anonymous:*"
```

### Production Configuration (Secure)
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode production \
  --auth.provider AzureAd \
  --rest.enabled true \
  --graphql.enabled false \
  --mcp.enabled false \
  --cache.enabled true \
  --cache.ttl-seconds 300

dab add Entity --source dbo.Table --permissions "authenticated:read,update"
```

### MCP-Enabled Stored Procedure
```bash
# 1. Create config with MCP
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --mcp.enabled true \
  --mcp.path "/mcp"

# 2. Add stored procedure
dab add GetBook \
  --source dbo.usp_GetBookById \
  --source.type stored-procedure \
  --permissions "anonymous:execute" \
  --rest true \
  --graphql false

# 3. Configure parameters
dab update GetBook \
  --parameters.name bookId \
  --parameters.description "The unique identifier for the book" \
  --parameters.required true

# 4. Enable as MCP tool
dab update GetBook --mcp.custom-tool true
```

---

## Permission Quick Reference

### Permission Actions by Entity Type

| Entity Type | Available Actions |
|-------------|-------------------|
| Table | `create`, `read`, `update`, `delete`, `*` |
| View | `read`, `update`, `delete`, `*` |
| Stored Procedure | `execute`, `*` |

### Common Permission Patterns

```bash
# Anonymous full access (development only)
--permissions "anonymous:*"

# Anonymous read-only
--permissions "anonymous:read"

# Authenticated users can read and update
--permissions "authenticated:read,update"

# Admin full access
--permissions "admin:*"

# Multiple roles
dab add Product --permissions "anonymous:read"
dab update Product --permissions "admin:*"
```

---

## Connection String Templates

### Windows Authentication (Local)
```
Server=localhost;Database=MyDatabase;Integrated Security=true;TrustServerCertificate=true
```

### SQL Server Authentication
```
Server=localhost;Database=MyDatabase;User Id=myuser;Password=mypassword;TrustServerCertificate=true
```

### Azure SQL (Managed Identity)
```
Server=yourserver.database.windows.net;Database=MyDatabase;Authentication=Active Directory Default
```

### Azure SQL (Connection String)
```
Server=yourserver.database.windows.net;Database=MyDatabase;User Id=myuser@yourserver;Password=mypassword;Encrypt=true
```

### Environment Variable Reference
```bash
# In config file
"connection-string": "@env('DATABASE_CONNECTION_STRING')"

# Set in environment (PowerShell)
$env:DATABASE_CONNECTION_STRING = "Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true"

# Set in environment (Bash)
export DATABASE_CONNECTION_STRING="Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true"

# Set in environment (CMD)
set DATABASE_CONNECTION_STRING=Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true
```

---

## Troubleshooting Checklist

### DAB Won't Start

1. **Check DAB is installed**
   ```bash
   dab --version
   ```

2. **Verify config file exists**
   ```bash
   ls dab-config.json
   ```

3. **Validate configuration**
   ```bash
   dab validate
   ```

4. **Check environment variable**
   ```bash
   # PowerShell
   $env:DATABASE_CONNECTION_STRING
   
   # Bash
   echo $DATABASE_CONNECTION_STRING
   ```

5. **Test database connection**
   ```bash
   sqlcmd -S localhost -d MyDatabase -Q "SELECT 1"
   ```

### Common Error Solutions

| Error | Solution |
|-------|----------|
| "dab: command not found" | Install DAB: `dotnet tool install --global Microsoft.DataApiBuilder` |
| "Connection string not found" | Set environment variable or use direct connection string |
| "Entity not found" | Check source object exists in database |
| "Permission denied" | Verify database user has correct permissions |
| "Port already in use" | Stop existing DAB instance or change port |
| "Schema validation failed" | Run `dab validate` for detailed errors |

---

## Default Endpoints

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `GET /api/<entity>` | List all records | `GET /api/Product` |
| `GET /api/<entity>/id/<id>` | Get by ID | `GET /api/Product/id/1` |
| `POST /api/<entity>` | Create record | `POST /api/Product` |
| `PUT /api/<entity>/id/<id>` | Update record | `PUT /api/Product/id/1` |
| `DELETE /api/<entity>/id/<id>` | Delete record | `DELETE /api/Product/id/1` |
| `POST /graphql` | GraphQL queries | `POST /graphql` |
| `GET /mcp/tools/list` | MCP tool list | `GET /mcp/tools/list` |
| `POST /mcp/tools/call` | MCP tool execution | `POST /mcp/tools/call` |

---

## REST Query Parameters

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `$filter` | Filter results | `?$filter=price gt 100` |
| `$orderby` | Sort results | `?$orderby=name asc` |
| `$select` | Select fields | `?$select=id,name,price` |
| `$top` | Limit results | `?$top=10` |
| `$skip` | Skip results | `?$skip=20` |
| `$first` | First N results | `?$first=5` |

### Filter Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equals | `price eq 100` |
| `ne` | Not equals | `price ne 100` |
| `gt` | Greater than | `price gt 100` |
| `ge` | Greater or equal | `price ge 100` |
| `lt` | Less than | `price lt 100` |
| `le` | Less or equal | `price le 100` |
| `and` | Logical AND | `price gt 100 and category eq 'Electronics'` |
| `or` | Logical OR | `price lt 50 or price gt 500` |

---

## GraphQL Examples

### Basic Query
```graphql
{
  products {
    id
    name
    price
  }
}
```

### Query with Filter
```graphql
{
  products(filter: { price: { gt: 100 } }) {
    id
    name
    price
  }
}
```

### Query with Relationship
```graphql
{
  products {
    id
    name
    category {
      name
      description
    }
  }
}
```

### Mutation (Create)
```graphql
mutation {
  createProduct(item: {
    name: "New Product"
    price: 99.99
    categoryId: 1
  }) {
    id
    name
  }
}
```

### Mutation (Update)
```graphql
mutation {
  updateProduct(id: 1, item: {
    price: 89.99
  }) {
    id
    price
  }
}
```

---

## File Locations

| File | Purpose | Location |
|------|---------|----------|
| `dab-config.json` | DAB configuration | Project root |
| `.env` | Environment variables | Project root |
| `local.settings.json` | Azure Functions settings | Project root |
| `.gitignore` | Git exclusions | Project root |

### Recommended .env Content
```bash
DATABASE_CONNECTION_STRING=Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true
```

### Recommended .gitignore Content
```
dab-config.json
.env
local.settings.json
appsettings.Development.json
```

---

## Learning Resources

- **Official Documentation**: https://learn.microsoft.com/azure/data-api-builder/
- **GitHub Repository**: https://github.com/Azure/data-api-builder
- **JSON Schema**: https://github.com/Azure/data-api-builder/blob/main/schemas/dab.draft.schema.json
- **Community Samples**: https://github.com/Azure-Samples/data-api-builder

---

## Next Steps by Scenario

### Just Getting Started
1. Install DAB
2. Create sample database
3. Run `dab init`
4. Add one table with `dab add`
5. Run `dab start`
6. Test REST endpoint

### Adding to Existing Database
1. Run `dab init` with connection string
2. Query database schema with SQL metadata queries
3. Add entities one by one with `dab add`
4. Define relationships with `dab update`
5. Validate and start

### Migrating to Production
1. Change `--host-mode production`
2. Configure `--auth.provider AzureAd`
3. Update permissions to specific roles
4. Disable unnecessary endpoints
5. Test authentication flow
6. Deploy to Azure

### Enabling MCP for AI
1. Run `dab init` with `--mcp.enabled true`
2. Add stored procedures as entities
3. Configure parameters with descriptions
4. Enable custom tools with `--mcp.custom-tool true`
5. Test with MCP client
