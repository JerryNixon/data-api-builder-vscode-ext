---
name: aspire-data-api-builder
description: Guide for .NET Aspire orchestration of SQL Server + Data API Builder + SQL Commander + MCP Inspector. Use when asked to create an Aspire-based DAB environment.
---

# .NET Aspire + Data API Builder (Single-File Orchestration)

This skill provides a minimal workflow for running **SQL Server**, **Data API Builder (DAB)**, **SQL Commander**, and **MCP Inspector** using **.NET Aspire's single-file AppHost** pattern for local development.

---

## Core Mental Model

- **One `apphost.cs` file** orchestrates everything — no project files, no Docker Compose
- **`aspire run`** starts all services with health checks, dependencies, and telemetry
- **Aspire injects OTEL env vars** (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`) automatically — do NOT add `"headers": "@env('OTEL_EXPORTER_OTLP_HEADERS')"` to `dab-config.json` telemetry config unless the env var is set, or DAB will crash loop
- **Containers talk by service name**, not localhost
- **DAB reads config from bind-mounted file** — mount `dab-config.json` read-only
- **SQL Server must be healthy before DAB starts** — use `.WaitFor()` for the database, `.WaitForCompletion()` for SQL projects
- **Aspire Dashboard** provides visual monitoring, logs, and metrics at `http://localhost:15888`

---

## Prerequisites

- **.NET 10+ SDK** — verify with `dotnet --version`
- **Aspire CLI 13+** — install: `dotnet tool install -g aspire` — verify: `aspire --version`
- **Docker Desktop running** — SQL Server runs in container
- **`dab-config.json`** in workspace root using `@env('MSSQL_CONNECTION_STRING')`

> **MVP rule:** Only add database schema/seed scripts if user explicitly asks.

---

## Quick Workflow (Checklist)

1. Create `.env` with connection string (gitignored).
2. Create `apphost.cs` using the template below.
3. Run with `aspire run`.
4. Access services via Aspire Dashboard.

---

## Templates

### `.env` (example)

```env
# Never commit this file
SA_PASSWORD=YourStrong@Passw0rd
MSSQL_CONNECTION_STRING=Server=sql-server;Database=MyDb;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true
```

> **Critical:** Add `.env`, `**\bin`, and `**\obj` to `.gitignore` before creating secrets.

---

### `apphost.cs` (minimal template)

```csharp
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

#:sdk Aspire.AppHost.Sdk@13.0.0
#:package Aspire.Hosting.SqlServer@13.0.0
#:package CommunityToolkit.Aspire.Hosting.SqlDatabaseProjects@9.8.1-beta.420
#:package CommunityToolkit.Aspire.Hosting.Azure.DataApiBuilder@9.8.1-beta.420
#:package CommunityToolkit.Aspire.Hosting.McpInspector@9.8.0

var builder = DistributedApplication.CreateBuilder(args);

var options = new
{
    SqlDatabase = "MyDb",
    DabConfig = "dab-config.json",
    DabImage = "1.7.83-rc",
    SqlCmdrImage = "latest"
};

var sqlServer = builder
    .AddSqlServer("sql-server")
    .WithDataVolume("sql-data")
    .WithEnvironment("ACCEPT_EULA", "Y")
    .WithLifetime(ContainerLifetime.Persistent);

var sqlDatabase = sqlServer
    .AddDatabase(options.SqlDatabase);

var dabServer = builder
    .AddContainer("data-api", image: "azure-databases/data-api-builder", tag: options.DabImage)
    .WithImageRegistry("mcr.microsoft.com")
    .WithBindMount(source: new FileInfo(options.DabConfig).FullName, target: "/App/dab-config.json", isReadOnly: true)
    .WithHttpEndpoint(targetPort: 5000, name: "http")
    .WithEnvironment("MSSQL_CONNECTION_STRING", sqlDatabase)
    .WithUrls(context =>
    {
        context.Urls.Clear();
        context.Urls.Add(new() { Url = "/graphql", DisplayText = "GraphQL", Endpoint = context.GetEndpoint("http") });
        context.Urls.Add(new() { Url = "/swagger", DisplayText = "Swagger", Endpoint = context.GetEndpoint("http") });
        context.Urls.Add(new() { Url = "/health", DisplayText = "Health", Endpoint = context.GetEndpoint("http") });
    })
    .WithOtlpExporter()
    .WithParentRelationship(sqlDatabase)
    .WithHttpHealthCheck("/health")
    .WaitFor(sqlDatabase);

var sqlCommander = builder
    .AddContainer("sql-cmdr", "jerrynixon/sql-commander", options.SqlCmdrImage)
    .WithImageRegistry("docker.io")
    .WithHttpEndpoint(targetPort: 8080, name: "http")
    .WithEnvironment("ConnectionStrings__db", sqlDatabase)
    .WithUrls(context =>
    {
        context.Urls.Clear();
        context.Urls.Add(new() { Url = "/", DisplayText = "Commander", Endpoint = context.GetEndpoint("http") });
    })
    .WithParentRelationship(sqlDatabase)
    .WithHttpHealthCheck("/health")
    .WaitFor(sqlDatabase);

var mcpInspector = builder
    .AddMcpInspector("mcp-inspector")
    .WithMcpServer(dabServer)
    .WithParentRelationship(dabServer)
    .WithEnvironment("NODE_TLS_REJECT_UNAUTHORIZED", "0")
    .WaitFor(dabServer)
    .WithUrls(context =>
    {
        context.Urls.First().DisplayText = "Inspector";
    });

await builder.Build().RunAsync();
```

---

### `dab-config.json` (minimal)

```json
{
  "$schema": "https://dataapibuilder.azureedge.net/schemas/latest/dab.draft.schema.json",
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('MSSQL_CONNECTION_STRING')"
  },
  "runtime": {
    "rest": {
      "enabled": true,
      "path": "/api"
    },
    "graphql": {
      "enabled": true,
      "path": "/graphql"
    },
    "host": {
      "mode": "development",
      "cors": {
        "origins": ["*"],
        "allow-credentials": false
      }
    },
    "mcp": {
      "enabled": true
    }
  },
  "entities": {}
}
```

---

## Running the Stack

### Start Services

```powershell
aspire run
```

This command:
- Builds and restores packages
- Starts SQL Server container
- Waits for SQL health check
- Starts DAB container with bind-mounted config
- Starts SQL Commander
- Starts MCP Inspector
- Opens Aspire Dashboard

**Aspire Dashboard:** `http://localhost:15888`

---

### Access Services

| Service | URL | Purpose |
|---------|-----|---------|
| Aspire Dashboard | `http://localhost:15888` | Monitor all services, logs, metrics |
| DAB GraphQL | Click "GraphQL" link in dashboard | Query data via GraphQL |
| DAB Swagger | Click "Swagger" link in dashboard | REST API documentation |
| DAB Health | Click "Health" link in dashboard | Service health status |
| SQL Commander | Click "Commander" link in dashboard | SQL query tool |
| MCP Inspector | Click "Inspector" link in dashboard | Test MCP endpoints |

> **Note:** Aspire assigns dynamic ports. Use dashboard links instead of hardcoded URLs.

---

### Stop Services

Press `Ctrl+C` in terminal where `aspire run` is active, or:

```powershell
docker stop $(docker ps -q)
```

---

## Adding Database Schema (Optional)

To deploy a SQL schema on startup using a SQL Database Project, add this before `var dabServer`:

```csharp
var sqlDatabaseProject = builder
    .AddSqlProject<Projects.database>("sql-project")
    .WithReference(sqlDatabase);
```

Then change `dabServer` and `sqlCommander` to wait for the SQL project to **complete deployment** (not just start):

```csharp
// Use WaitForCompletion — SQL projects are run-to-completion resources
.WaitForCompletion(sqlDatabaseProject);
```

> **Critical:** Use `.WaitForCompletion()` for SQL projects, not `.WaitFor()`. The SQL project container exits after deploying the dacpac — `.WaitFor()` only waits for it to enter Running state, which may be before deployment finishes. This causes DAB to fail with "Invalid object name" errors.

---

## Troubleshooting

### `aspire: command not found`

**Fix:**
```powershell
dotnet tool install -g aspire
```

### SQL Server container fails to start

**Check Docker:**
```powershell
docker ps -a
docker logs <container-id>
```

### DAB can't connect to SQL Server

**Verify connection string** in `.env` uses service name `sql-server`, not `localhost`:
```env
MSSQL_CONNECTION_STRING=Server=sql-server;Database=MyDb;...
```

### DAB fails with "Invalid object name 'dbo.TableName'"

**Cause:** Race condition — DAB started before the SQL project finished deploying the schema. Using `.WaitFor(sqlDatabaseProject)` only waits for Running state, not completion.

**Fix:** Change `.WaitFor(sqlDatabaseProject)` to `.WaitForCompletion(sqlDatabaseProject)`. SQL projects are run-to-completion resources that exit after dacpac deployment.

```csharp
// WRONG — may start before dacpac finishes
.WaitFor(sqlDatabaseProject)

// CORRECT — waits for deployment to complete
.WaitForCompletion(sqlDatabaseProject)
```

### DAB crash loop with `@env()` telemetry headers

Aspire automatically injects `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME` into containers, but **not** `OTEL_EXPORTER_OTLP_HEADERS`. If your `dab-config.json` includes:

```json
"headers": "@env('OTEL_EXPORTER_OTLP_HEADERS')"
```

DAB will enter a **fatal deserialization crash loop** because all `@env()` references must resolve to a value. The `headers` field is only needed when the OTLP endpoint requires authentication (e.g., cloud APM services) — local Aspire doesn't.

**Fix:** Remove the `headers` field from `dab-config.json` telemetry config when running with Aspire locally. Only add it when targeting an authenticated OTLP collector, and ensure the referenced environment variable is set.

### Port conflicts

Aspire auto-assigns ports. If dashboard doesn't open, check terminal output for actual URL.

---

## Aspire vs Docker Compose

| Feature | Aspire | Docker Compose |
|---------|--------|----------------|
| **Definition** | Single C# file | YAML file |
| **Language** | C# | YAML |
| **Dependencies** | `.WaitFor()` + health checks | `depends_on` + healthcheck |
| **Monitoring** | Built-in dashboard with logs, metrics, traces | External tools required |
| **Service Discovery** | Automatic | Manual with service names |
| **Hot Reload** | Yes with `--watch` | No |
| **Debugging** | Native .NET debugging | Container debugging only |

**Use Aspire when:**
- You're already in a .NET project
- You want integrated telemetry and monitoring
- You need complex startup orchestration

**Use Docker Compose when:**
- You need multi-language support
- You want standard container orchestration
- Aspire isn't installed

---

## Configuration Details

### Service Names (DNS)

Containers reference each other by service name:
- SQL Server: `sql-server`
- DAB: `data-api`
- SQL Commander: `sql-cmdr`
- MCP Inspector: `mcp-inspector`

### Volumes

SQL Server data persists in Docker volume `sql-data`:
```powershell
docker volume ls | Select-String sql-data
```

To reset database:
```powershell
aspire run  # Stop with Ctrl+C
docker volume rm <volume-name>
aspire run  # Restart
```

### Health Checks

- SQL Server: Default SQL health check
- DAB: `GET /health` (must return 200)
- SQL Commander: `GET /health`

Services won't start until dependencies are healthy.

---

## Reference

- [Aspire Sample (Official)](https://github.com/Azure/data-api-builder/tree/main/samples/aspire)
- [Aspire CLI Reference](https://aspire.dev/reference/cli/commands/aspire/)
- [Aspire Dashboard Docs](https://aspire.dev/dashboard/overview/)
- [DAB Configuration](https://learn.microsoft.com/azure/data-api-builder/configuration-file)

> For Azure deployment, see the `azure-data-api-builder` skill.
