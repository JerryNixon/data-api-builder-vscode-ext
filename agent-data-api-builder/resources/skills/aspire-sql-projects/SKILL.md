````skill
---
name: aspire-sql-projects
description: Add a SQL Database Project (.sqlproj) to a .NET Aspire AppHost for dacpac-based schema deployment. Use when asked to create a database project, deploy a dacpac, or replace WithCreationScript in Aspire.
---

# SQL Database Projects in .NET Aspire

Replace inline SQL scripts with a declarative SQL Database Project that builds a `.dacpac` and deploys automatically via the Aspire Community Toolkit. Schema diffs are handled by SqlPackage — no manual `DROP`/`ALTER` needed.

## Documentation references

- https://github.com/CommunityToolkit/Aspire/blob/main/src/CommunityToolkit.Aspire.Hosting.SqlDatabaseProjects/README.md
- https://learn.microsoft.com/sql/tools/sql-database-projects/sql-database-projects
- https://learn.microsoft.com/sql/tools/sqlpackage/sqlpackage

---

## Package

```xml
<PackageReference Include="CommunityToolkit.Aspire.Hosting.SqlDatabaseProjects" Version="13.1.1" />
```

Also add a project reference from the AppHost to the SQL project so the `Projects.database` type is generated:

```xml
<ProjectReference Include="..\database\database.sqlproj" />
```

Suppress the `ASPIRE004` warning — the SQL project reference triggers it because the project isn't a standard .NET project:

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);ASPIRE004</NoWarn>
</PropertyGroup>
```

---

## SQL Database Project Structure

```
/database
  ├── database.sqlproj              # Microsoft.Build.Sql SDK project
  ├── database.publish.xml          # Publish profile (optional but recommended)
  ├── Tables/
  │   └── Todos.sql                 # One file per table — declarative DDL
  └── Scripts/
      └── PostDeployment.sql        # Seed data (always include)
```

### database.sqlproj

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" Sdk="Microsoft.Build.Sql/2.0.0">
  <PropertyGroup>
    <Name>database</Name>
    <DSP>Microsoft.Data.Tools.Schema.Sql.SqlAzureV12DatabaseSchemaProvider</DSP>
    <ModelCollation>1033, CI</ModelCollation>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PostDeploy Include="Scripts\PostDeployment.sql" />
  </ItemGroup>
</Project>
```

**Key points:**
- SDK is `Microsoft.Build.Sql/2.0.0` — not a standard .NET SDK
- `DSP` targets Azure SQL (SqlAzureV12) for compatibility with both local SQL Server and Azure SQL
- `IsPackable=false` prevents NuGet packaging; the output is a `.dacpac`
- `.sql` files in `Tables/` are auto-included by convention; only `PostDeploy` needs an explicit item

### database.publish.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="Current">
  <PropertyGroup>
    <IncludeCompositeObjects>True</IncludeCompositeObjects>
    <TargetDatabaseName>TodoDb</TargetDatabaseName>
    <ProfileVersionNumber>1</ProfileVersionNumber>
    <BlockOnPossibleDataLoss>False</BlockOnPossibleDataLoss>
  </PropertyGroup>
</Project>
```

- `BlockOnPossibleDataLoss=False` allows column type changes during development without manual confirmation
- `TargetDatabaseName` should match the database name used in `AddDatabase()`

---

## Table DDL Files

Write **declarative** DDL — no `IF EXISTS` guards, no `DROP TABLE`, no idempotency logic. SqlPackage handles diffs automatically.

```sql
CREATE TABLE [dbo].[Todos] (
    [TodoId]    INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Title]     NVARCHAR(200) NOT NULL,
    [DueDate]   DATE NOT NULL,
    [Owner]     NVARCHAR(128) NOT NULL DEFAULT 'anonymous',
    [Completed] BIT NOT NULL DEFAULT 0
);
```

Each table gets its own `.sql` file in `Tables/`. Views, stored procedures, and functions go in their own subfolders.

---

## Seed Data (PostDeployment.sql)

PostDeployment scripts run **every deploy**. Guard inserts to avoid duplicates:

```sql
IF NOT EXISTS (SELECT 1 FROM [dbo].[Todos])
BEGIN
    INSERT INTO [dbo].[Todos] ([Title], [DueDate], [Owner], [Completed])
    VALUES
        (N'Learn Data API Builder', DATEADD(DAY, 7, GETDATE()), 'anonymous', 0),
        (N'Deploy to Azure', DATEADD(DAY, 14, GETDATE()), 'anonymous', 0),
        (N'Build something awesome', DATEADD(DAY, 30, GETDATE()), 'anonymous', 0);
END;
```

---

## Canonical Program.cs Pattern

```csharp
var sqlDatabase = sqlServer.AddDatabase(options.SqlDatabase);

var sqlDatabaseProject = builder
    .AddSqlProject<Projects.database>("qs1-sql-project")
    .WithReference(sqlDatabase);
