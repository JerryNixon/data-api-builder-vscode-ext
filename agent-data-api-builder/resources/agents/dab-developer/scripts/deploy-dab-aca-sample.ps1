# ============================================
# SAMPLE: Deploy Data API Builder to Azure Container Apps
# ============================================
#
# PURPOSE: This is a REFERENCE SCRIPT for the DAB Developer Agent.
# It provides a complete, working example of deploying DAB to Azure Container Apps.
#
# IMPORTANT NOTES:
# ----------------
# 1. This script is provided as a GUIDE - you do NOT need to run this script directly
# 2. PowerShell is NOT required - these commands can be adapted to:
#    - Azure CLI in Bash/Zsh
#    - Azure Portal
#    - Terraform/Bicep/ARM templates
#    - GitHub Actions or Azure DevOps pipelines
#
# 3. The agent can use this script to:
#    - Provide code snippets when users ask about deployment
#    - Explain the deployment process step-by-step
#    - Adapt commands for the user's preferred shell/platform
#    - Troubleshoot deployment issues
#
# PREREQUISITES:
# --------------
# - Azure CLI installed (https://aka.ms/installazurecliwindows)
# - DAB CLI installed (dotnet tool install --global Microsoft.DataApiBuilder)
# - SQLCMD installed for Azure SQL (winget install sqlcmd)
# - Active Azure subscription
# - A valid dab-config.json file in the current directory
#
# ============================================

# ============================================
# Variables - UPDATE THESE VALUES
# ============================================

# Resource naming (random suffix ensures uniqueness)
$RESOURCE_GROUP = "rg-dab-demo"
$LOCATION = "centralus"
$RANDOM_SUFFIX = Get-Random -Minimum 1000 -Maximum 9999

# Azure SQL resources
$SQL_SERVER = "sql-dab-$RANDOM_SUFFIX"
$SQL_DATABASE = "ProductsDB"
$SQL_ADMIN = "sqladmin"
$SQL_PASSWORD = "P@ssw0rd$(Get-Random -Minimum 100 -Maximum 999)!"  # Generate a unique password

# Container resources
$ACR_NAME = "acrdab$RANDOM_SUFFIX"
$CONTAINERAPP_ENV = "dab-aca-env"
$CONTAINERAPP_NAME = "dab-api"

# DAB configuration
$DAB_VERSION = "1.2.10"  # Update to latest stable version
$DAB_CONFIG_PATH = "./dab-config.json"

# ============================================
# Sign in to Azure
# ============================================
Write-Host "Step 0: Authenticating with Azure..." -ForegroundColor Cyan

# Interactive login - replace with your tenant/subscription if known
az login --only-show-errors
# az login --tenant "<your-tenant-id>"  # Uncomment if you know your tenant
# az account set --subscription "<your-subscription-id>"  # Uncomment to set specific subscription

# Verify logged in
$ACCOUNT = az account show --query name --output tsv
if (-not $ACCOUNT) {
    Write-Error "Failed to authenticate with Azure. Please run 'az login' manually."
    exit 1
}
Write-Host "Authenticated to subscription: $ACCOUNT" -ForegroundColor Green

# ============================================
# Step 1: Check Prerequisites
# ============================================
Write-Host "`nStep 1: Checking prerequisites..." -ForegroundColor Cyan

# Check Azure CLI
$AZ_VERSION = az --version 2>$null | Select-Object -First 1
if (-not $AZ_VERSION) {
    Write-Error "Azure CLI not found. Install from: https://aka.ms/installazurecliwindows"
    exit 1
}
Write-Host "  Azure CLI: $AZ_VERSION" -ForegroundColor Green

# Check DAB CLI
$DAB_CHECK = dab --version 2>$null
if (-not $DAB_CHECK) {
    Write-Warning "DAB CLI not found. Installing..."
    dotnet tool install --global Microsoft.DataApiBuilder
}
Write-Host "  DAB CLI: $(dab --version)" -ForegroundColor Green

