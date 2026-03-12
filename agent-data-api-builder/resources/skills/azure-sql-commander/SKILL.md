---
name: azure-sql-commander
description: Deploy SQL Commander to Azure Container Apps for browsing and querying Azure SQL databases. Use when asked to deploy SQL Commander to Azure, add a SQL query tool to Azure, or configure SQL Commander in Bicep.
---

# SQL Commander — Azure Deployment

Deploy SQL Commander as an Azure Container App for browsing and querying SQL databases in the cloud. SQL Commander is a lightweight web-based SQL query tool.

## Documentation references

- https://hub.docker.com/r/jerrynixon/sql-commander
- See also: `aspire-sql-commander` skill for local Aspire usage

---

## Container Image

```
docker.io/jerrynixon/sql-commander:latest
```

No custom build required — deploy the public image directly to Azure Container Apps.

---

## Connection String

SQL Commander expects a single environment variable:

```
ConnectionStrings__db=Server=<host>;Database=<name>;User Id=<user>;Password=<password>;TrustServerCertificate=true
```

> **CRITICAL:** `TrustServerCertificate=true` is **required**. SQL Commander will not connect without it — locally or in Azure. Always include it in the connection string.

**Important:** The environment variable name is `ConnectionStrings__db` (double underscore). This maps to `ConnectionStrings:db` in .NET configuration. Using a single underscore or a different key name will not work.

---

## Bicep Resource

```bicep
resource sqlCmdr 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'sql-commander-${resourceToken}'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
      }
      secrets: [
        { name: 'db-conn', value: sqlConnString }
      ]
    }
    template: {
      containers: [
        {
          name: 'sql-commander'
          image: 'docker.io/jerrynixon/sql-commander:latest'
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'ConnectionStrings__db', secretRef: 'db-conn' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}
```

**Key points:**
- `minReplicas: 0` — scales to zero when idle (cost saving)
- `maxReplicas: 1` — only one instance needed for a dev/admin tool
- Connection string stored as a Container Apps secret, referenced via `secretRef`
- Ingress is `external: true` so it's accessible from the browser
- Port 8080 is the internal container port

---

## Health Check

SQL Commander exposes a `/health` endpoint. Use it to verify the deployment:

```powershell
Invoke-WebRequest -Uri "https://<sql-commander-fqdn>/health" -UseBasicParsing
```

Configure a probe in Bicep if desired:

```bicep
probes: [
  {
    type: 'Liveness'
    httpGet: { path: '/health', port: 8080 }
    periodSeconds: 30
  }
]
```

---

## Connection String for Azure SQL

When connecting to Azure SQL (not a container), use the Azure SQL server FQDN:

```
Server=<server>.database.windows.net;Database=<db>;User Id=<user>;Password=<password>;TrustServerCertificate=true
```

For Managed Identity authentication:

```
Server=<server>.database.windows.net;Database=<db>;Authentication=Active Directory Managed Identity;TrustServerCertificate=true
```

---

## Docker Compose Equivalent

For local testing before Azure deployment:

```yaml
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
```

In Docker Compose, use the SQL service name (e.g., `Server=sql-2025`) in the connection string, and ensure the database schema is deployed with `sqlpackage` before opening Commander.

---

## Common Issues and Fixes

### Commander starts but shows no tables
**Cause:** Database exists but schema not deployed yet.
**Fix:** Deploy schema with `sqlpackage` before accessing Commander. Verify tables exist.

### Connection refused
**Cause:** Azure SQL firewall blocking the Container App's outbound IP.
**Fix:** Add the Container Apps Environment's outbound IPs to the Azure SQL firewall, or enable "Allow Azure services" access.

### "Cannot open database" (Error 4060)
**Cause:** Database name in connection string doesn't match the actual database.
**Fix:** Verify the `Database=` value in the connection string matches exactly.

### Environment variable name wrong
**Cause:** Using `ConnectionStrings:db` or `ConnectionStrings_db` instead of `ConnectionStrings__db`.
**Fix:** Use double underscores: `ConnectionStrings__db`.

---

## Prerequisites

- Azure Container Apps Environment
- Azure SQL Database (or SQL Server accessible from Azure)
- Connection string with `TrustServerCertificate=true`
