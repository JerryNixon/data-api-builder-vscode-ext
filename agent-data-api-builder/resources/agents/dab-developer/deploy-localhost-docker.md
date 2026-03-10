# Local Development with Docker (Complete Guide)

This guide covers everything needed to set up a local Docker development environment for Data API Builder.

---

## Critical Rules

1. **ALWAYS run DAB in a container** — Not on the host. Docker provides consistent environment, lifecycle management, and networking.
2. **NEVER run raw `docker run` commands** — Always use `docker-compose.yml`
3. **ALWAYS use non-default ports** — Assume local SQL Server is running on 1433, so use `1434:1433` or higher
4. **Use .env for passwords** — Gitignored, docker-compose reads it automatically via `${VARIABLE}` syntax
5. **Give Docker projects cute themed names** — Based on use case (e.g., `name: deli-counter`, `name: card-collector`)
6. **Name SQL schema file `database.sql`** — Contains the DDL for tables, views, stored procedures
7. **Create `sample-data.sql`** — Include starter rows that match your schema and execute it immediately after `database.sql`.
8. **NEVER use `sa` for application connections** — Create a dedicated database user
9. **ALWAYS set `TrustServerCertificate=true`** — Required for local Docker SQL Server
10. **ALWAYS use healthcheck + `depends_on: condition: service_healthy`** — Simple `depends_on` is NOT enough!
11. **ALWAYS mount dab-config.json as read-only (`:ro`)** — Prevents "device busy" errors
12. **Use short service names for container-to-container networking** — e.g., `sql-2025`, `sql-cmdr`, `api-server`, `mcp-inspector` (no `localhost`).

---

## Files Overview

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Defines Docker environment (uses `${VAR}` placeholders for secrets) |
| `.env` | Contains passwords (gitignored — docker-compose reads automatically) |
| `database.sql` | DDL for creating tables, views, stored procedures |
| `sample-data.sql` | Starter rows to make the app usable immediately |
| `dab-config.json` | DAB configuration (uses `@env()` for connection string) |

**Sample docker-compose.yml:** See [docker-compose.sample.yml](docker-compose.sample.yml)

---

## Step 1: Create `docker-compose.yml`

Give your project a **cute themed name** based on what you're building:
- Deli queue → `name: deli-counter`
- Baseball cards → `name: card-collector`  
- Flower shop → `name: bloom-tracker`

Copy from [docker-compose.sample.yml](docker-compose.sample.yml) or use this:

```yaml
name: dab-dev

services:
  sql-2025:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: sql-2025
    restart: unless-stopped
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=YourStrong@Passw0rd
    ports:
      - "1434:1433"
    volumes:
      - sql-2025-data:/var/opt/mssql
    networks:
      - dab-net
    healthcheck:
      test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  sql-cmdr:
    image: jerrynixon/sql-commander:latest
    container_name: sql-cmdr
    restart: unless-stopped
    environment:
      - ConnectionStrings__db=Server=sql-2025;Database=MyDb;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true
    ports:
      - "8080:8080"
    networks:
      - dab-net
    depends_on:
      sql-2025:
        condition: service_healthy

  api-server:
    image: mcr.microsoft.com/azure-databases/data-api-builder
    container_name: api-server
    ports:
      - "5000:5000"
    volumes:
      - ./dab-config.json:/App/dab-config.json:ro  # Read-only mount!
    environment:
      - DATABASE_CONNECTION_STRING=Server=sql-2025;Database=MyDb;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true
    networks:
      - dab-net
    depends_on:
      sql-2025:
        condition: service_healthy  # Wait for SQL to be ready!

networks:
  dab-net:

volumes:
  sql-2025-data:
    external: false
```

