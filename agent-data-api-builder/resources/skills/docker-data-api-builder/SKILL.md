---
name: docker-data-api-builder
description: Docker Compose orchestration of SQL Server, Data API Builder, SQL Commander, and MCP Inspector. Use when asked to create docker-compose.yml, set up local containers, or run DAB without Aspire.
---

# Docker SQL Server + DAB + MCP Inspector (Local Dev)

This skill provides a minimal, repeatable workflow for running **SQL Server**, **Data API Builder (DAB)**, **SQL Commander**, and **MCP Inspector** together in Docker Compose for local development and testing.

## Included script template

- [docker.ps1](./scripts/docker.ps1) — starts compose, waits for SQL health, builds dacpac, and publishes schema.
  - Use this instead of running `docker compose up -d` alone when schema deployment is required.

---

## Core Mental Model

- **One docker-compose.yml** controls the full stack. Never use raw `docker run`.
- **Containers talk by service name**, not `localhost`.
- **DAB reads config from `/App/dab-config.json`** — mount it **read-only**.
- **SQL Server must be healthy before DAB starts** — use healthcheck + `depends_on: condition: service_healthy`.
- **MCP Inspector requires a special URL** to auto-connect to DAB's `/mcp` endpoint.

---

## Prerequisites

- Docker Desktop running
- A `dab-config.json` in the workspace root (use `@env('DATABASE_CONNECTION_STRING')`)
- Non-default SQL Server host port (assume 1433 is in use)

> **MVP rule:** Only add `database.sql` / `sample-data.sql` if the user explicitly asks.

---

## Quick Workflow (Checklist)

1. Pick a **cute Compose project name** (e.g., `bloom-tracker`).
2. Create `.env` with passwords/connection strings (gitignored).
3. Create `.gitignore` with `.env`, `**\bin`, and `**\obj` entries.
3. Create `docker-compose.yml` using the template below.
4. Start services with `docker compose up -d`.
5. **Wait for SQL Server to be healthy** — run `docker compose ps` and confirm `sql-2025` shows `(healthy)`.
6. **Build and deploy the database schema** before opening SQL Commander or DAB:
   ```powershell
   dotnet build database/database.sqlproj
   sqlpackage /Action:Publish /SourceFile:database/bin/Debug/database.dacpac /TargetConnectionString:"Server=localhost,14330;Database=<DbName>;User Id=sa;Password=<password>;TrustServerCertificate=true" /p:BlockOnPossibleDataLoss=false
   ```
7. Open **SQL Commander** or **MCP Inspector** only after the schema is deployed.

---

## Templates

### `.env` (example)

```env
# Never commit this file
SA_PASSWORD=YourStrong@Passw0rd
DATABASE_CONNECTION_STRING=Server=sql-2025;Database=TodoDb;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true
SQL_COMMANDER_CONNECTION_STRING=Server=sql-2025;Database=TodoDb;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true
```

> **Note:** For container-to-container connections, use `Server=sql-2025` (the service name), **not** `localhost`.
> **CRITICAL:** Never use `$` in passwords — Docker Compose interprets `$` as a variable reference in `.env` files (e.g., `Pa$$word` becomes `Paword`). Use only alphanumeric characters, `!`, `@`, `#`, `%`, `^`, `&`, `*`.

### `docker-compose.yml`

