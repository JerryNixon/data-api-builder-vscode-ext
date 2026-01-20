# dab validate Command Reference

## Purpose

The `dab validate` command checks a DAB configuration file for errors before starting the engine. It performs multiple validation stages to catch configuration problems early.

## Syntax

```bash
dab validate [options]
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--config`, `-c` | string | dab-config.json | Configuration file path |

## Validation Stages

The `dab validate` command runs five sequential validation stages:

### Stage 1: Schema Validation

Validates the configuration file against the DAB JSON schema.

**Checks:**
- JSON syntax is valid
- Required fields are present
- Field types match schema
- Enum values are valid

**Common Errors:**
```
Error: Invalid JSON syntax at line 15
Error: Required property 'database-type' is missing
Error: 'source.type' must be one of: table, view, stored-procedure
```

### Stage 2: Configuration Properties Validation

Validates logical consistency of configuration properties.

**Checks:**
- Entity names are unique
- Source types have required properties
- Views have key-fields defined
- Stored procedures have valid parameters
- Relationship targets exist
- Field mappings are valid

**Common Errors:**
```
Error: Entity 'Product' is defined multiple times
Error: View 'ProductSummary' requires key-fields
Error: Relationship 'orders' references non-existent entity 'Order'
```

### Stage 3: Permission Validation

Validates permission configurations for all entities.

**Checks:**
- Actions are valid for entity type
- Role names are valid strings
- Policy expressions are syntactically correct
- Field-level permissions reference existing fields

**Common Errors:**
```
Error: Action 'execute' is not valid for table 'Product'
Error: Action 'read' is not valid for stored-procedure 'CreateOrder'
Error: Policy expression syntax error: missing closing parenthesis
```

### Stage 4: Database Connection Validation

Attempts to connect to the database using the connection string.

**Checks:**
- Connection string is valid
- Environment variable (if used) is set
- Database server is reachable
- Authentication succeeds
- Database exists

**Common Errors:**
```
Error: Environment variable 'DATABASE_CONNECTION_STRING' is not set
Error: Cannot connect to server 'localhost': Connection refused
Error: Login failed for user 'sa'
Error: Database 'MyDatabase' does not exist
```

### Stage 5: Entity Metadata Validation

Validates that database objects exist and match the configuration.

**Checks:**
- Tables, views, stored procedures exist
- Column names match configuration
- Key fields exist on views
- Stored procedure parameters match
- Relationship foreign keys exist

**Common Errors:**
```
Error: Table 'dbo.Products' does not exist
Error: Column 'ProductName' does not exist in 'dbo.Products'
Error: Key field 'ProductId' does not exist in view 'dbo.vw_Products'
Error: Stored procedure 'dbo.usp_GetProducts' does not exist
Error: Parameter 'categoryId' is not defined in stored procedure
```

---

## Running Validation

### Basic Validation
```bash
dab validate
```

### Validate Specific Config File
```bash
dab validate --config dab-config.production.json
```

### Validate Before Deployment
```bash
# Set environment variable first
$env:DATABASE_CONNECTION_STRING = "Server=prod-server;Database=ProdDb;..."

# Then validate
dab validate --config dab-config.production.json
```

---

## Success Output

When validation passes all stages:
```
Validating dab-config.json...
✓ Schema validation passed
✓ Config properties validation passed
✓ Permission validation passed
✓ Database connection validation passed
✓ Entity metadata validation passed

Configuration is valid.
```

---

## Error Output Examples

### JSON Syntax Error
```
Validating dab-config.json...
✗ Schema validation failed

Error: Unexpected token '}' at line 25, column 3
  Expected: property name or '}'

Hint: Check for missing commas or extra commas before '}'
```

### Missing Required Field
```
Validating dab-config.json...
✗ Schema validation failed

Error: Missing required property 'database-type' in 'data-source'

Hint: Add "database-type": "mssql" to your data-source configuration
```

### Invalid Action for Entity Type
```
Validating dab-config.json...
✓ Schema validation passed
✓ Config properties validation passed
✗ Permission validation failed

Error: Action 'execute' is not valid for entity 'Product' of type 'table'
  Valid actions for tables: create, read, update, delete, *

Hint: Change the action to one of: create, read, update, delete, *
```