**Critical points:**
- **Port `1434:1433`** — Always use non-default port (assume local SQL Server is on 1433)
- **No .env file** — Connection strings are inline in docker-compose.yml for simplicity
- **Cute project name** — Name the compose project based on use case (e.g., `name: deli-counter`)
- **`database.sql`** — Always name your DDL file `database.sql`
- **`healthcheck`** — Ensures SQL Server is ready before DAB starts
- **`depends_on: condition: service_healthy`** — DAB waits for SQL healthcheck (simple `depends_on` is NOT enough!)
- **`volumes: :ro`** — Mount config as read-only to prevent "device busy" errors
- **`Server=sql-2025`** — Use service name, NOT `localhost` for container-to-container
- **`TrustServerCertificate=true`** — Required for Docker SQL Server

**Connection string differences:**
| From | SQL Server Reference |
|------|---------------------|
| Host machine | `Server=localhost,1434;...` |
| DAB container | `Server=sql-2025;...` (service name) |

**Check if port 1433 is in use:**
```powershell
Get-NetTCPConnection -LocalPort 1433 -ErrorAction SilentlyContinue
# If output shows a connection, use port 1434 instead
```

---

## Step 3: Startup Sequence (Important!)

DAB must start AFTER the database and tables exist. Follow this sequence:

```powershell
# 1. Start SQL Server only (waits for healthcheck)
docker-compose up -d sql-2025

# 2. Wait for healthy status
do {
  $status = docker inspect --format='{{.State.Health.Status}}' sql-2025
  Write-Host "SQL Server status: $status"
  Start-Sleep -Seconds 5
} while ($status -ne "healthy")

# 3. Run database setup (create DB and tables)
docker cp database.sql sql-2025:/tmp/database.sql
docker exec sql-2025 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C -i /tmp/database.sql

# 4. Load starter data (must run after schema)
docker cp sample-data.sql sql-2025:/tmp/sample-data.sql
docker exec sql-2025 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C -i /tmp/sample-data.sql

# 5. Start DAB (and other services)
docker-compose up -d

# 6. Verify API is working
Start-Sleep -Seconds 5
Invoke-RestMethod http://localhost:5000/api/MyEntity
```

**Why this sequence?**
- `depends_on: service_healthy` ensures DAB starts after SQL is ready
- But if database/tables don't exist yet, DAB will fail
- Run setup scripts AFTER SQL is healthy, BEFORE starting DAB

**Access points:**
- **SQL Server from host:** `localhost,1434` (note the comma, not colon)
- **SQL Commander:** http://localhost:8080
- **DAB REST API:** http://localhost:5000/api/{Entity}
- **DAB GraphQL:** http://localhost:5000/graphql

---

## Step 4: Create Database and User (IMPORTANT)

**NEVER use `sa` for application connections.** Always create a dedicated user.

When creating a database (e.g., `TodoDb`), also create:
- A login: `TodoDbLogin`
- A user: `TodoDbUser`
- Grant appropriate permissions

```sql
-- Connect as sa first to create the database and user
-- Run via sqlcmd or SQL Commander

-- Create database
CREATE DATABASE TodoDb;
GO

-- Create login (server level)
CREATE LOGIN TodoDbLogin WITH PASSWORD = 'YourStrong@Passw0rd';
GO

-- Switch to the new database
USE TodoDb;
GO

-- Create user (database level)
CREATE USER TodoDbUser FOR LOGIN TodoDbLogin;
GO

-- Grant permissions (adjust as needed)
ALTER ROLE db_datareader ADD MEMBER TodoDbUser;
ALTER ROLE db_datawriter ADD MEMBER TodoDbUser;
GO
```

**Then update `docker-compose.yml` SQL Commander connection:**
```yaml
environment:
  - ConnectionStrings__db=Server=sql-server;Database=TodoDb;User Id=TodoDbLogin;Password=YourStrong@Passw0rd;TrustServerCertificate=true
```

**And run:** `docker-compose up -d`

---

## Step 5: Create `.env`

Store the connection string for DAB to use:

