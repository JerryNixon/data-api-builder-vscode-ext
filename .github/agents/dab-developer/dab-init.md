# dab init Command Reference

## Purpose

The `dab init` command creates a new Data API Builder configuration file (`dab-config.json`). This is always the first step when setting up DAB for a project.

## Syntax

```bash
dab init [options]
```

## Required Options

| Option | Description |
|--------|-------------|
| `--database-type` | Database type: `mssql`, `postgresql`, `mysql`, `cosmosdb_nosql`, `cosmosdb_postgresql` |
| `--connection-string` | Database connection string (direct or `@env('VAR_NAME')` syntax) |

## Connection String Options

### Direct Connection String (NOT RECOMMENDED)
```bash
dab init \
  --database-type mssql \
  --connection-string "Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true"
```

### Environment Variable Syntax (RECOMMENDED)
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')"
```

The `@env('VAR_NAME')` syntax tells DAB to read the connection string from an environment variable at runtime, keeping secrets out of the config file.

## All Options Reference

### Database Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--database-type`, `-dt` | string | Required | mssql, postgresql, mysql, cosmosdb_nosql, cosmosdb_postgresql |
| `--connection-string`, `-c` | string | Required | Connection string or @env('VAR') |
| `--set-session-context` | boolean | false | (MSSQL only) Set session context with claims |

### REST Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--rest.enabled` | boolean | true | Enable REST endpoint |
| `--rest.path` | string | /api | REST API base path |
| `--rest.request-body-strict` | boolean | true | Reject unknown fields in request body |

### GraphQL Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--graphql.enabled` | boolean | true | Enable GraphQL endpoint |
| `--graphql.path` | string | /graphql | GraphQL endpoint path |
| `--graphql.allow-introspection` | boolean | true | Allow GraphQL introspection |
| `--graphql.multiple-create.enabled` | boolean | false | Allow creating multiple items |
| `--graphql.multiple-mutation-operation` | string | | Multiple mutation execution mode |

### MCP Options (DAB 1.7+)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--mcp.enabled` | boolean | false | Enable MCP Server endpoint |
| `--mcp.path` | string | /mcp | MCP Server endpoint path |

### Host Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--host-mode` | string | development | Host mode: development or production |
| `--cors-origin` | string | | Allowed CORS origin(s) |

### Cache Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--cache.enabled` | boolean | false | Enable response caching |
| `--cache.ttl-seconds` | number | 5 | Cache time-to-live in seconds |

### Authentication Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--auth.provider` | string | StaticWebApps | Authentication provider |
| `--auth.audience` | string | | JWT audience (required for EasyAuth, AzureAd) |
| `--auth.issuer` | string | | JWT issuer (required for AzureAd) |

### File Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--config`, `-c` | string | dab-config.json | Configuration file name |
| `--graphql.schema` | string | | Path to GraphQL schema file (Cosmos DB NoSQL) |

## Common Examples

### Minimal MSSQL Configuration
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')"
```

Result:
```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/latest/download/dab.draft.schema.json",
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('DATABASE_CONNECTION_STRING')"
  },
  "runtime": {
    "rest": { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql" },
    "host": { "cors": { "origins": [] }, "authentication": { "provider": "StaticWebApps" }, "mode": "development" }
  },
  "entities": {}
}
```

### Full-Featured Development Configuration
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode development \
  --cors-origin "http://localhost:3000" \
  --rest.enabled true \
  --rest.path "/api" \
  --graphql.enabled true \
  --graphql.path "/graphql" \
  --graphql.allow-introspection true \
  --mcp.enabled true \
  --mcp.path "/mcp" \
  --cache.enabled true \
  --cache.ttl-seconds 5 \
  --set-session-context true
```

### Production Configuration with JWT Auth
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode production \
  --cors-origin "https://myapp.com" \
  --rest.enabled true \
  --graphql.enabled true \
  --graphql.allow-introspection false \
  --auth.provider AzureAd \
  --auth.audience "api://my-app-id" \
  --auth.issuer "https://login.microsoftonline.com/my-tenant-id/v2.0"