### Database Connection Failed
```
Validating dab-config.json...
✓ Schema validation passed
✓ Config properties validation passed
✓ Permission validation passed
✗ Database connection validation failed

Error: Environment variable 'DATABASE_CONNECTION_STRING' is not set

Hint: Set the environment variable before running validation:
  $env:DATABASE_CONNECTION_STRING = "Server=...;Database=..."
```

### Entity Not Found
```
Validating dab-config.json...
✓ Schema validation passed
✓ Config properties validation passed
✓ Permission validation passed
✓ Database connection validation passed
✗ Entity metadata validation failed

Error: Table 'dbo.Products' does not exist in database 'MyDatabase'

Hint: Check the table name and schema. Available tables:
  - dbo.Product
  - dbo.Categories
  - dbo.Orders
```

---

## Validation Best Practices

### 1. Validate After Every Change
```bash
# After adding an entity
dab add Product --source dbo.Products --permissions "anonymous:read"
dab validate

# After updating configuration
dab configure --runtime.cache.enabled true
dab validate
```

### 2. Validate Before Starting
```bash
dab validate && dab start
```

### 3. Validate in CI/CD Pipeline
```yaml
# GitHub Actions example
- name: Validate DAB Configuration
  run: |
    dotnet tool install --global Microsoft.DataApiBuilder
    dab validate --config dab-config.json
  env:
    DATABASE_CONNECTION_STRING: ${{ secrets.DATABASE_CONNECTION_STRING }}
```

### 4. Validate Different Environments
```bash
# Development
$env:DATABASE_CONNECTION_STRING = "Server=localhost;Database=DevDb;..."
dab validate --config dab-config.development.json

# Production
$env:DATABASE_CONNECTION_STRING = "Server=prod-server;Database=ProdDb;..."
dab validate --config dab-config.production.json
```

---

## Troubleshooting Common Issues

### Issue: Environment Variable Not Found

**Error:**
```
Environment variable 'DATABASE_CONNECTION_STRING' is not set
```

**Solutions:**

PowerShell:
```powershell
$env:DATABASE_CONNECTION_STRING = "Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true"
dab validate
```

Bash:
```bash
export DATABASE_CONNECTION_STRING="Server=localhost;Database=MyDb;..."
dab validate
```

### Issue: Connection Refused

**Error:**
```
Cannot connect to server 'localhost': Connection refused
```

**Solutions:**
1. Verify SQL Server is running
2. Check the server name/address
3. Verify the port (default 1433)
4. Check firewall settings

### Issue: Certificate Error

**Error:**
```
The certificate chain was issued by an authority that is not trusted
```

**Solution:**
Add `TrustServerCertificate=true` to your connection string (development only).

### Issue: Table Not Found

**Error:**
```
Table 'dbo.Products' does not exist
```

**Solutions:**
1. Verify the table exists in the database
2. Check the schema name (dbo, sales, etc.)
3. Verify case sensitivity (some databases are case-sensitive)
4. Check user permissions to access the table

### Issue: View Missing Key Fields

**Error:**
```
View 'ProductSummary' requires key-fields
```

**Solution:**
```bash
dab update ProductSummary --source.key-fields "ProductId"
```

---

## Validation vs. Start

| Aspect | dab validate | dab start |
|--------|--------------|-----------|
| Purpose | Check configuration | Run the engine |
| Database connection | Tests once | Maintains connection |
| Output | Pass/fail report | Running server |
| Use case | CI/CD, pre-deployment | Development, production |
| Speed | Fast (seconds) | Starts server (longer) |

**Recommendation:** Always run `dab validate` before `dab start` to catch errors early.

---

## Exit Codes

| Exit Code | Meaning |
|-----------|---------|
| 0 | Validation passed |
| 1 | Validation failed |

Use exit codes in scripts:
```powershell
dab validate
if ($LASTEXITCODE -ne 0) {
    Write-Error "DAB validation failed"
    exit 1
}
Write-Output "Validation passed, starting server..."
dab start
```

---

## Next Steps

- See [dab-start.md](dab-start.md) to run the DAB engine
- See [troubleshooting.md](troubleshooting.md) for more error solutions
