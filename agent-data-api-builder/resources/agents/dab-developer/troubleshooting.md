# DAB Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Issue: "dab: command not found"

**Cause**: DAB CLI is not installed or not in PATH.

**Solution**:
```bash
# Install DAB globally
dotnet tool install --global Microsoft.DataApiBuilder

# Or install preview version for latest features
dotnet tool install --global Microsoft.DataApiBuilder --prerelease

# Verify installation
dab --version

# If still not found, check .NET tools PATH
dotnet tool list --global
```

**Additional Steps**:
- Restart terminal after installation
- Check that .NET SDK 8.0+ is installed: `dotnet --version`
- Verify PATH includes .NET tools directory

---

#### Issue: "A compatible .NET SDK was not found"

**Cause**: .NET SDK 8.0 or later is not installed.

**Solution**:
```bash
# Check current .NET version
dotnet --version

# Download and install .NET 8.0 SDK
# https://dotnet.microsoft.com/download/dotnet/8.0
```

---

### Configuration Issues

#### Issue: "Configuration file not found"

**Cause**: `dab-config.json` doesn't exist in current directory.

**Solution**:
```bash
# Create configuration file
dab init --database-type mssql --connection-string "@env('DATABASE_CONNECTION_STRING')"

# Or specify config file path
dab start -c ./config/dab-config.json
```

---

#### Issue: "Schema validation failed"

**Cause**: Configuration file has invalid JSON structure or missing required fields.

**Solution**:
```bash
# Run validation to see detailed errors
dab validate -c dab-config.json

# Common fixes:
# 1. Check for missing commas or brackets
# 2. Verify all entity sources exist in database
# 3. Ensure required fields are present
# 4. Validate permission format is "role:action"
```

**Example Validation Output**:
```
Error: Entity 'Product' source 'dbo.InvalidTable' not found in database
Error: Permission format invalid. Expected 'role:action', got 'anonymous'
Error: Required field 'data-source.connection-string' is missing
```

---

#### Issue: "Environment variable not found"

**Cause**: Connection string uses `@env('VAR_NAME')` but variable is not set.

**Solution**:
```bash
# PowerShell
$env:DATABASE_CONNECTION_STRING = "Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true"

# Bash
export DATABASE_CONNECTION_STRING="Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true"

# CMD
set DATABASE_CONNECTION_STRING=Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true

# Verify it's set
# PowerShell
$env:DATABASE_CONNECTION_STRING

# Bash
echo $DATABASE_CONNECTION_STRING
```

**Alternative**: Use `.env` file in project root:
```bash
DATABASE_CONNECTION_STRING=Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true
```

---

### Database Connection Issues

#### Issue: "Cannot connect to database"

**Cause**: Database server is unreachable or connection string is incorrect.

**Solution**:
```bash
# Test connection with sqlcmd
sqlcmd -S localhost -d MyDatabase -Q "SELECT 1"

# Common fixes:
# 1. Verify server is running
# 2. Check server name and instance
# 3. Verify database exists
# 4. Check firewall rules
# 5. Verify authentication credentials
```

**Connection String Checklist**:
- ✅ Server name correct (e.g., `localhost`, `.\SQLEXPRESS`, `server.database.windows.net`)
- ✅ Database name correct
- ✅ Authentication method correct (Integrated Security, SQL Auth, Azure AD)
- ✅ `TrustServerCertificate=true` for local SQL Server
- ✅ `Encrypt=true` for Azure SQL

---

#### Issue: "Login failed for user"

**Cause**: Authentication credentials are incorrect or user doesn't have permissions.

**Solutions**:

**Windows Authentication**:
```
Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true
```

**SQL Server Authentication**:
```
Server=localhost;Database=MyDb;User Id=myuser;Password=mypassword;TrustServerCertificate=true
```

**Azure SQL (Managed Identity)**:
```
Server=yourserver.database.windows.net;Database=MyDb;Authentication=Active Directory Default
```