```bash
# .env - NEVER commit this file

# Connection string for DAB (from host machine to Docker)
ConnectionStrings__db=Server=localhost,14330;Database=TodoDb;User Id=TodoDbLogin;Password=YourStrong@Passw0rd;TrustServerCertificate=true
```

**Note:** 
- Use `localhost,14330` (host port) for connections FROM your machine TO Docker
- Use `sql-server` (container name) for container-to-container connections

---

## Step 6: Create `.dab-context.json`

This tells the agent which environment is active. **NO SECRETS here:**

```json
{
  "environment": "docker",
  "created": "2024-01-15T10:30:00Z",
  "composeFile": "docker-compose.yml",
  "sqlServer": {
    "containerName": "sql-server-2025",
    "host": "localhost",
    "port": 14330,
    "database": "TodoDb",
    "userId": "TodoDbLogin",
    "connectionStringEnvVar": "ConnectionStrings__db"
  },
  "sqlCommander": {
    "containerName": "sql-commander",
    "url": "http://localhost:8080"
  },
  "notes": "Use app user TodoDbLogin, not sa. TrustServerCertificate=true is required."
}
```

---

## Before Any Database Operation

**ALWAYS:**
1. Read `.dab-context.json` → get `connectionStringEnvVar` name
2. Read `.env` → get actual connection string
3. Use that connection (never assume localhost:1433)

---

## Modifying the Environment

1. Edit `docker-compose.yml`
2. Run `docker-compose up -d` (only recreates changed services)
3. Update `.env` if connection details changed
4. Update `.dab-context.json` if database/port changed

---

## Docker Compose Commands

| Action | Command |
|--------|---------|
| Start | `docker-compose up -d` |
| Stop (keep data) | `docker-compose down` |
| Stop and DELETE data | `docker-compose down -v` |
| View logs | `docker-compose logs -f` |
| Check status | `docker-compose ps` |
| Restart service | `docker-compose restart sql-server` |

---

## Key Networking Concepts

Understanding Docker networking is essential for troubleshooting.

### Container-to-Container Communication

- Containers on the same Docker network communicate using **service names** (from docker-compose) or **container names**, NOT `localhost` or `host.docker.internal`
- `host.docker.internal` only works for container → host machine communication
- Docker Compose automatically creates a shared network for all services in the same file

### Service Name vs Container Name

```yaml
services:
  sql-server:                        # ← Service name (used for DNS resolution between containers)
    container_name: sql-server-2025  # ← Container name (cosmetic, shown in docker ps)
```

- **Between containers**: use the **service name** → `Server=sql-server`
- **From host machine**: use `localhost` with mapped port → `Server=localhost,14330`
- The container name is what you see in `docker ps` and use with `docker exec`

### Port Mapping

```yaml
ports:
  - "14330:1433"  # host:container
```

| Connection From | Server Address | Port |
|-----------------|----------------|------|
| Host machine | `localhost,14330` | Mapped host port |
| Another container | `sql-server` | Internal port (1433) |

---

## Troubleshooting Decision Tree

### Error: "Login failed for user 'sa'"

1. Check if SQL Server container is healthy: `docker-compose ps`
2. Verify password matches in both container env and connection string
3. Check network connectivity — are containers on the same network?
4. Ensure `TrustServerCertificate=true` is in connection string

### Error: "Cannot open database 'X'"

1. Database may not exist (fresh volume or volume was deleted)
2. Connect to `master` first and create the database
3. Volumes are tied to project name — renaming compose project creates new volumes

### Error: Connection refused/timeout

1. Wrong server address (using `localhost` instead of service name between containers)
2. Container not on same Docker network
3. SQL Server still starting → add health check + `depends_on: condition: service_healthy`

---

## Troubleshooting

### SQL Commander Not Connecting

Check these in order:

