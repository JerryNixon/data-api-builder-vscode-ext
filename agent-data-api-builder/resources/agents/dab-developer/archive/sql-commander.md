# SQL Commander - Lightweight Database Exploration Tool

## What is SQL Commander?

**SQL Commander** is a lightweight web-based SQL Server management tool for developers who need quick database exploration, query execution, and script generation—without the overhead of full-featured tools like SSMS.

**GitHub Repository:** https://github.com/JerryNixon/sql-commander

## When to Offer SQL Commander

Recommend SQL Commander when the user:
- Wants to quickly "look at" or explore their database
- Needs a simple way to run ad-hoc queries during development
- Is using Docker for local development
- Wants to browse database objects (tables, views, stored procedures)
- Needs to generate CREATE, SELECT, or DROP scripts
- Wants to export database metadata as JSON
- Prefers a lightweight alternative to SSMS

## Key Features

- **Browse database objects** - Tables, views, stored procedures
- **Execute SQL queries** - Real-time feedback
- **Generate scripts** - CREATE, SELECT, DROP statements
- **Export metadata** - JSON format for automation
- **Azure Default Credential support** - Passwordless authentication
- **VS Code integration** - Open connections directly in VS Code MSSQL extension

## Docker Container Usage

**Image:** `jerrynixon/sql-commander`

> **IMPORTANT:** For complete Docker setup instructions, see **[deploy-localhost-docker.md](deploy-localhost-docker.md)**.
>
> That guide covers:
> - Complete `docker-compose.yml` template (includes SQL Commander)
> - `.env` file setup for secrets
> - `.dab-context.json` format
> - `.gitignore` configuration
> - Troubleshooting

SQL Commander is included in the standard docker-compose template. Just run `docker-compose up -d` and access it at http://localhost:8080.

### Quick Reference

**Start:** `docker-compose up -d`

**Access:** http://localhost:8080

**Full setup guide:** [deploy-localhost-docker.md](deploy-localhost-docker.md)

### Docker Compose Template (excerpt)

SQL Commander is configured in the standard template:

```yaml
# docker-compose.yml (see deploy-localhost-docker.md for full template)
services:
  sql-server:
    image: mcr.microsoft.com/mssql/server:2025-latest
    container_name: sql-server-dev
    restart: unless-stopped
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=${SA_PASSWORD:-YourStrong@Passw0rd}
    ports:
      - "1433:1433"
    volumes:
      - sqlserver-data:/var/opt/mssql
    healthcheck:
      test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD:-YourStrong@Passw0rd}" -C -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  sql-commander:
    image: jerrynixon/sql-commander:latest
    container_name: sql-commander
    restart: unless-stopped
    environment:
      - ConnectionStrings__db=Server=sql-server;Database=${DATABASE_NAME:-master};User Id=sa;Password=${SA_PASSWORD:-YourStrong@Passw0rd};TrustServerCertificate=true
    ports:
      - "8080:8080"
    depends_on:
      sql-server:
        condition: service_healthy

volumes:
  sqlserver-data:
    external: false
```

**Start the environment:**
```bash
docker-compose up -d
```

**Access Points:**
- **SQL Commander:** http://localhost:8080
- **SQL Server:** `localhost,1433`

### Modifying the Environment

When you need to change settings (database name, ports, etc.):

1. Edit `docker-compose.yml`
2. Run `docker-compose up -d` (only recreates changed services)
3. Update `.dab-context.json` if connection details changed

### Connecting to Azure SQL Database

For Azure SQL with managed identity or Azure CLI credentials, update the compose file:

```yaml
sql-commander:
  environment:
    - ConnectionStrings__db=Server=myserver.database.windows.net;Database=mydb
```

When no credentials are provided in the connection string, SQL Commander automatically uses **Azure Default Credential** for authentication, which supports:
- Managed Identity (System-assigned or User-assigned)
- Azure CLI (`az login`)
- Visual Studio / VS Code credentials
- Azure PowerShell
- Environment variables (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, etc.)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ConnectionStrings__db` | ✅ Yes | SQL Server connection string |
| `SQLCMDR_FILE_LOG` | ❌ No | Set to `1` to enable file logging |
| `ASPNETCORE_URLS` | ❌ No | Default: `http://+:8080` |

## Health Check

SQL Commander exposes a health endpoint:
```bash
curl http://localhost:8080/health
# Returns: { "status": "ok" }
```

## VS Code Integration

SQL Commander includes an **Open in VS Code** button that:
- Builds a `vscode://ms-mssql.mssql/connect` link from your current settings
- Launches the VS Code connection dialog
- Requires the [MS SQL extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql)

## Docker Compose Commands Reference

| Action | Command |
|--------|---------|
| Start environment | `docker-compose up -d` |
| Stop environment | `docker-compose down` |
| Stop and remove data | `docker-compose down -v` |
| View logs | `docker-compose logs -f sql-commander` |
| Restart SQL Commander | `docker-compose restart sql-commander` |
| Rebuild after changes | `docker-compose up -d --force-recreate` |

## When NOT to Use SQL Commander

- Production database management (use Azure Portal, SSMS, or Azure Data Studio)
- Complex query optimization (use proper profiling tools)
- Schema migrations (use proper migration tools like EF Migrations, Flyway, etc.)
- Multi-database administration

## Troubleshooting

### Cannot connect to SQL Server container
- Ensure both containers are on the same Docker network
- Use the container name (not localhost) as the server address
- Wait 10+ seconds for SQL Server to fully initialize

### Connection timeout
- Check that SQL Server container is running: `docker ps`
- Verify the password meets SQL Server complexity requirements
- Ensure `TrustServerCertificate=true` for local development

### Health check fails
- Container may still be starting—wait a few seconds
- Check container logs: `docker logs sql-commander`