# Check for dab-config.json
if (-not (Test-Path $DAB_CONFIG_PATH)) {
    Write-Error "dab-config.json not found at $DAB_CONFIG_PATH"
    Write-Host "Create one using: dab init --database-type mssql --connection-string `"@env('MSSQL_CONNECTION_STRING')`""
    exit 1
}
Write-Host "  Config file: Found" -ForegroundColor Green

# Validate DAB config
Write-Host "  Validating DAB config..." -ForegroundColor Yellow
dab validate --config $DAB_CONFIG_PATH
if ($LASTEXITCODE -ne 0) {
    Write-Error "DAB config validation failed. Fix errors before deploying."
    exit 1
}
Write-Host "  Config validation: Passed" -ForegroundColor Green

# ============================================
# Step 2: Create Resource Group
# ============================================
Write-Host "`nStep 2: Creating resource group..." -ForegroundColor Cyan

# Check if resource group exists and create unique name if needed
$RG_COUNTER = 0
$ORIGINAL_RG = $RESOURCE_GROUP
while ($true) {
    $RG_EXISTS = az group exists --name $RESOURCE_GROUP
    if ($RG_EXISTS -eq "false") {
        break
    }
    $RG_COUNTER++
    $RESOURCE_GROUP = "$ORIGINAL_RG-$RG_COUNTER"
    Write-Host "  Resource group exists, trying: $RESOURCE_GROUP" -ForegroundColor Yellow
}

az group create --name $RESOURCE_GROUP --location $LOCATION --output none
Write-Host "  Created resource group: $RESOURCE_GROUP" -ForegroundColor Green

# ============================================
# Step 3: Create Azure SQL Database
# ============================================
Write-Host "`nStep 3: Creating Azure SQL Database..." -ForegroundColor Cyan
Write-Host "  (This step takes 3-5 minutes)" -ForegroundColor Yellow

# Create SQL Server
az sql server create `
    --name $SQL_SERVER `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --admin-user $SQL_ADMIN `
    --admin-password $SQL_PASSWORD `
    --output none

Write-Host "  SQL Server created: $SQL_SERVER" -ForegroundColor Green

# Configure firewall for Azure services
az sql server firewall-rule create `
    --resource-group $RESOURCE_GROUP `
    --server $SQL_SERVER `
    --name AllowAzureServices `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0 `
    --output none

# Add current client IP to firewall for local access
try {
    $MY_IP = (Invoke-RestMethod -Uri 'https://api.ipify.org?format=text' -TimeoutSec 10)
    az sql server firewall-rule create `
        --resource-group $RESOURCE_GROUP `
        --server $SQL_SERVER `
        --name AllowMyIP `
        --start-ip-address $MY_IP `
        --end-ip-address $MY_IP `
        --output none
    Write-Host "  Firewall configured for IP: $MY_IP" -ForegroundColor Green
} catch {
    Write-Warning "  Could not add client IP to firewall. Add manually if needed."
}

# Create database
az sql db create `
    --resource-group $RESOURCE_GROUP `
    --server $SQL_SERVER `
    --name $SQL_DATABASE `
    --service-objective S0 `
    --output none

Write-Host "  Database created: $SQL_DATABASE" -ForegroundColor Green

# Build connection string
$SQL_FQDN = "$SQL_SERVER.database.windows.net"
$CONNECTION_STRING = "Server=tcp:$SQL_FQDN,1433;Database=$SQL_DATABASE;User ID=$SQL_ADMIN;Password=$SQL_PASSWORD;Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;"

# ============================================
# Step 4: Create Sample Database Schema
# ============================================
Write-Host "`nStep 4: Creating sample database schema..." -ForegroundColor Cyan

$SQL_SCRIPT = @"
-- Sample Products table for DAB demo
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
BEGIN
    CREATE TABLE dbo.Products (
        ProductID INT NOT NULL PRIMARY KEY IDENTITY(1,1),
        ProductName NVARCHAR(100) NOT NULL,
        Category NVARCHAR(50) NOT NULL,
        UnitPrice DECIMAL(10,2) NOT NULL,
        UnitsInStock INT NOT NULL,
        Discontinued BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL
    );

    INSERT INTO dbo.Products (ProductName, Category, UnitPrice, UnitsInStock, Discontinued) VALUES
    ('Laptop Pro 15', 'Electronics', 1299.99, 45, 0),
    ('Wireless Mouse', 'Electronics', 29.99, 150, 0),
    ('USB-C Hub', 'Electronics', 49.99, 80, 0),
    ('Office Chair', 'Furniture', 249.99, 30, 0),
    ('Standing Desk', 'Furniture', 599.99, 15, 0),
    ('Desk Lamp', 'Furniture', 45.99, 100, 0),
    ('Coffee Maker', 'Appliances', 89.99, 60, 0),
    ('Blender Pro', 'Appliances', 129.99, 40, 0),
    ('Air Purifier', 'Appliances', 199.99, 25, 0),
    ('Notebook Set', 'Office Supplies', 12.99, 200, 0);
    
    PRINT 'Products table created with 10 sample records';
END
ELSE
BEGIN
    PRINT 'Products table already exists';
END
"@

try {
    $SQL_SCRIPT | Out-File -FilePath "create-schema.sql" -Encoding utf8
    sqlcmd -S $SQL_FQDN -d $SQL_DATABASE -U $SQL_ADMIN -P $SQL_PASSWORD -i "create-schema.sql" -b
    Remove-Item "create-schema.sql" -ErrorAction SilentlyContinue
    Write-Host "  Database schema created successfully!" -ForegroundColor Green
} catch {
    Write-Warning "  Could not create schema automatically. SQLCMD may not be installed."
    Write-Host "  You can create the schema manually using Azure Data Studio or SSMS."
    $SQL_SCRIPT | Out-File -FilePath "create-schema-manual.sql" -Encoding utf8
    Write-Host "  SQL script saved to: create-schema-manual.sql" -ForegroundColor Yellow
}

# ============================================
# Step 5: Configure DAB (if not already configured)
# ============================================
Write-Host "`nStep 5: Verifying DAB configuration..." -ForegroundColor Cyan

# Check if config uses environment variable for connection string
$CONFIG_CONTENT = Get-Content $DAB_CONFIG_PATH -Raw
if ($CONFIG_CONTENT -notmatch "@env\('") {
    Write-Warning "  Config does not use environment variables for connection string."
    Write-Host "  Consider using @env('MSSQL_CONNECTION_STRING') for security." -ForegroundColor Yellow
}

# Ensure connection string references environment variable
# This is the recommended pattern for production deployments
Write-Host "  DAB configuration verified" -ForegroundColor Green

# ============================================
# Step 6: Create Azure Container Registry
# ============================================
Write-Host "`nStep 6: Creating Azure Container Registry..." -ForegroundColor Cyan

az acr create `
    --resource-group $RESOURCE_GROUP `
    --name $ACR_NAME `
    --sku Basic `
    --admin-enabled true `
    --output none

$ACR_LOGIN_SERVER = az acr show --name $ACR_NAME --query loginServer --output tsv
Write-Host "  ACR created: $ACR_LOGIN_SERVER" -ForegroundColor Green

# ============================================
# Step 7: Build and Push Docker Image
# ============================================
Write-Host "`nStep 7: Building and pushing Docker image..." -ForegroundColor Cyan

# Create Dockerfile if it doesn't exist
$DOCKERFILE_CONTENT = @"
# Data API Builder Docker Image
# This Dockerfile creates a containerized DAB instance with baked-in configuration

ARG DAB_VERSION=$DAB_VERSION
FROM mcr.microsoft.com/azure-databases/data-api-builder:`${DAB_VERSION}

# Copy the DAB configuration file
COPY dab-config.json /App/dab-config.json

# Make config read-only for security
RUN chmod 444 /App/dab-config.json || true

# DAB listens on port 5000 by default
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5000/api || exit 1
"@

$DOCKERFILE_CONTENT | Out-File -FilePath "Dockerfile" -Encoding utf8
Write-Host "  Dockerfile created" -ForegroundColor Green

# Build image using ACR Tasks (no local Docker required)
$IMAGE_TAG = "dab-api:$(Get-Date -Format 'yyyyMMddHHmmss')"
az acr build `
    --registry $ACR_NAME `
    --image $IMAGE_TAG `
    --file ./Dockerfile `
    . `
    --output none

Write-Host "  Image built and pushed: $ACR_LOGIN_SERVER/$IMAGE_TAG" -ForegroundColor Green

# ============================================
# Step 8: Create Container Apps Environment
# ============================================
Write-Host "`nStep 8: Creating Container Apps environment..." -ForegroundColor Cyan
Write-Host "  (This step takes 1-2 minutes)" -ForegroundColor Yellow

# Create Log Analytics workspace (required for Container Apps)
$LOG_ANALYTICS = "log-dab-$RANDOM_SUFFIX"
az monitor log-analytics workspace create `
    --resource-group $RESOURCE_GROUP `
    --workspace-name $LOG_ANALYTICS `
    --output none

$LOG_ANALYTICS_ID = az monitor log-analytics workspace show `
    --resource-group $RESOURCE_GROUP `
    --workspace-name $LOG_ANALYTICS `
    --query customerId --output tsv

$LOG_ANALYTICS_KEY = az monitor log-analytics workspace get-shared-keys `
    --resource-group $RESOURCE_GROUP `
    --workspace-name $LOG_ANALYTICS `
    --query primarySharedKey --output tsv

# Create Container Apps environment
az containerapp env create `
    --name $CONTAINERAPP_ENV `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --logs-workspace-id $LOG_ANALYTICS_ID `
    --logs-workspace-key $LOG_ANALYTICS_KEY `
    --output none

Write-Host "  Container Apps environment created: $CONTAINERAPP_ENV" -ForegroundColor Green

# ============================================
# Step 9: Deploy Container App
# ============================================
Write-Host "`nStep 9: Deploying Container App..." -ForegroundColor Cyan

# Get ACR credentials
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query username --output tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" --output tsv

# Create Container App with system-assigned managed identity
az containerapp create `
    --name $CONTAINERAPP_NAME `
    --resource-group $RESOURCE_GROUP `
    --environment $CONTAINERAPP_ENV `
    --image "$ACR_LOGIN_SERVER/$IMAGE_TAG" `
    --registry-server $ACR_LOGIN_SERVER `
    --registry-username $ACR_USERNAME `
    --registry-password $ACR_PASSWORD `
    --target-port 5000 `
    --ingress external `
    --min-replicas 1 `
    --max-replicas 3 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --secrets "mssql-connection-string=$CONNECTION_STRING" `
    --env-vars "MSSQL_CONNECTION_STRING=secretref:mssql-connection-string" `
    --system-assigned `
    --output none

Write-Host "  Container App deployed: $CONTAINERAPP_NAME" -ForegroundColor Green

# ============================================
# Step 10: Verify Deployment
# ============================================
Write-Host "`nStep 10: Verifying deployment..." -ForegroundColor Cyan

# Get the container app URL
$CONTAINER_URL = az containerapp show `
    --name $CONTAINERAPP_NAME `
    --resource-group $RESOURCE_GROUP `
    --query "properties.configuration.ingress.fqdn" `
    --output tsv

$API_URL = "https://$CONTAINER_URL"

# Wait for container to be ready and perform health check
Write-Host "  Waiting for container to start..." -ForegroundColor Yellow
$maxRetries = 12
$retryCount = 0
$success = $false

while ($retryCount -lt $maxRetries -and -not $success) {
    Start-Sleep -Seconds 10
    try {
        $response = Invoke-WebRequest -Uri "$API_URL/api" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            $success = $true
            Write-Host "  Health check passed!" -ForegroundColor Green
        }
    } catch {
        $retryCount++
        Write-Host "  Waiting... ($retryCount/$maxRetries)" -ForegroundColor Yellow
    }
}