**Verify User Permissions**:
```sql
-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [username];

-- For stored procedures
GRANT EXECUTE ON SCHEMA::dbo TO [username];
```

---

#### Issue: "Database does not exist"

**Cause**: Database name is misspelled or database hasn't been created.

**Solution**:
```sql
-- Check existing databases
SELECT name FROM sys.databases;

-- Create database if needed
CREATE DATABASE MyDatabase;
```

---

### Entity Configuration Issues

#### Issue: "Entity source not found"

**Cause**: Table, view, or stored procedure doesn't exist in database.

**Solution**:
```sql
-- Check if table exists
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Products';

-- Check if view exists
SELECT * FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = 'ProductSummary';

-- Check if stored procedure exists
SELECT * FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_NAME = 'usp_GetProduct';

-- Verify schema name (dbo, sales, etc.)
SELECT SCHEMA_NAME(schema_id) AS SchemaName, name AS ObjectName
FROM sys.objects
WHERE name = 'Products';
```

---

#### Issue: "View requires key-fields"

**Cause**: Views don't have primary key metadata, so DAB requires manual specification.

**Solution**:
```bash
# Add view with explicit key fields
dab add ProductView \
  --source dbo.vw_ProductSummary \
  --source.type view \
  --source.key-fields "ProductId" \
  --permissions "anonymous:read"

# Multiple key fields
dab add OrderLineView \
  --source dbo.vw_OrderLines \
  --source.type view \
  --source.key-fields "OrderId,ProductId" \
  --permissions "anonymous:read"
```

---

#### Issue: "Permission format invalid"

**Cause**: Permission string doesn't follow `"role:action"` format.

**Common Mistakes**:
```bash
# ❌ Wrong - missing role
dab add Product --permissions "read"

# ❌ Wrong - missing action
dab add Product --permissions "anonymous"

# ❌ Wrong - wrong action for entity type
dab add MyProc --source.type stored-procedure --permissions "anonymous:read"

# ✅ Correct
dab add Product --permissions "anonymous:read"
dab add Product --permissions "authenticated:create,read,update"
dab add MyProc --source.type stored-procedure --permissions "anonymous:execute"
```

---

### Startup Issues

#### Issue: "Port already in use"

**Cause**: Another process is using the default port (5000/5001).

**Solution**:
```bash
# Change port via environment variable
export ASPNETCORE_URLS="http://localhost:5500"
dab start

# Or configure in dab-config.json
dab configure --runtime.host.port 5500
```

**Find Process Using Port** (PowerShell):
```powershell
Get-NetTCPConnection -LocalPort 5000 | Select-Object -Property OwningProcess
Stop-Process -Id <ProcessId>
```

**DAB process cleanup**: If DAB crashes or is interrupted, port may stay in use briefly:
```powershell
# Wait for TIME_WAIT to clear (a few seconds)
# Or find and kill lingering DAB processes
Get-Process | Where-Object {$_.ProcessName -like "*dab*" -or $_.ProcessName -like "*DataApiBuilder*"} | Stop-Process -Force
```

---

#### Issue: "DAB starts but endpoints return 404"

**Cause**: Endpoint paths are misconfigured or entity is not exposed.

**Solution**:
```bash
# Check configuration
cat dab-config.json | grep -A 5 "runtime"

# Verify entity REST configuration
cat dab-config.json | grep -A 5 "Product"

# Ensure REST is enabled for entity
dab update Product --rest true

# Check REST path setting
dab configure --runtime.rest.path "/api"

# Test with full URL
curl http://localhost:5000/api/Product
```

**Common mistake - explicit path in entity REST config:**
```json
// ❌ WRONG - causes double slash like /api//Product
"rest": { "enabled": true, "path": "/Product" }

// ✅ CORRECT - entity name becomes path automatically
"rest": { "enabled": true }
```

---

