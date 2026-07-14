---
name: azure-sql-commander
description: Run SQL Commander as a companion container for browser-based SQL access, with optional Azure Container Apps configuration.
license: MIT
---

# Azure SQL Commander

## Use when

- Adding a lightweight SQL browser beside DAB or another containerized application.
- Deploying SQL Commander to Azure Container Apps (ACA).
- For local .NET Aspire orchestration, use `aspire-sql-commander`.

## Container contract

- Image: `jerrynixon/sql-commander:<version>`; pin a tested version for repeatable deployments.
- Port: `8080` (`ASPNETCORE_URLS=http://+:8080`).
- Connection: provide `ConnectionStrings__db`; `SQLCMDR_CONNECTION_STRING` is also recognized.
- Health: `GET /health` returns HTTP 200 when the web process is running.
- Logging: console logging is the container default; set `SQLCMDR_FILE_LOG=0` unless persistent file logging is intentional.

## Workflow

1. Add SQL Commander as a separate companion container and pass the database connection through `ConnectionStrings__db`.
2. Expose port `8080` and optionally configure `/health` as the container health probe.
3. Keep credentials out of source and deployment output. In ACA, map an ACA or Key Vault-backed secret to `ConnectionStrings__db` with `secretRef`.
4. For Azure SQL, prefer system-assigned managed identity:
   - Enable the identity on the Container App.
   - Create the identity as a contained user in the target database and grant the required permissions.
   - Use `Authentication=Active Directory Managed Identity;Encrypt=True;TrustServerCertificate=False` in the connection string.
5. Choose ingress appropriate to the environment. Internal ingress or Microsoft Entra-protected external ingress is preferable for shared environments.
6. Verify the health endpoint and test database connectivity from the SQL Commander UI.

## ACA notes

- Set ingress `targetPort` to `8080` and `allowInsecure` to `false`.
- Configure HTTP probes against `/health` on port `8080` when explicit probes are needed.
- Prefer one replica because interactive settings and the optional embedded Data API runtime are process-local. Scale-to-zero is acceptable when session reset and cold start are acceptable.
- Ensure the ACA environment can reach Azure SQL through the selected firewall or private networking configuration.
- User-assigned managed identity is not currently a first-class SQL Commander setting; use system-assigned identity unless support is verified.

## Data API note

The image includes the DAB CLI for an interactive, transient Data API workflow exposed through `/data-api/...`. Keep a production DAB deployment separate when it needs its own lifecycle, security, or durable configuration.

## Completion checks

1. The container starts and `/health` returns HTTP 200.
2. SQL Commander connects and loads database objects.
3. Connection secrets do not appear in source, logs, or deployment output.
4. ACA ingress and identity match the intended environment, when ACA is used.

## Guardrails

- Keep SQL Commander separate from production DAB traffic paths.
- Use read-only or narrowly scoped database permissions by default.
- Do not print or log full connection strings in deployment output.
- Avoid anonymous public ingress because SQL Commander can execute SQL within its granted permissions.

## Related skills

- `azure-deployment-data-api-builder`
- `azure-data-api-builder`
- `aspire-sql-commander`

## Microsoft Learn

- https://learn.microsoft.com/azure/container-apps/overview
- https://learn.microsoft.com/azure/container-apps/manage-secrets
- https://learn.microsoft.com/azure/container-apps/managed-identity