```yaml
name: bloom-tracker  # change to match your use case

services:
  sql-2025:
    image: mcr.microsoft.com/mssql/server:2025-latest
    container_name: sql-2025
    restart: unless-stopped
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=${SA_PASSWORD}
    ports:
      - "14330:1433"  # non-default host port
    volumes:
      - sql-2025-data:/var/opt/mssql
    healthcheck:
      test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}" -C -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  sql-cmdr:
    image: jerrynixon/sql-commander:latest
    container_name: sql-cmdr
    restart: unless-stopped
    environment:
      - ConnectionStrings__db=${SQL_COMMANDER_CONNECTION_STRING}
    ports:
      - "8080:8080"
    depends_on:
      sql-2025:
        condition: service_healthy

  api-server:
    image: mcr.microsoft.com/azure-databases/data-api-builder:1.7.83-rc
    container_name: api-server
    restart: unless-stopped
    environment:
      - DATABASE_CONNECTION_STRING=${DATABASE_CONNECTION_STRING}
    ports:
      - "5000:5000"
    volumes:
      - ./dab-config.json:/App/dab-config.json:ro
    depends_on:
      sql-2025:
        condition: service_healthy

  mcp-inspector:
    image: ghcr.io/modelcontextprotocol/inspector:latest
    container_name: mcp-inspector
    restart: unless-stopped
    environment:
      - HOST=0.0.0.0
      - MCP_AUTO_OPEN_ENABLED=false
      - DANGEROUSLY_OMIT_AUTH=true
    ports:
      - "6274:6274"
      - "6277:6277"
    depends_on:
      - api-server

volumes:
  sql-2025-data:
    external: false
```

### MCP Inspector auto-connect URL

```
http://localhost:6274/?transport=streamable-http&serverUrl=http%3A%2F%2Fapi-server%3A5000%2Fmcp
```

> **Important:** `http://localhost:6274` alone won't auto-connect.

---

## Minimal DAB MCP Config (reference)

Ensure `dab-config.json` enables MCP and uses env vars:

```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/download/v1.7.83-rc/dab.draft.schema.json",
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('DATABASE_CONNECTION_STRING')"
  },
  "runtime": {
    "rest": { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql", "allow-introspection": true },
    "mcp": { "enabled": true, "path": "/mcp" },
    "host": { "mode": "development" }
  }
}
```

---

## Verification

- `docker compose ps` shows all services running
- SQL container health is **healthy**
- DAB responds at `http://localhost:5000/health` — open this in the browser to verify DAB is running and show the user it's working
- MCP Inspector opens via the special URL and lists tools

---

## Troubleshooting
### SA login fails (Error 18456, State 8)
- SQL Server only sets `SA_PASSWORD` on **first volume initialization**. If the volume already exists from a prior run with a different password, changing `.env` has no effect.
- **Fix:** Run `docker compose down -v` to remove volumes, then `docker compose up -d` to recreate from scratch.
- **Prevention:** Before running `docker compose up -d`, always run `docker compose down -v` to ensure a clean state. This avoids stale password mismatches.
### DAB can't connect to SQL Server
- **`TrustServerCertificate=true` is required** — SQL Commander will not connect without it (locally or in Azure)
- Use `Server=sql-2025` (service name) inside containers
- Confirm SQL container is healthy before DAB starts
### SQL Commander or DAB fails with "Cannot open database" (Error 4060)
- The SQL Server container is running and healthy, but the **database hasn't been created yet**.
- SQL Server's healthcheck only verifies the engine accepts connections — it does NOT verify specific databases exist.
- **Fix:** Build and deploy the database schema with `sqlpackage /Action:Publish` before using SQL Commander or DAB.
- **Prevention:** Always run `sqlpackage` after `docker compose up -d` and before opening any service that depends on the database.
### MCP Inspector opens but doesn't connect
- Use the **special auto-connect URL** (not plain `localhost:6274`)
- Verify DAB is running and `/mcp` is enabled

---

## Consistency Rules (MVP)

1. **Always use docker-compose.yml** (no raw `docker run`).
2. **Always use non-default SQL ports** on the host.
3. **Always mount `dab-config.json` read-only** (`:ro`) for **local development only**.
4. **Always use healthcheck + `depends_on: condition: service_healthy`.**
5. **Always include SQL Commander** and **MCP Inspector** in the compose stack.
6. **Use service names** for container-to-container connections.
7. **Ask before adding schema or seed files** (`database.sql`, `sample-data.sql`).
8. **Prefer a dedicated SQL login** for app connections; only use `sa` to bootstrap if needed.

> For Azure deployment, see the `azure-data-api-builder` skill.