#### Issue: "DAB stops when running another command"

**Cause**: DAB started with `run_in_terminal` with `isBackground=true` exits when terminal output is read.

**Solution**: Start DAB in a separate PowerShell window:
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "dab start" -WorkingDirectory "C:\path\to\project"
```

---

#### Issue: "GraphQL introspection disabled"

**Cause**: Running in `production` mode disables introspection by default.

**Solution**:
```bash
# For development, use development mode
dab configure --runtime.host.mode development

# Or explicitly enable introspection
dab configure --runtime.graphql.allow-introspection true
```

---

### Runtime Issues

#### Issue: "Request returns empty results"

**Cause**: Database table is empty or filter is too restrictive.

**Solution**:
```bash
# Test query directly in database
sqlcmd -S localhost -d MyDatabase -Q "SELECT * FROM dbo.Products"

# Try without filters
curl http://localhost:5000/api/Product

# Check for typos in filter
curl "http://localhost:5000/api/Product?\$filter=name eq 'Widget'"
```

---

#### Issue: "Relationship not working in GraphQL"

**Cause**: Relationship is not properly configured or fields don't match.

**Solution**:
```bash
# Verify relationship configuration
cat dab-config.json | grep -A 10 "relationships"

# Check field names match database
sqlcmd -S localhost -d MyDatabase -Q "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Products'"

# Update relationship with correct fields
dab update Product \
  --relationship "category" \
  --cardinality one \
  --target.entity Category \
  --source.fields "CategoryId" \
  --target.fields "CategoryId"

# Validate
dab validate
```

---

#### Issue: "CORS error in browser"

**Cause**: Frontend app domain is not allowed by CORS policy.

**Solution**:
```bash
# Allow specific origin
dab configure --runtime.host.cors.origins "http://localhost:3000"

# Allow multiple origins
dab configure --runtime.host.cors.origins "http://localhost:3000,https://myapp.com"

# Allow all origins (development only)
dab configure --runtime.host.cors.origins "*"
```

**Note**: For production, always specify explicit origins.

---

### MCP Issues

#### Issue: "MCP endpoint returns 404"

**Cause**: MCP is not enabled or path is incorrect.

**Solution**:
```bash
# Enable MCP
dab configure --runtime.mcp.enabled true --runtime.mcp.path "/mcp"

# Verify in config
cat dab-config.json | grep -A 3 "mcp"

# Test endpoint
curl http://localhost:5000/mcp/tools/list
```

---

#### Issue: "Stored procedure not appearing as MCP tool"

**Cause**: Stored procedure needs `--mcp.custom-tool true` flag.

**Solution**:
```bash
# Add stored procedure
dab add GetProduct \
  --source dbo.usp_GetProductById \
  --source.type stored-procedure \
  --permissions "anonymous:execute"

# Enable as MCP custom tool
dab update GetProduct --mcp.custom-tool true

# Validate
dab validate
dab start
curl http://localhost:5000/mcp/tools/list
```

---

### Performance Issues

#### Issue: "Queries are slow"

**Causes and Solutions**:

1. **Missing database indexes**
   ```sql
   -- Create index on frequently filtered columns
   CREATE INDEX IX_Products_CategoryId ON dbo.Products(CategoryId);
   CREATE INDEX IX_Products_Name ON dbo.Products(Name);
   ```

2. **Cache disabled**
   ```bash
   # Enable caching
   dab configure --runtime.cache.enabled true --runtime.cache.ttl-seconds 300
   ```

3. **Too many results**
   ```bash
   # Use pagination
   curl "http://localhost:5000/api/Product?\$top=10"
   ```

4. **Complex relationships**
   ```bash
   # Use $select to limit fields
   curl "http://localhost:5000/api/Product?\$select=id,name"
   ```

---

### Security Issues

#### Issue: "Anonymous access not working"

**Cause**: Authentication provider is not set to allow anonymous access.

**Solution**:
```bash
# For development, use Simulator
dab configure --runtime.host.authentication.provider Simulator

