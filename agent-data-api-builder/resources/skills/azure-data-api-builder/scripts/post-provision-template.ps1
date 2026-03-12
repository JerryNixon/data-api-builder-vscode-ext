# Template: post-provision hook for azd
# Intended location when used: <quickstart>/azure-infra/post-provision.ps1
# Adapted from quickstart1; replace env var names only if your Bicep outputs differ.

$ErrorActionPreference = "Stop"

$resourceGroup    = $env:AZURE_RESOURCE_GROUP
$sqlServerName    = $env:AZURE_SQL_SERVER_NAME
$sqlServerFqdn    = $env:AZURE_SQL_SERVER_FQDN
$sqlDb            = $env:AZURE_SQL_DATABASE
$sqlAdminUser     = $env:AZURE_SQL_ADMIN_USER
$sqlAdminPassword = $env:AZURE_SQL_ADMIN_PASSWORD
$acrName          = $env:AZURE_ACR_NAME
$dabAppName       = $env:AZURE_CONTAINER_APP_API_NAME
$dabFqdn          = $env:AZURE_CONTAINER_APP_API_FQDN
$webAppName       = $env:AZURE_WEB_APP_NAME
$webFqdn          = $env:AZURE_WEB_APP_FQDN

$sqlConn = "Server=tcp:$sqlServerFqdn,1433;Database=$sqlDb;User Id=$sqlAdminUser;Password=$sqlAdminPassword;Encrypt=true;TrustServerCertificate=true"

# 1) Add deployer client IP to SQL firewall
$myIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
az sql server firewall-rule create --resource-group $resourceGroup --server $sqlServerName --name "azd-deploy-client" --start-ip-address $myIp --end-ip-address $myIp 2>$null | Out-Null

# 2) Build and publish dacpac

dotnet build database/database.sqlproj -c Release
if ($LASTEXITCODE -ne 0) { throw "Database build failed" }

sqlpackage /Action:Publish /SourceFile:database/bin/Release/database.dacpac /TargetConnectionString:"$sqlConn" /p:BlockOnPossibleDataLoss=false
if ($LASTEXITCODE -ne 0) { throw "Schema deployment failed" }

# 3) Build and push DAB image with CORS replacement
$apiDeployDir = "api-deploy-temp"
Copy-Item -Path "data-api" -Destination $apiDeployDir -Recurse -Force
$webOrigin = "https://$webFqdn"
$dabConfig = Get-Content -Path "$apiDeployDir/dab-config.json" -Raw
$dabConfig = $dabConfig.Replace("__WEB_URL_AZURE__", $webOrigin)
$dabConfig | Out-File -FilePath "$apiDeployDir/dab-config.json" -Encoding utf8 -Force

az acr build --registry $acrName --image dab-api:latest --file "$apiDeployDir/Dockerfile" $apiDeployDir/ | Out-Null
Remove-Item $apiDeployDir -Recurse -Force

az containerapp update --name $dabAppName --resource-group $resourceGroup --image "$acrName.azurecr.io/dab-api:latest" | Out-Null

# 4) Optional: build/update web app image (if present)
if (-not [string]::IsNullOrWhiteSpace($webAppName)) {
  $deployDir = "web-deploy-temp"
  Copy-Item -Path "web-app" -Destination $deployDir -Recurse -Force
  $configContent = @"
const CONFIG = {
    apiUrlLocal: 'http://localhost:5000',
    apiUrlAzure: 'https://$dabFqdn'
};
"@
  $configContent | Out-File -FilePath "$deployDir/config.js" -Encoding utf8 -Force
  az acr build --registry $acrName --image web-app:latest --file "$deployDir/Dockerfile" $deployDir/ | Out-Null
  Remove-Item $deployDir -Recurse -Force
  az containerapp update --name $webAppName --resource-group $resourceGroup --image "$acrName.azurecr.io/web-app:latest" | Out-Null
}

Write-Host "Post-provision complete" -ForegroundColor Green
