---
name: azure-sql-commander
description: "Deploy jerrynixon/sql-commander as a secure Azure SQL browser and query UI on Azure Container Apps using Bicep or azd, system-assigned managed identity, ACA or Key Vault secrets, health probes, and restricted ingress."
license: MIT
---

# Azure SQL Commander

## Use when

- Deploying SQL Commander as a browser-based Azure SQL exploration and query tool.
- Adding controlled database inspection beside a DAB deployment in Azure Container Apps (ACA).
- Generating Bicep or `azd` infrastructure for `jerrynixon/sql-commander`.

## Runtime contract

- Image: `jerrynixon/sql-commander:<version>`. Resolve and pin a tested release tag; do not deploy `latest` in repeatable infrastructure.
- HTTP port: `8080`. Set ACA ingress `targetPort: 8080`; the image defaults `ASPNETCORE_URLS` to `http://+:8080`.
- Initial connection: map an ACA secret to `ConnectionStrings__db`. SQL Commander also recognizes `SQLCMDR_CONNECTION_STRING`, but `ConnectionStrings__db` is canonical.
- Health endpoint: `GET /health` returns HTTP 200 and `{ "status": "ok" }`. It proves process health, not database connectivity.
- Logging: keep `SQLCMDR_FILE_LOG=0` and collect console logs through ACA. File logging requires writable persistent storage and is not the default cloud pattern.
- State: connection changes and the embedded Data API process are replica-local and transient. Always set `maxReplicas: 1`.

## Workflow

1. Deploy SQL Commander as its own Container App, not as a sidecar in a public production DAB app.
2. Select authentication:
   - Prefer the validated **system-assigned managed identity** path for Azure SQL.
   - Use SQL authentication only when Microsoft Entra authentication is unavailable, with a narrowly scoped login stored as a secret.
   - Do not claim first-class user-assigned managed identity support; SQL Commander does not currently preserve the required client ID.
3. For system-assigned identity:
   - Set the Container App identity to `SystemAssigned`.
   - Configure a Microsoft Entra administrator on the Azure SQL logical server.
   - In the target database, run `CREATE USER [<container-app-name>] FROM EXTERNAL PROVIDER` as the Entra administrator.
   - Grant only required database roles or permissions; read-only is the default for inspection scenarios.
   - Use a connection string shaped like `Server=tcp:<server>.database.windows.net,1433;Database=<database>;Authentication=Active Directory Managed Identity;Encrypt=True;TrustServerCertificate=False`.
4. Put the connection string in an ACA secret or Key Vault-backed ACA secret and map it to `ConnectionStrings__db` with `secretRef`; never inline credentials in an environment variable or deployment output.
5. Configure Azure SQL firewall, private endpoint, VNet integration, and DNS so the ACA environment can reach the database. Prefer a private network path for production-style deployments.
6. Configure ingress:
   - Prefer internal ingress when operators have a private access path.
   - Otherwise require ACA built-in Microsoft Entra authentication or an authenticated gateway, optionally combined with IP restrictions.
   - Set `allowInsecure: false`. Never expose anonymous public SQL Commander access.
7. Configure HTTP startup, liveness, and readiness probes against `/health` on port `8080`.
8. Choose scaling deliberately:
   - Occasional browsing with acceptable cold starts: `minReplicas: 0`, `maxReplicas: 1`.
   - Active sessions or the embedded Data API runtime: `minReplicas: 1`, `maxReplicas: 1`.
9. Deploy a new revision and complete all validation checks below.

## Bicep contract

- `identity.type`: `SystemAssigned` when using Azure SQL managed identity or a system identity for Key Vault.
- `configuration.ingress`: set `targetPort: 8080`, `allowInsecure: false`, and the selected internal/external policy.
- `configuration.secrets[]`: define `sql-connection-string` directly for controlled nonproduction use, or with `keyVaultUrl` plus `identity` for Key Vault.
- `template.containers[].env[]`: map `ConnectionStrings__db` with `secretRef: 'sql-connection-string'`; set `SQLCMDR_FILE_LOG` to `0`.
- `template.containers[].probes[]`: define HTTP startup, liveness, and readiness probes using `/health` and port `8080`.
- `template.scale`: set `maxReplicas: 1` and the selected `minReplicas` value.
- For Key Vault, grant the secret-reference identity **Key Vault Secrets User**. Prefer an unversioned secret URI for automatic rotation or a versioned URI for deterministic releases.

## Embedded Data API boundary

- The SQL Commander image includes the DAB CLI and can launch a child runtime through `/data-api/...` proxy paths.
- That runtime and its generated files are transient and disappear on restart or scale-down.
- Generated DAB permissions are broad and anonymous for exploration. Do not treat this runtime as the production DAB deployment.
- Keep the hardened production DAB Container App separate, with its own immutable config, identity, ingress, and lifecycle.

## Completion checks

1. Confirm the deployed revision uses the intended pinned image tag and reports healthy probes.
2. Request `/health` through the intended authenticated/private route and verify HTTP 200.
3. Verify unauthenticated public requests are blocked or no public route exists.
4. Open SQL Commander, test the database connection, and confirm tables, views, and stored procedures load.
5. Confirm the effective SQL principal is the Container App identity for managed-identity deployments.
6. Verify the container environment uses only `secretRef`; any deployment parameter carrying a secret is marked `@secure()`, and the value is absent from plain parameters, outputs, logs, and command output.
7. Confirm `maxReplicas` is `1`; if `minReplicas` is `0`, document that sessions and the embedded Data API reset after scale-down.

## Guardrails

- Keep SQL Commander separate from production DAB traffic paths.
- Use read-only or narrowly scoped database permissions by default.
- Do not print or log full connection strings in deployment output.
- Do not use anonymous external ingress; SQL Commander can execute arbitrary SQL within its database permissions.
- Do not add application-level Azure RBAC roles as a substitute for creating the managed identity as a contained Azure SQL database user.
- Do not configure more than one replica until SQL Commander uses shared durable state and an externalized Data API runtime.

## Related skills

- `azure-deployment-data-api-builder`
- `azure-data-api-builder`
- `aspire-sql-commander`

## Microsoft Learn

- https://learn.microsoft.com/azure/container-apps/overview
- https://learn.microsoft.com/azure/container-apps/manage-secrets
- https://learn.microsoft.com/azure/container-apps/managed-identity
- https://learn.microsoft.com/azure/container-apps/health-probes
- https://learn.microsoft.com/azure/container-apps/authentication
- https://learn.microsoft.com/azure/data-api-builder/deployment/azure-container-apps