# Ensure entity has anonymous permissions
dab update Product --permissions "anonymous:read"
```

---

#### Issue: "Authenticated users can't access data"

**Cause**: JWT token is missing or invalid.

**Solution**:
```bash
# Verify authentication configuration
cat dab-config.json | grep -A 5 "authentication"

# For development, use Simulator
dab configure --runtime.host.authentication.provider Simulator

# Test with X-MS-CLIENT-PRINCIPAL header
curl -H "X-MS-CLIENT-PRINCIPAL: eyJ..." http://localhost:5000/api/Product
```

---

## Diagnostic Commands

### Check DAB Installation
```bash
dab --version
dotnet tool list --global
dotnet --version
```

### Validate Configuration
```bash
dab validate -c dab-config.json
```

### Check Database Connection
```bash
sqlcmd -S localhost -d MyDatabase -Q "SELECT 1"
```

### View Configuration
```bash
cat dab-config.json | jq .
```

### Test Endpoints
```bash
# Health check
curl http://localhost:5000/health

# REST endpoint
curl http://localhost:5000/api/Product

# GraphQL schema
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# MCP tools
curl http://localhost:5000/mcp/tools/list
```

---

## Error Message Reference

| Error Message | Meaning | Solution |
|--------------|---------|----------|
| "Entity source not found" | Database object doesn't exist | Verify table/view/proc exists in database |
| "Permission format invalid" | Permission string malformed | Use format "role:action" |
| "Connection string not found" | Environment variable missing | Set env var or use direct connection string |
| "Schema validation failed" | Config JSON structure invalid | Run `dab validate` for details |
| "Port already in use" | Another process using port | Change port or stop other process |
| "Key fields required for views" | View missing key specification | Add `--source.key-fields` |
| "Login failed for user" | Authentication credentials wrong | Verify user/password or use Windows Auth |
| "Database does not exist" | Database name incorrect | Check database name and create if needed |

---

## Getting Help

1. **Run validation**: `dab validate` provides detailed error information
2. **Check logs**: DAB outputs detailed logging to console
3. **Review documentation**: https://learn.microsoft.com/azure/data-api-builder/
4. **GitHub Issues**: https://github.com/Azure/data-api-builder/issues
5. **Community**: Ask on Stack Overflow with `data-api-builder` tag

---

## Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Set log level environment variable
export Logging__LogLevel__Default=Debug
dab start

# Or in dab-config.json
{
  "runtime": {
    "telemetry": {
      "application-insights": {
        "enabled": false
      }
    }
  }
}
```

---

## Common Configuration Mistakes

### ❌ Wrong: Missing schema in source
```json
{
  "source": {
    "object": "Products"  // Missing schema
  }
}
```

### ✅ Correct: Include schema
```json
{
  "source": {
    "object": "dbo.Products"
  }
}
```

---

### ❌ Wrong: Permission without role
```bash
dab add Product --permissions "read"
```

### ✅ Correct: Include role
```bash
dab add Product --permissions "anonymous:read"
```

---

### ❌ Wrong: Wrong action for stored procedure
```bash
dab add MyProc --source.type stored-procedure --permissions "anonymous:read"
```

### ✅ Correct: Use 'execute' for stored procedures
```bash
dab add MyProc --source.type stored-procedure --permissions "anonymous:execute"
```

---

### ❌ Wrong: View without key fields
```bash
dab add MyView --source dbo.vw_Summary --source.type view
```

### ✅ Correct: Specify key fields for views
```bash
dab add MyView --source dbo.vw_Summary --source.type view --source.key-fields "Id"
```

---

## Docker-Specific Issues

### Issue: "Port 1433 conflict with local SQL Server"

**Cause**: Host machine has SQL Server running on port 1433, conflicting with Docker container.

