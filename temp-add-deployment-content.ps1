$filePath = "c:\Users\jnixon\source\repos\data-api-builder-vscode-ext\.github\agents\dab-developer\deployment-azure-container-apps.md"

Add-Content -Path $filePath -Value @"

---

## Deployment Steps

### Step 1: Validate Prerequisites (1 minute)

Check tools installation:
``````powershell
# Azure CLI
az --version
if (`$LASTEXITCODE -ne 0) { Write-Error "Install Azure CLI" }

# DAB CLI
dab --version
if (`$LASTEXITCODE -ne 0) { Write-Error "Install DAB CLI" }

# SQL CMD (for SQL Server only)
sqlcmd -?
``````

Validate configuration files:
``````powershell
# Verify dab-config.json exists
if (-not (Test-Path "./dab-config.json")) {
    Write-Error "dab-config.json not found"
}

# Validate DAB config
dab validate --config ./dab-config.json
``````

Create Dockerfile if needed:
``````dockerfile
ARG DAB_VERSION=1.2.10
FROM mcr.microsoft.com/azure-databases/data-api-builder:`${DAB_VERSION}

COPY dab-config.json /App/dab-config.json
RUN chmod 444 /App/dab-config.json || true

EXPOSE 5000
``````

"@ -Encoding UTF8