| Problem | Solution |
|---------|----------|
| Database doesn't exist | Create the database first |
| No tables in database | Create tables before browsing |
| Wrong port | Use container name `sql-server` not `localhost` |
| Wrong container name | Check `docker-compose.yml` for actual name |
| Pointing to host machine | Use `sql-server` (container name) not `localhost` |
| Missing TrustServerCertificate | Add `TrustServerCertificate=true` — **REQUIRED** |
| Wrong credentials | Verify user/password, check SQL auth is enabled |
| Stale connection | Refresh SQL Commander page |

### Connection String Requirements

**`TrustServerCertificate=true` is REQUIRED** for Docker SQL Server. Without it, connections will fail with certificate errors.

### Container Not Running

```bash
# Check status
docker-compose ps

# View logs for errors
docker-compose logs sql-server

# Restart
docker-compose up -d
```

### Port Conflict

If port 14330 is in use, change it in `docker-compose.yml`:
```yaml
ports:
  - "14331:1433"  # Use different host port
```

Then update `.env` and `.dab-context.json` with new port.

### SQL Authentication Not Working

Ensure:
1. Login exists: `SELECT name FROM sys.server_principals WHERE name = 'TodoDbLogin'`
2. User exists in database: `SELECT name FROM sys.database_principals WHERE name = 'TodoDbUser'`
3. User is mapped to login correctly

### Health Check Failing

Wait up to 60 seconds on first start. If still failing:
```bash
docker-compose logs sql-server
```

Look for password policy errors or memory issues.

### Key Networking Lesson

When containers need to talk to each other:
- **Same docker-compose file** → use **service name** as hostname (e.g., `sql-server`)
- **Separate containers** → create shared network with `docker network create`, add both containers to it
- **NEVER use** `localhost` or `127.0.0.1` for container-to-container communication
- `host.docker.internal` is for container → host machine only

---

## Creating a Database (Full Workflow)

When user asks to create a local database, follow this complete workflow:

### 1. Create Database and User

```sql
-- As sa, create database
CREATE DATABASE TodoDb;
GO

-- Create login (server-level)
CREATE LOGIN TodoDbLogin WITH PASSWORD = 'YourStrong@Passw0rd';
GO

-- Switch to database
USE TodoDb;
GO

-- Create user (database-level)  
CREATE USER TodoDbUser FOR LOGIN TodoDbLogin;
GO

-- Grant permissions
ALTER ROLE db_datareader ADD MEMBER TodoDbUser;
ALTER ROLE db_datawriter ADD MEMBER TodoDbUser;
GRANT EXECUTE TO TodoDbUser;  -- For stored procedures
GO
```

### 2. Update docker-compose.yml

Change SQL Commander to use the new database and user:
```yaml
sql-commander:
  environment:
    - ConnectionStrings__db=Server=sql-server;Database=TodoDb;User Id=TodoDbLogin;Password=YourStrong@Passw0rd;TrustServerCertificate=true
```

### 3. Restart SQL Commander

```bash
docker-compose up -d
```

### 4. Update .env

```bash
ConnectionStrings__db=Server=localhost,14330;Database=TodoDb;User Id=TodoDbLogin;Password=YourStrong@Passw0rd;TrustServerCertificate=true
```

### 5. Update .dab-context.json

```json
{
  "sqlServer": {
    "database": "TodoDb",
    "userId": "TodoDbLogin"
  }
}
```

---

## Adding Data API Builder Container

Once you have SQL Server running with a database and tables, add DAB to expose REST and GraphQL APIs.

### Step 1: Discover Database Schema

Use the `get_schema` tool to understand the database structure:
- Database name
- Table names, schemas, columns
- Primary keys (required for DAB entity configuration)

### Step 2: Create dab-config.json

```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/latest/download/dab.draft.schema.json",
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('DATABASE_CONNECTION_STRING')"
  },
  "runtime": {
    "rest": { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql", "allow-introspection": true },
    "host": {
      "cors": { "origins": ["*"] },
      "authentication": { "provider": "StaticWebApps" },
      "mode": "development"
    }
  },
  "entities": {
    "Todo": {
      "source": { "object": "dbo.Todo", "type": "table" },
      "graphql": { "enabled": true, "type": { "singular": "Todo", "plural": "Todos" } },
      "rest": { "enabled": true, "path": "/todos" },
      "permissions": [{ "role": "anonymous", "actions": [{ "action": "*" }] }]
    }
  }
}
```