```

### REST Only (No GraphQL)
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --rest.enabled true \
  --graphql.enabled false
```

### MCP Only (For AI Agents)
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --rest.enabled false \
  --graphql.enabled false \
  --mcp.enabled true \
  --mcp.path "/mcp"
```

## Session Context (MSSQL Only)

When `--set-session-context` is enabled, DAB passes JWT claims to SQL Server via `sp_set_session_context`. This enables:

- Row-level security (RLS) policies
- Audit logging with user identity
- Multi-tenant data isolation

Claims are available in T-SQL:
```sql
SELECT SESSION_CONTEXT(N'user_id') AS CurrentUser
```

## Default Connection Strings for MSSQL

### Local SQL Server (Windows Auth)
```
Server=localhost;Database=MyDatabase;Integrated Security=true;TrustServerCertificate=true
```

### Local SQL Server (SQL Auth)
```
Server=localhost;Database=MyDatabase;User Id=sa;Password=yourPassword;TrustServerCertificate=true
```

### Azure SQL (Azure AD)
```
Server=yourserver.database.windows.net;Database=MyDatabase;Authentication=Active Directory Default
```

### Azure SQL (SQL Auth)
```
Server=yourserver.database.windows.net;Database=MyDatabase;User Id=admin;Password=yourPassword;Encrypt=true
```

## Important Behaviors

### File Overwrite
`dab init` will **overwrite** an existing `dab-config.json` without prompting. Always check for existing files before running.

### Environment Variable Setup
When using `@env('VAR_NAME')`:
1. Create a `.env` file (optional, for local dev)
2. Set environment variables in your shell or hosting environment
3. DAB reads the variable at runtime

Example `.env` file:
```env
DATABASE_CONNECTION_STRING=Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true
```

### Working Directory
`dab init` creates the config file in the current working directory. Navigate to your project folder first.

## Resulting File Structure

After `dab init`:
```
project/
├── dab-config.json      # Created by dab init
├── .env                 # (Optional) Environment variables
└── .gitignore           # (Should have) *.env, dab-config.json secrets
```

## Next Steps After Init

1. **Add entities** - Use `dab add` to expose database tables, views, and procedures
2. **Configure runtime** - Use `dab configure` to adjust settings
3. **Validate** - Use `dab validate` to check configuration
4. **Start** - Use `dab start` to run the engine

See [dab-add.md](dab-add.md) for adding entities.

## Error Prevention

### Common Mistakes

1. **Hardcoded connection strings with secrets**
   - Bad: `--connection-string "Server=...;Password=secret123"`
   - Good: `--connection-string "@env('DATABASE_CONNECTION_STRING')"`

2. **Missing TrustServerCertificate for local dev**
   - Connection will fail with certificate errors
   - Add `TrustServerCertificate=true` for local development

3. **Wrong database type**
   - MSSQL covers both SQL Server and Azure SQL
   - Don't confuse with `sqlserver` (not valid)

4. **Forgetting to set environment variable**
   - Config will be created but DAB start will fail
   - Set the variable before running `dab start`

## Shell Examples

### PowerShell
```powershell
# Set environment variable for session
$env:DATABASE_CONNECTION_STRING = "Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true"

# Create configuration
dab init `
  --database-type mssql `
  --connection-string "@env('DATABASE_CONNECTION_STRING')" `
  --host-mode development `
  --rest.enabled true `
  --graphql.enabled true `
  --mcp.enabled true
```

### Bash
```bash
# Set environment variable for session
export DATABASE_CONNECTION_STRING="Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true"

# Create configuration
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode development \
  --rest.enabled true \
  --graphql.enabled true \
  --mcp.enabled true
```

### Command Prompt
```cmd
REM Set environment variable for session
set DATABASE_CONNECTION_STRING=Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true

REM Create configuration
dab init --database-type mssql --connection-string "@env('DATABASE_CONNECTION_STRING')" --host-mode development
```
