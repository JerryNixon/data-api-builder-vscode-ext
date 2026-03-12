---
name: aspire-sql-commander
description: Add SQL Commander to a .NET Aspire AppHost for browsing and querying SQL Server. Use when asked to add a SQL query tool, browse database tables, or configure SQL Commander in Aspire.
---

# SQL Commander in .NET Aspire

Add SQL Commander as an Aspire-managed container so it auto-starts alongside your SQL Server, appears in the dashboard, and is accessible in the browser without manual setup. SQL Commander is a lightweight web-based SQL query tool for SQL Server.

For Azure deployment, see the `azure-sql-commander` skill.

## Documentation references

- https://hub.docker.com/r/jerrynixon/sql-commander
- https://learn.microsoft.com/dotnet/aspire/fundamentals/app-host-overview

---

## Container Image

```
docker.io/jerrynixon/sql-commander:latest
```

SQL Commander is a standard Docker container — no NuGet package required. Add it with `builder.AddContainer(...)`.

---

## Canonical Program.cs Pattern

```csharp
var sqlCommander = builder
    .AddContainer("sql-cmdr", "jerrynixon/sql-commander", "latest")
    .WithImageRegistry("docker.io")
    .WithHttpEndpoint(targetPort: 8080, name: "http")
    .WithEnvironment("ConnectionStrings__db", sqlDatabase)   // pass the Aspire database resource
    .WithUrls(context =>
    {
        context.Urls.Clear();
        context.Urls.Add(new() { Url = "/", DisplayText = "Commander", Endpoint = context.GetEndpoint("http") });
    })
    .WithParentRelationship(sqlDatabase)        // groups under the database in the dashboard
    .WithHttpHealthCheck("/health")             // Aspire monitors health automatically
    .WaitFor(sqlDatabase);                      // ensures SQL is ready before Commander starts
```

---

## Connection String

SQL Commander expects a single environment variable:

```
ConnectionStrings__db=Server=<host>;Database=<name>;User Id=sa;Password=<password>;TrustServerCertificate=true
```

> **CRITICAL:** `TrustServerCertificate=true` is **required**. SQL Commander will not connect without it — locally or in Azure. Always include it in the connection string.

**In Aspire, pass the database resource directly:**

```csharp
.WithEnvironment("ConnectionStrings__db", sqlDatabase)
```

Aspire resolves this to the correct container-to-container connection string at runtime using the SQL Server service name (e.g., `Server=sql-server`). You do not need to hardcode connection strings.

**Important:** The environment variable name is `ConnectionStrings__db` (double underscore). This maps to `ConnectionStrings:db` in .NET configuration. Using a single underscore or a different key name will not work.

---

## Port

| Port | Purpose |
|------|---------|
| 8080 | Web UI (internal container port) |

Aspire assigns a dynamic host port. Access SQL Commander via the dashboard link — do not hardcode the host port.

---

## Health Check

SQL Commander exposes a `/health` endpoint. Use `.WithHttpHealthCheck("/health")` so the Aspire dashboard shows health status and dependent services can wait for it.

---

## Dashboard Integration

### WithUrls

Use `WithUrls` to customize the dashboard link:

```csharp
.WithUrls(context =>
{
    context.Urls.Clear();
    context.Urls.Add(new() { Url = "/", DisplayText = "Commander", Endpoint = context.GetEndpoint("http") });
})
```

This replaces the default URL list with a single "Commander" link that opens the web UI directly.

### WithParentRelationship

```csharp
.WithParentRelationship(sqlDatabase)
```

Groups SQL Commander under the database resource in the Aspire dashboard's resource graph. This makes the dependency visually clear.

---

## Startup Order

```csharp
.WaitFor(sqlDatabase)
```

SQL Commander needs a running SQL Server with the target database created. Always use `.WaitFor(sqlDatabase)` — not `.WaitFor(sqlServer)` — so that the database creation script has completed before Commander attempts to connect.

If Commander starts before the database exists, it will fail with:

```
Cannot open database "TodoDb" requested by the login. The login failed.
```

---

## Full Example with SQL Server + Database

```csharp
var sqlPassword = builder.AddParameter("sql-password", secret: true);

var sqlServer = builder
    .AddSqlServer("sql-server", sqlPassword)
    .WithDataVolume("sql-data")
    .WithEnvironment("ACCEPT_EULA", "Y");

var sqlDatabase = sqlServer
    .AddDatabase("TodoDb")
    .WithCreationScript(File.ReadAllText("database.sql"));

var sqlCommander = builder
    .AddContainer("sql-cmdr", "jerrynixon/sql-commander", "latest")
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
```

---

## Naming Convention

When multiple quickstarts or projects share the same Docker host, use a prefix to avoid container name collisions:

```csharp
var options = new
{
    SqlCmdr = "qs1-sql-cmdr",       // quickstart 1
    SqlCmdrImage = "latest",
};
```

For projects using a unique token (e.g., to avoid collisions during concurrent runs):

```csharp
var token = builder.Configuration["AppHost:ResourceToken"] ?? "dev";
var options = new
{
    SqlCmdr = $"myapp-sql-cmdr-{token}",
    SqlCmdrImage = "latest",
};
```

---

## Common Issues and Fixes

### "Cannot open database" (Error 4060)
**Cause:** SQL Server is running but the database hasn't been created yet. Commander connected to the server but the target database doesn't exist.  
**Fix:** Ensure `.WaitFor(sqlDatabase)` is present (not `.WaitFor(sqlServer)`). The database resource includes the creation script — waiting for the database resource ensures the schema is deployed.

### Commander starts but shows no tables
**Cause:** The database exists but has no tables — the creation script may not have run.  
**Fix:** Verify `WithCreationScript(...)` is on the database resource. Check Aspire dashboard logs for the SQL Server container to confirm the script executed.

### Connection refused
**Cause:** SQL Server container not yet accepting connections.  
**Fix:** `.WaitFor(sqlDatabase)` handles this. If still failing, check Docker Desktop — the SQL container may have failed to start entirely (check logs for memory or licensing issues).

### Wrong database shown
**Cause:** Connection string points to `master` or a different database.  
**Fix:** Verify the `sqlDatabase` variable passed to `WithEnvironment` is the correct database resource (the one created with `.AddDatabase("TodoDb")`).

### Environment variable name wrong
**Cause:** Using `ConnectionStrings:db` or `ConnectionStrings_db` instead of `ConnectionStrings__db`.  
**Fix:** Use double underscores: `ConnectionStrings__db`. In .NET, `__` maps to `:` in configuration hierarchy.

---

## Prerequisites

- Docker Desktop running (SQL Commander runs as a container)
- SQL Server container configured in the same Aspire AppHost
- Database resource with schema (`.WithCreationScript(...)` or `.WithSqlProject(...)`)