**Key points:**
- Use `@env('DATABASE_CONNECTION_STRING')` to read from environment variable
- Set `mode: development` for testing
- For each table: set source object as `schema.tablename`
- Anonymous permissions with `*` for development only

### Step 3: Add DAB to docker-compose.yml

```yaml
data-api-builder:
  image: mcr.microsoft.com/azure-databases/data-api-builder:latest
  container_name: data-api-builder
  restart: unless-stopped
  environment:
    - DATABASE_CONNECTION_STRING=Server=sql-server;Database=TodoDb;User Id=TodoDbLogin;Password=YourStrong@Passw0rd;TrustServerCertificate=true
  ports:
    - "5000:5000"
  volumes:
    - ./dab-config.json:/App/dab-config.json:ro
  depends_on:
    sql-server:
      condition: service_healthy
```

**Critical configuration:**
- `Server=sql-server` — use the Docker Compose **service name**, not container name or localhost
- Mount config as read-only: `./dab-config.json:/App/dab-config.json:ro`
- `depends_on` with `condition: service_healthy` ensures SQL is ready first
- Port 5000 is DAB's default

### Step 4: Start the Environment

```bash
docker compose up -d
```

### Step 5: Verify the API

```bash
# REST - List all todos
curl http://localhost:5000/api/todos

# REST - Get by ID
curl http://localhost:5000/api/todos/Id/1

# GraphQL playground
open http://localhost:5000/graphql
```

### DAB Common Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Using `localhost` in connection string | Use Docker Compose service name (`sql-server`) |
| Forgetting `TrustServerCertificate=true` | Always include for dev containers |
| Not waiting for SQL Server | Use `depends_on` with health check condition |
| Hardcoding connection string in config | Use `@env()` and set via environment variable |
| Wrong volume mount path | DAB expects config at `/App/dab-config.json` |
| Using `sa` for DAB connections | Create dedicated database user |

### Complete Environment Summary

After adding DAB, you'll have:

| Container | Port | Purpose |
|-----------|------|---------|
| sql-server-2025 | 14330 | SQL Server database |
| sql-commander | 8080 | Web-based SQL management |
| data-api-builder | 5000 | REST + GraphQL APIs |

**Endpoints:**
- REST: `http://localhost:5000/api/<entity>`
- GraphQL: `http://localhost:5000/graphql`
- SQL Commander: `http://localhost:8080`

---

## Switching to Azure SQL

Update `.dab-context.json`:
```json
{
  "environment": "azure",
  "composeFile": null,
  "sqlServer": {
    "host": "myserver.database.windows.net",
    "database": "mydb",
    "connectionStringEnvVar": "ConnectionStrings__db"
  },
  "notes": "Azure SQL - delete resource group when done: az group delete --name rg-dab-dev --yes"
}
```

Update `.env`:
```bash
ConnectionStrings__db=Server=myserver.database.windows.net;Database=mydb;User Id=myuser;Password=...;Encrypt=True;TrustServerCertificate=False
```

**Note:** Azure SQL uses `TrustServerCertificate=False` (opposite of Docker).

---

## Setup Checklist

- [ ] `.gitignore` includes `.env`
- [ ] `docker-compose.yml` created from template
- [ ] `docker-compose up -d` successful
- [ ] Database created with dedicated user (not sa)
- [ ] `docker-compose.yml` updated to use app user
- [ ] `.env` created with connection string
- [ ] `.dab-context.json` created (no secrets)
- [ ] SQL Commander accessible at http://localhost:8080
- [ ] `dab-config.json` created with entities
- [ ] Data API Builder accessible at http://localhost:5000
