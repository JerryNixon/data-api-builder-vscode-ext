# dab start Command Reference

## Purpose

The `dab start` command starts the Data API Builder engine, exposing your database through REST, GraphQL, and/or MCP endpoints based on your configuration.

## Syntax

```bash
dab start [options]
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--config`, `-c` | string | dab-config.json | Configuration file path |
| `--verbose` | boolean | false | Enable verbose logging |
| `--no-https-redirect` | boolean | false | Disable HTTPS redirect |
| `--LogLevel` | string | | Logging level |

## Prerequisites

Before running `dab start`:

1. **DAB CLI installed**
   ```bash
   dotnet tool install --global Microsoft.DataApiBuilder
   ```

2. **Configuration file exists**
   ```bash
   dab init --database-type mssql --connection-string "@env('DATABASE_CONNECTION_STRING')"
   ```

3. **Environment variables set** (if using `@env()` syntax)
   ```powershell
   $env:DATABASE_CONNECTION_STRING = "Server=localhost;Database=MyDb;..."
   ```

4. **Configuration validated**
   ```bash
   dab validate
   ```

---

## Basic Usage

### Start with Default Config
```bash
dab start
```

### Start with Specific Config
```bash
dab start --config dab-config.production.json
```

### Start with Verbose Logging
```bash
dab start --verbose
```

### Start with Custom Log Level
```bash
dab start --LogLevel Debug
```

---

## Default Endpoints

When DAB starts successfully, it exposes these endpoints:

| Endpoint | URL | Purpose |
|----------|-----|---------|
| REST | http://localhost:5000/api | REST API |
| GraphQL | http://localhost:5000/graphql | GraphQL API |
| GraphQL Playground | http://localhost:5000/graphql | Interactive GraphQL IDE (dev mode) |
| MCP | http://localhost:5000/mcp | MCP Server (if enabled) |
| Health | http://localhost:5000/health | Health check (if enabled) |

**Note:** Default port is 5000. HTTPS also available on 5001.

---

## Startup Output

### Successful Start
```
Starting Data API Builder engine...

info: Azure.DataApiBuilder.Service.Startup[0]
      Starting Data API Builder, Version: 1.2.0

info: Azure.DataApiBuilder.Service.Startup[0]
      Loading configuration from: dab-config.json

info: Azure.DataApiBuilder.Service.Startup[0]
      Connecting to database: mssql

info: Azure.DataApiBuilder.Service.Startup[0]
      Database connection successful

info: Azure.DataApiBuilder.Service.Startup[0]
      Loading entity: Product

info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
      Now listening on: https://localhost:5001

info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.

info: Azure.DataApiBuilder.Service.Startup[0]
      Data API Builder started successfully
      REST:    http://localhost:5000/api
      GraphQL: http://localhost:5000/graphql
```

### Failed Start (Configuration Error)
```
Starting Data API Builder engine...

fail: Azure.DataApiBuilder.Service.Startup[0]
      Configuration validation failed

Error: Entity 'Product' references table 'dbo.Products' which does not exist

Hint: Check the table name in your database
```

### Failed Start (Connection Error)
```
Starting Data API Builder engine...

fail: Azure.DataApiBuilder.Service.Startup[0]
      Failed to connect to database

Error: A network-related or instance-specific error occurred while establishing a connection to SQL Server.

Hint: Verify SQL Server is running and connection string is correct
```

---

## Testing the Running Server

### Test REST Endpoint
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/Product"

# curl
curl http://localhost:5000/api/Product
```

### Test GraphQL Endpoint
```bash
# PowerShell
$query = '{"query": "{ products { items { id name } } }"}'
Invoke-RestMethod -Uri "http://localhost:5000/graphql" -Method POST -Body $query -ContentType "application/json"