**Solution**: Use a different host port in docker-compose.yml:
```yaml
ports:
  - "1434:1433"  # Map to 1434 on host, 1433 in container
```

Then update connection string:
```
Server=localhost,1434;Database=MyDb;...
```

**Detection**: Connection fails from host but works from inside container.

---

### Issue: "sqlcmd fails but DAB connects fine"

**Cause**: Go-based `sqlcmd` (v1.x) has different behavior than .NET SqlClient used by DAB.

**Solution**: Don't rely on `sqlcmd` from host to validate connections. Test with .NET:
```powershell
$connStr = "Server=localhost,1434;Database=MyDb;User Id=sa;Password=YourPass;TrustServerCertificate=true"
$conn = New-Object System.Data.SqlClient.SqlConnection $connStr
$conn.Open()
$conn.State  # Should show "Open"
$conn.Close()
```

Or test from inside the container:
```bash
docker exec my-container /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourPass" -C -Q "SELECT 1"
```

**Key insight**: DAB uses .NET SqlClient internally—if .NET connects, DAB will connect.

---

### Issue: "SQL scripts fail after container start"

**Cause**: SQL Server isn't fully ready yet (takes 15-20 seconds to initialize).

**Solution**: Wait before running setup scripts:
```powershell
Start-Sleep -Seconds 20
docker exec my-container /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourPass" -C -i /tmp/setup.sql
```

Or use healthcheck in docker-compose.yml:
```yaml
healthcheck:
  test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" || exit 1
  interval: 10s
  timeout: 5s
  retries: 10
  start_period: 30s
```

---

### Issue: "Environment variable changes not taking effect"

**Cause**: DAB reads .env file which may override shell environment variables.

**Solution**: Update BOTH the .env file AND shell variable, or rely solely on .env:
```powershell
# Update .env file
"DATABASE_CONNECTION_STRING=Server=localhost,1434;..." | Set-Content .env

# AND update shell (if running DAB from same shell)
$env:DATABASE_CONNECTION_STRING = "Server=localhost,1434;..."
```

---

### Issue: "Container-to-container networking not working"

**Cause**: Using `localhost` instead of service name for container-to-container communication.

**Solution**: Use service names within Docker network:

| DAB Location | SQL Server Reference |
|--------------|---------------------|
| Host machine | `localhost,<port>` or `127.0.0.1,<port>` |
| Docker (same network) | `<service-name>` (e.g., `sqlserver`) |
| Docker (to host) | `host.docker.internal` |

Example docker-compose:
```yaml
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    networks:
      - app-net
    # ...
  
  dab:
    image: mcr.microsoft.com/azure-databases/data-api-builder
    environment:
      - DATABASE_CONNECTION_STRING=Server=sqlserver;Database=MyDb;User Id=sa;Password=YourPass;TrustServerCertificate=true
    networks:
      - app-net
    depends_on:
      sqlserver:
        condition: service_healthy  # Critical!

networks:
  app-net:
```

---

### Issue: "device or resource busy" when updating config

**Cause**: DAB container has the config file locked via volume mount.

**Solution**: Mount config as read-only:
```yaml
volumes:
  - ./dab-config.json:/App/dab-config.json:ro  # Read-only!
```

To update config: edit locally, then restart:
```bash
docker-compose restart dab
```

---

### Issue: "DAB starts before database exists"

**Cause**: Simple `depends_on` only waits for container start, not service readiness.

**Solution**: Use healthcheck with condition:
```yaml
sqlserver:
  healthcheck:
    test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourPass" -C -Q "SELECT 1" || exit 1
    interval: 10s
    timeout: 5s
    retries: 10
    start_period: 30s

dab:
  depends_on:
    sqlserver:
      condition: service_healthy  # NOT just "depends_on: sqlserver"
```

**Also**: Run database setup scripts AFTER SQL is healthy, BEFORE starting DAB.