```

This replaces the old `WithCreationScript` pattern:

```csharp
// OLD — do not use
var sqlDatabase = sqlServer
    .AddDatabase("TodoDb")
    .WithCreationScript(File.ReadAllText("database.sql"));

// NEW — use SQL Database Project instead
var sqlDatabase = sqlServer.AddDatabase("TodoDb");
var sqlDatabaseProject = builder
    .AddSqlProject<Projects.database>("qs1-sql-project")
    .WithReference(sqlDatabase);
```

---

## API Variants

### Project Reference (recommended)

Uses the project reference to discover and build the dacpac automatically:

```csharp
builder.AddSqlProject<Projects.database>("sql-project")
    .WithReference(sqlDatabase);
```

Requires a `<ProjectReference>` in the AppHost `.csproj` pointing to the `.sqlproj`.

### Pre-built Dacpac

Uses a dacpac file directly — no project reference needed:

```csharp
builder.AddSqlProject("sql-project")
    .WithDacpac("path/to/database.dacpac")
    .WithReference(sqlDatabase);
```

Useful when the dacpac is built externally (CI pipeline, artifact download).

### Deploy Options

Customize SqlPackage behavior:

```csharp
builder.AddSqlProject<Projects.database>("sql-project")
    .WithReference(sqlDatabase)
    .WithConfigureDacDeployOptions(options =>
    {
        options.BlockOnPossibleDataLoss = false;
        options.IncludeCompositeObjects = true;
    });
```

### Skip When Already Deployed

Optimization for faster startup — skips deployment if the database already matches:

```csharp
builder.AddSqlProject<Projects.database>("sql-project")
    .WithReference(sqlDatabase)
    .WithSkipWhenDeployed();
```

---

## WaitFor vs WaitForCompletion

SQL Database Projects are **run-to-completion** resources — they deploy the dacpac and exit. Long-lived services like DAB and SQL Commander need the schema to be **fully deployed** before starting.

| Method | Waits For | Use Case |
|--------|-----------|----------|
| `.WaitFor(resource)` | Resource enters **Running** state (with health check if configured) | Long-lived services (DAB, web apps) |
| `.WaitForCompletion(resource)` | Resource **runs to completion** (exits successfully) | Run-to-completion tasks (SQL projects, migrations) |

### Critical Pattern for SQL Projects

```csharp
// CORRECT — waits for dacpac deployment to COMPLETE (resource exits)
var apiServer = builder.AddContainer(...)
    .WaitForCompletion(sqlDatabaseProject);  // ✅ Schema fully deployed

var sqlCommander = builder.AddContainer(...)
    .WaitForCompletion(sqlDatabaseProject);  // ✅ Schema fully deployed

// WRONG — WaitFor only waits for Running state, not completion
var apiServer = builder.AddContainer(...)
    .WaitFor(sqlDatabaseProject);  // ❌ May start before dacpac finishes

// ALSO WRONG — waiting on database, not the project
var apiServer = builder.AddContainer(...)
    .WaitFor(sqlDatabase);  // ❌ DAB will fail: table not found
```

### Web App Dependencies

Web apps (static frontends) only need DAB to be **running and healthy**, not exited:

```csharp
// CORRECT — web app waits for DAB to be running
var webApp = builder.AddContainer("web-app", "nginx", "alpine")
    .WaitFor(apiServer);  // ✅ DAB is running and healthy

// WRONG — WaitForCompletion on a long-lived service blocks forever
var webApp = builder.AddContainer(...)
    .WaitForCompletion(apiServer);  // ❌ DAB never exits, hangs indefinitely
```

**Key insight:** SQL projects **exit after deployment** (run-to-completion), while DAB/SQL Commander/web apps **stay running** (long-lived services). Match the wait method to the resource type.

---

## Build Output

Building the SQL project produces a dacpac:

```powershell
dotnet build database/database.sqlproj
# Output: database/bin/Debug/database.dacpac
```

The Aspire toolkit builds the project automatically at startup — you don't need to pre-build unless debugging.

---

## Manual Deployment (Without Aspire)

For CI/CD or Azure deployment, use SqlPackage directly:

```powershell
sqlpackage /Action:Publish `
    /SourceFile:database/bin/Debug/database.dacpac `
    /TargetConnectionString:"$env:DATABASE_CONNECTION_STRING" `
    /p:BlockOnPossibleDataLoss=false
```

---

## Schema Change Workflow

1. **Edit** — Modify or add `.sql` files in `database/Tables/`
2. **Build** — `dotnet build database/database.sqlproj` (verify no errors)
3. **Run** — `aspire run` (Aspire rebuilds and redeploys the dacpac automatically)
4. **Restart DAB** — DAB does not hot-reload schema changes; restart its container:
   ```powershell
   docker restart qs1-data-api
   ```

SqlPackage handles all diffs — adding columns, changing types, dropping constraints — without manual migration scripts.

---