# curl
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ products { items { id name } } }"}'
```

### Test Health Endpoint
```bash
curl http://localhost:5000/health
```

---

## Running in Different Environments

### Development Mode
```bash
# Enables detailed error messages, GraphQL introspection
dab configure --runtime.host.mode development
dab start --verbose
```

### Production Mode
```bash
# Minimizes error details, can disable introspection
dab configure --runtime.host.mode production
dab configure --runtime.graphql.allow-introspection false
dab start
```

---

## Running as Background Process

### PowerShell (Background Job)
```powershell
Start-Job -ScriptBlock { dab start }
```

### PowerShell (New Window)
```powershell
Start-Process -FilePath "dab" -ArgumentList "start" -WindowStyle Normal
```

### Bash (Background)
```bash
dab start &
```

### Using nohup
```bash
nohup dab start > dab.log 2>&1 &
```

---

## Stopping the Server

### Interactive Mode
Press `Ctrl+C` in the terminal where DAB is running.

### Kill by Port (PowerShell)
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process
```

### Kill by Port (Bash)
```bash
kill $(lsof -t -i:5000)
```

---

## Port Configuration

DAB uses these default ports:
- HTTP: 5000
- HTTPS: 5001

To change ports, use environment variables or ASP.NET Core configuration:

```powershell
$env:ASPNETCORE_URLS = "http://localhost:8080;https://localhost:8443"
dab start
```

Or in `appsettings.json`:
```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": { "Url": "http://localhost:8080" },
      "Https": { "Url": "https://localhost:8443" }
    }
  }
}
```

---

## Docker Deployment

For Docker and Docker Compose deployment, see [deploy-localhost-docker.md](deploy-localhost-docker.md).

**Quick Start:**
```bash
docker run -p 5000:5000 \
  -v $(pwd)/dab-config.json:/App/dab-config.json \
  -e DATABASE_CONNECTION_STRING="Server=host.docker.internal;Database=MyDb;..." \
  mcr.microsoft.com/azure-databases/data-api-builder
```

---

## Logging Levels

| Level | Description |
|-------|-------------|
| Trace | Most detailed logging |
| Debug | Debugging information |
| Information | General operational info (default) |
| Warning | Warnings and potential issues |
| Error | Errors only |
| Critical | Critical failures only |
| None | No logging |

```bash
dab start --LogLevel Debug
```

---

## Hot Reload

DAB does **not** support hot reload of configuration. To apply changes:

1. Stop the running server (`Ctrl+C`)
2. Make configuration changes
3. Validate: `dab validate`
4. Restart: `dab start`

---

## Common Startup Issues

### Issue: Port Already in Use
```
Error: Unable to bind to http://localhost:5000 because it is already in use
```

**Solutions:**
1. Stop the existing process using the port
2. Use a different port via `ASPNETCORE_URLS`

### Issue: Configuration File Not Found
```
Error: Configuration file 'dab-config.json' not found
```

**Solutions:**
1. Run `dab init` to create a configuration
2. Specify the correct path: `dab start --config ./path/to/config.json`

### Issue: Environment Variable Not Set
```
Error: Environment variable 'DATABASE_CONNECTION_STRING' is not set
```

**Solution:**
```powershell
$env:DATABASE_CONNECTION_STRING = "Server=localhost;Database=MyDb;..."
dab start
```

### Issue: Database Connection Failed
```
Error: Cannot connect to database
```

**Solutions:**
1. Verify SQL Server is running
2. Check connection string format
3. Verify network connectivity
4. Check firewall settings

---

## VS Code Integration

When using the DAB VS Code extensions, you can start DAB directly from the command palette:

1. `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "DAB: Start"
3. Press Enter

The extension handles setting environment variables and running the command in a terminal.

---

## Monitoring a Running Instance

### Check Server Status
```bash
curl http://localhost:5000/health
```

### View Logs
Watch the terminal output or configure Application Insights:
```bash
dab configure \
  --runtime.telemetry.application-insights.enabled true \
  --runtime.telemetry.application-insights.connection-string "@env('APPINSIGHTS_CONNECTION_STRING')"
```

---

## Next Steps

- Test your API endpoints
- See [overview.md](overview.md) for API usage examples
- See [mcp.md](mcp.md) for AI agent integration
- See [troubleshooting.md](troubleshooting.md) for common issues
