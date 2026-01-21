# Deploying Data API Builder to Azure Container Apps (Preferred)

Use this playbook to publish DAB to Azure Container Apps (ACA). It follows a tested end-to-end flow with order, retries, and timing expectations. Replace the sample Star Trek schema with your own database—these steps are schema-agnostic.

## When to Use
- You want the simplest managed hosting option for DAB with built-in ingress and revisions.
- You already have an Azure SQL database or will create one during deployment.
- You may already have parts of the stack (RG, ACR, ACA environment); follow the reuse paths below.

## Prerequisites (match the reference scripts)
- PowerShell 5.1+ (or Bash) and Docker client (ACR build can run server-side).
- Azure CLI installed and logged in: `az login`, then `az account set --subscription <id>`.
- DAB CLI **≥ 1.7.81-rc**: `dab --version`.
- `sqlcmd` available if you need to seed the database.
- Files in your working directory: `dab-config.json`, `Dockerfile` that copies it to `/App/dab-config.json`, and (optionally) a `.sql` file to seed data.

## Connection String Patterns
- **Managed Identity (recommended)**: `Server=<server>.database.windows.net;Database=<db>;Authentication=Active Directory Default;Encrypt=True;TrustServerCertificate=False`.
- **SQL auth**: `Server=<server>.database.windows.net;Database=<db>;User Id=<user>;Password=<pwd>;Encrypt=True;TrustServerCertificate=False`.
- Store it in an env var (e.g., `MSSQL_CONNECTION_STRING`) and reference with `@env('MSSQL_CONNECTION_STRING')` in `dab-config.json`.

## Golden Path: New ACA Deployment (~8 minutes)
The order below matches the tested flow with built-in retries.

1) **Validate config**
   - `dab validate --config dab-config.json` before any deploy.

2) **Authenticate & select subscription**
   - `az login` → confirm `az account show` is the target; switch if needed.

3) **Create or reuse resource group**
   - `az group create --name <rg> --location <region> --tags author=dab-demo owner=<you> version=<script>`.

4) **Database setup**
   - Use existing Azure SQL DB or create one; open firewall if required.
   - If using managed identity later, ensure Azure AD admin is enabled on the server.
   - Seed schema (optional): `sqlcmd -S <fqdn> -d <db> -G -i ./your-database.sql`.

5) **Build image in ACR (server-side)**
   - Create ACR if missing: `az acr create --name <acr> --resource-group <rg> --sku Basic --admin-enabled false --tags author=dab-demo`.
   - Build with version pin (mirrors script defaults):
     ```bash
     az acr build \
       --resource-group <rg> \
       --registry <acr> \
       --image <acr>.azurecr.io/dab-baked:<timestamp> \
       --file Dockerfile \
       --build-arg DAB_VERSION=1.7.81-rc \
       .
     ```
   - Expect ~40s for the build.

6) **Create ACA environment + Log Analytics**
   - Log Analytics: `az monitor log-analytics workspace create --name <law> --resource-group <rg> --location <region> --tags author=dab-demo`.
   - ACA env: `az containerapp env create --name <aca-env> --resource-group <rg> --location <region> --logs-destination log-analytics --logs-workspace-id <id> --logs-workspace-key <key> --tags author=dab-demo`.

7) **Create the Container App (system-assigned identity)**
   - Recommend port 5000, external ingress.
   - Example (managed identity + config file path):
     ```bash
     az containerapp create \
       --name <app> \
       --resource-group <rg> \
       --environment <aca-env> \
       --image <acr>.azurecr.io/dab-baked:<timestamp> \
       --ingress external --target-port 5000 \
       --registry-server <acr>.azurecr.io \
       --system-assigned \
         --env-vars MSSQL_CONNECTION_STRING="<connection-string>" Runtime__ConfigFile=/App/dab-config.json \
       --tags author=dab-demo
     ```

8) **Grant permissions**
   - ACR pull: `az role assignment create --assignee <app-identity> --role AcrPull --scope $(az acr show --name <acr> --query id -o tsv)`.
   - Database: create contained user for the managed identity and add `db_datareader`, `db_datawriter`, and `EXECUTE` (for stored procedures) roles.

9) **Wait for readiness (script uses retries)**
   - Poll every ~10s up to 2 minutes: `az containerapp show --name <app> --resource-group <rg> --query "{running:properties.runningStatus,revision:properties.latestReadyRevisionName}"`.
   - Health check: call `<fqdn>/health` up to 5 attempts (10s backoff) expecting `{ "status": "Healthy" }`.
   - Total end-to-end time in the reference script: ~8 minutes.

10) **Verify endpoints**
   - REST: `https://<fqdn>/api/<Entity>`
   - GraphQL: `https://<fqdn>/graphql`
   - MCP: `https://<fqdn>/mcp`
   - Swagger: `https://<fqdn>/swagger`

## Fast Updates to an Existing ACA App (~3 minutes)
Use this when only the image changes (config baked into the image).

1) **New image tag**: `<acr>.azurecr.io/dab-baked:<timestamp>` built with `az acr build` (same args as above).
2) **Update container app image**:
   ```bash
   az containerapp update --name <app> --resource-group <rg> --image <acr>.azurecr.io/dab-baked:<timestamp>
   ```
3) **Wait for latest revision**: poll `runningStatus` and `latestReadyRevisionName` (10s cadence, 2m timeout).
4) **Health check**: hit `/health` up to 5 times with 10s backoff. The script logs success timing; expect ~30s for update + ~40s build → ~3m total.
5) **Keep endpoints handy**: `/swagger`, `/graphql`, `/health` for quick validation.

## Reusing Existing Pieces
- **Existing SQL / ACR / ACA env**: skip creation, but ensure the container app identity has AcrPull and database permissions.
- **Existing config**: always run `dab validate` before rebuild/redeploy.
- **Connection string tweaks**: add `TrustServerCertificate=true` for dev if using self-signed certs.
- **Host/auth defaults**: prefer `host.mode=production` and a real auth provider before exposing to the internet.

## Troubleshooting & Tips (mirrors script guardrails)
- Build or deploy failures: re-run with the same commands; the scripts use retry/backoff around Azure CLI and health checks.
- Subscription mix-ups: `az account show` and `az account set --subscription <id>` before running.
- Port issues locally: override with `dab start --host.port 5001` when testing.
- Slow readiness: give ACA up to 2 minutes for the revision plus 5 health retries before diagnosing logs.
- Logs: `az containerapp logs show --name <app> --resource-group <rg> --tail 100` for runtime issues.

## Cleanup
- Delete tagged resources when done: `az group delete --name <rg> --yes --no-wait`.