if (-not $success) {
    Write-Warning "  Container may still be starting. Check logs with:"
    Write-Host "  az containerapp logs show --name $CONTAINERAPP_NAME --resource-group $RESOURCE_GROUP"
}

# Check restart count
$RESTART_COUNT = az containerapp replica list `
    --name $CONTAINERAPP_NAME `
    --resource-group $RESOURCE_GROUP `
    --query "[0].properties.containers[0].restartCount" `
    --output tsv 2>$null

if ($RESTART_COUNT -and [int]$RESTART_COUNT -gt 0) {
    Write-Warning "  Container has restarted $RESTART_COUNT times. Check logs for errors."
}

# ============================================
# Output Summary
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resource Group:     $RESOURCE_GROUP" -ForegroundColor White
Write-Host "SQL Server:         $SQL_FQDN" -ForegroundColor White
Write-Host "SQL Database:       $SQL_DATABASE" -ForegroundColor White
Write-Host "Container Registry: $ACR_LOGIN_SERVER" -ForegroundColor White
Write-Host "Container App:      $CONTAINERAPP_NAME" -ForegroundColor White
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Cyan
Write-Host "  Base URL:     $API_URL" -ForegroundColor Yellow
Write-Host "  REST API:     $API_URL/api/<entity>" -ForegroundColor Yellow
Write-Host "  GraphQL:      $API_URL/graphql" -ForegroundColor Yellow
Write-Host "  Health:       $API_URL/api" -ForegroundColor Yellow
Write-Host ""
Write-Host "Example Queries:" -ForegroundColor Cyan
Write-Host "  curl $API_URL/api/Products" -ForegroundColor Gray
Write-Host "  curl '$API_URL/api/Products?`$filter=Category eq ''Electronics'''" -ForegroundColor Gray
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Cyan
Write-Host "  View logs:    az containerapp logs show --name $CONTAINERAPP_NAME --resource-group $RESOURCE_GROUP" -ForegroundColor Gray
Write-Host "  Scale:        az containerapp update --name $CONTAINERAPP_NAME --resource-group $RESOURCE_GROUP --min-replicas 0 --max-replicas 5" -ForegroundColor Gray
Write-Host "  Delete all:   az group delete --name $RESOURCE_GROUP --yes" -ForegroundColor Gray
Write-Host ""

# Save deployment info for reference
$DEPLOYMENT_INFO = @{
    ResourceGroup = $RESOURCE_GROUP
    Location = $LOCATION
    SqlServer = $SQL_FQDN
    SqlDatabase = $SQL_DATABASE
    SqlAdmin = $SQL_ADMIN
    ContainerRegistry = $ACR_LOGIN_SERVER
    ContainerApp = $CONTAINERAPP_NAME
    ApiUrl = $API_URL
    DeployedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

$DEPLOYMENT_INFO | ConvertTo-Json | Out-File -FilePath "deployment-info.json" -Encoding utf8
Write-Host "Deployment details saved to: deployment-info.json" -ForegroundColor Green