## Full Example (AppHost csproj)

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <Sdk Name="Aspire.AppHost.Sdk" Version="13.1.1" />

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsAspireHost>true</IsAspireHost>
    <NoWarn>$(NoWarn);ASPIRE004</NoWarn>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Aspire.Hosting.SqlServer" Version="13.1.1" />
    <PackageReference Include="CommunityToolkit.Aspire.Hosting.SqlDatabaseProjects" Version="13.1.1" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\database\database.sqlproj" />
  </ItemGroup>

</Project>
```

---

## Full Example (Program.cs)

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var sqlPassword = builder.AddParameter("sql-password", secret: true);

var sqlServer = builder
    .AddSqlServer("sql-server", sqlPassword)
    .WithDataVolume("sql-data")
    .WithEnvironment("ACCEPT_EULA", "Y");

var sqlDatabase = sqlServer.AddDatabase("TodoDb");

var sqlDatabaseProject = builder
    .AddSqlProject<Projects.database>("sql-project")
    .WithReference(sqlDatabase);

var apiServer = builder
    .AddContainer("data-api", image: "azure-databases/data-api-builder", tag: "1.7.83-rc")
    .WithImageRegistry("mcr.microsoft.com")
    .WithHttpEndpoint(targetPort: 5000, port: 5000, name: "http")
    .WithEnvironment("MSSQL_CONNECTION_STRING", sqlDatabase)
    .WaitForCompletion(sqlDatabaseProject);   // wait for dacpac to finish deploying

var sqlCommander = builder
    .AddContainer("sql-cmdr", "jerrynixon/sql-commander", "latest")
    .WithImageRegistry("docker.io")
    .WithHttpEndpoint(targetPort: 8080, name: "http")
    .WithEnvironment("ConnectionStrings__db", sqlDatabase)
    .WaitForCompletion(sqlDatabaseProject);   // wait for dacpac to finish deploying

await builder.Build().RunAsync();
```

---

## Docker Compose Equivalent

In Docker Compose, the dacpac is deployed manually via `docker.ps1` after containers start:

```powershell
# docker.ps1
docker compose up -d
dotnet build database/database.sqlproj
# wait for SQL Server healthy...
sqlpackage /Action:Publish `
    /SourceFile:database/bin/Debug/database.dacpac `
    /TargetConnectionString:"Server=localhost,14330;Database=TodoDb;User Id=sa;Password=$env:SQL_PASSWORD;TrustServerCertificate=true" `
    /p:BlockOnPossibleDataLoss=false
```

Aspire handles all of this automatically via `AddSqlProject`.

---

## Common Issues and Fixes

### ASPIRE004 Warning: "referenced project is not an executable"

**Cause:** The `.sqlproj` uses `Microsoft.Build.Sql` SDK, not `Microsoft.NET.Sdk` — Aspire flags it as non-standard.  
**Fix:** Add `<NoWarn>$(NoWarn);ASPIRE004</NoWarn>` to the AppHost `.csproj`.

### "Cannot find type 'Projects.database'"

**Cause:** Missing `<ProjectReference>` from AppHost to the `.sqlproj`.  
**Fix:** Add `<ProjectReference Include="..\database\database.sqlproj" />` to the AppHost `.csproj`. The `Projects.database` type is auto-generated during build from the project reference.

### DAB fails with "Invalid object name 'dbo.Todos'"

**Cause:** DAB started before the schema was fully deployed. Either waiting on `sqlDatabase` instead of `sqlDatabaseProject`, or using `.WaitFor()` instead of `.WaitForCompletion()`.

**Fix:** Change to `.WaitForCompletion(sqlDatabaseProject)` on the DAB container. The `.WaitForCompletion()` method waits for the SQL project to **exit after deployment**, not just enter Running state.

### "The database 'TodoDb' does not exist"

**Cause:** `AddSqlProject` deploys the schema but does not create the database itself. The database must already exist.  
**Fix:** Ensure `sqlServer.AddDatabase("TodoDb")` is called before `AddSqlProject`. The `AddDatabase` call creates the database; `AddSqlProject` deploys the schema into it.

### Build error: "Could not load SDK 'Microsoft.Build.Sql'"

**Cause:** The Microsoft.Build.Sql SDK is not installed.  
**Fix:** The SDK is restored automatically via NuGet on first build. Ensure the machine has internet access and NuGet sources configured. Run `dotnet build database/database.sqlproj` manually to trigger restore.

### PostDeployment script inserts duplicates

**Cause:** PostDeployment scripts run on every deploy. Unguarded `INSERT` statements will duplicate data.  
**Fix:** Always wrap inserts in `IF NOT EXISTS` checks:
```sql
IF NOT EXISTS (SELECT 1 FROM [dbo].[Todos])
BEGIN
    INSERT INTO [dbo].[Todos] ...
END;
```

---

## Prerequisites

- .NET SDK 10.0+ (`dotnet --version`)
- Docker running (for SQL Server container)
- No additional global tools needed — SqlPackage is bundled with `CommunityToolkit.Aspire.Hosting.SqlDatabaseProjects`
````
