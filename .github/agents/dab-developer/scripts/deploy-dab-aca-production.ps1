# ============================================
# PRODUCTION: Deploy Data API Builder to Azure Container Apps
# ============================================
#
# PURPOSE: This is a PRODUCTION-GRADE deployment script for the DAB Developer Agent.
# It includes comprehensive error handling, retry logic, managed identity support,
# and best practices for enterprise deployments.
#
# IMPORTANT NOTES:
# ----------------
# 1. This script is provided as a REFERENCE GUIDE - you do NOT need to run it directly
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
#    - Demonstrate production best practices
#
# PREREQUISITES:
# --------------
# - Azure CLI installed (https://aka.ms/installazurecliwindows)
# - DAB CLI installed (dotnet tool install --global Microsoft.DataApiBuilder)
# - SQLCMD installed for Azure SQL (winget install sqlcmd)
# - Active Azure subscription
# - A valid dab-config.json file in the current directory
# - A database.sql file with your schema
# - A Dockerfile (see Dockerfile.sample)
#
# KEY FEATURES:
# -------------
# - Azure AD-only authentication (no SQL passwords)
# - Managed Identity for container-to-database connectivity
# - Automatic retry logic for transient failures
# - Resource name validation and sanitization
# - Comprehensive logging
# - Automatic cleanup on failure (optional)
# - SQL Commander deployment for database management
#
# PARAMETERS:
# -----------
#   -Region: Azure region for deployment (default: westus2)
#   -DatabasePath: Path to SQL database file (default: ./database.sql)
#   -ConfigPath: Path to DAB config file (default: ./dab-config.json)
#   -ResourceGroupName: Custom name for resource group
#   -SqlServerName: Custom name for SQL Server
#   -SqlDatabaseName: Custom name for SQL Database
#   -ContainerAppName: Custom name for Container App
#   -AcrName: Custom name for Azure Container Registry
#   -NoSqlCommander: Skip SQL Commander deployment
#   -NoCleanup: Preserve resource group on failure for debugging
#
# EXAMPLES:
# ---------
#   .\deploy-dab-aca-production.ps1
#   .\deploy-dab-aca-production.ps1 -Region eastus
#   .\deploy-dab-aca-production.ps1 -NoSqlCommander -NoCleanup
#
# ============================================

param(
    [string]$Region = "westus2",
    
    [string]$DatabasePath = "./database.sql",
    
    [string]$ConfigPath = "./dab-config.json",
    
    [string]$ResourceGroupName = "",
    
    [string]$SqlServerName = "",
    
    [string]$SqlDatabaseName = "",
    
    [string]$ContainerAppName = "",
    
    [string]$AcrName = "",
    
    [string]$LogAnalyticsName = "",
    
    [string]$ContainerEnvironmentName = "",
    
    [string]$SqlCommanderName = "",
    
    [switch]$NoSqlCommander,
    
    [switch]$NoCleanup,
    
    [Parameter(ValueFromRemainingArguments)]
    [string[]]$UnknownArgs
)

# ============================================
# SCRIPT CONFIGURATION
# ============================================

$ScriptVersion = "0.7.0"
$MinimumDabVersion = "1.7.81-rc"
$DockerDabVersion = $MinimumDabVersion

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$startTime = Get-Date
$runTimestamp = Get-Date -Format "yyyyMMddHHmmss"

# CLI command log for debugging
$script:CliLog = Join-Path $PSScriptRoot "$runTimestamp.log"
"[$(Get-Date -Format o)] CLI command log - version $ScriptVersion" | Out-File $script:CliLog

# Configuration constants
$Config = @{
    SqlRetryAttempts = 12
    SqlRetryBaseDelaySec = 20
    PropagationWaitSec = 30
    LogRetentionDays = 90
    ContainerCpu = 0.5
    ContainerMemory = "1.0Gi"
}

# ============================================
# HELPER FUNCTIONS
# ============================================

function OK { 
    param($r, $msg) 
    if($r.ExitCode -ne 0) { 
        throw "$msg`n$($r.Text)" 
    } 
}

function Invoke-AzCli {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    $cmd = "az " + ($Arguments -join ' ')
    $output = & az @Arguments 2>&1
    $exitCode = $global:LASTEXITCODE
    $text = $output | Out-String

    $timestamp = Get-Date -Format o
    $tag = if ($exitCode -eq 0) { "[OK]" } else { "[ERR]" }
    Add-Content -Path $script:CliLog -Value "$timestamp $tag $cmd"
    Add-Content -Path $script:CliLog -Value $text

    [pscustomobject]@{
        ExitCode    = $exitCode
        Output      = $output
        Text        = $text
        TrimmedText = $text.Trim()
    }
}

function Write-StepStatus {
    param(
        [string]$Step,
        
        [Parameter(Mandatory)]
        [ValidateSet('Started','Retrying','Success','Error','Info')]
        [string]$Status,
        
        [string]$Detail = ''
    )

    $timestamp = (Get-Date).ToString('HH:mm:ss')

    switch ($Status) {
        'Started' {
            if ($Step) {
                Write-Host ""
                Write-Host $Step -ForegroundColor Cyan
            }
            Write-Host "[Started] (est $Detail at $timestamp)" -ForegroundColor Yellow
        }
        'Retrying' {
            Write-Host "[Retrying] ($Detail)" -ForegroundColor DarkYellow
        }
        'Success' {
            Write-Host "[Success] ($Detail)" -ForegroundColor Green
        }
        'Error' {
            Write-Host "[Error] $Detail" -ForegroundColor Red
        }
        'Info' {
            Write-Host "[Info] $Detail" -ForegroundColor Gray
        }
    }
}

function Invoke-RetryOperation {
    <#
    .SYNOPSIS
    Unified retry helper with configurable backoff strategies.
    
    .DESCRIPTION
    Executes a scriptblock with automatic retry logic. Supports both count-based 
    and time-based termination, exponential backoff with optional jitter.
    #>
    param(
        [Parameter(Mandatory)]
        [scriptblock]$ScriptBlock,
        
        [int]$MaxRetries = 0,
        [int]$TimeoutSeconds = 0,
        [int]$BaseDelaySeconds = 10,
        [switch]$UseExponentialBackoff,
        [switch]$UseJitter,
        [int]$MaxDelaySeconds = 120,
        [string]$RetryMessage = "attempt {attempt}/{max}, wait {delay}s",
        [string]$OperationName = "operation"
    )
    
    if ($MaxRetries -eq 0 -and $TimeoutSeconds -eq 0) {
        throw "Must specify either MaxRetries or TimeoutSeconds"
    }
    if ($MaxRetries -gt 0 -and $TimeoutSeconds -gt 0) {
        throw "Cannot specify both MaxRetries and TimeoutSeconds"
    }
    
    $attempt = 0
    $deadline = if ($TimeoutSeconds -gt 0) { (Get-Date).AddSeconds($TimeoutSeconds) } else { $null }
    
    while ($true) {
        $attempt++
        
        if ($MaxRetries -gt 0 -and $attempt -gt $MaxRetries) {
            throw "Operation '$OperationName' failed after $MaxRetries attempts"
        }
        if ($deadline -and (Get-Date) -ge $deadline) {
            throw "Operation '$OperationName' timed out after $TimeoutSeconds seconds"
        }
        
        try {
            $result = & $ScriptBlock
            if ($result -eq $true) {
                return $true
            }
        } catch {
            # Continue retrying
        }
        
        if ($MaxRetries -gt 0 -and $attempt -ge $MaxRetries) {
            break
        }
        if ($deadline -and (Get-Date) -ge $deadline) {
            break
        }
        
        if ($UseExponentialBackoff) {
            $delay = [Math]::Min($MaxDelaySeconds, $BaseDelaySeconds * [Math]::Pow(2, ($attempt - 1)))
        } else {
            $delay = $BaseDelaySeconds
        }
        
        if ($UseJitter) {
            $delay += (Get-Random -Minimum 0 -Maximum 4)
        }
        
        $delay = [int][Math]::Round($delay)
        
        $message = $RetryMessage
        $message = $message -replace '\{attempt\}', $attempt
        $message = $message -replace '\{max\}', $(if ($MaxRetries -gt 0) { $MaxRetries } else { "∞" })
        $message = $message -replace '\{delay\}', $delay
        
        Write-StepStatus -Status Retrying -Detail $message
        
        Start-Sleep -Seconds $delay
    }
    
    return $false
}

function Get-MI-DisplayName {
    <#
    .SYNOPSIS
    Retrieves the display name of a managed identity with retry logic.
    
    .DESCRIPTION
    Azure AD propagation can take time. This function retries until the
    managed identity's display name is available.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$PrincipalId,
        
        [int]$MaxRetries = 20,
        [int]$BaseDelaySeconds = 6
    )
    
    $result = @{
        DisplayName = $null
        LastError = $null
    }
    
    $success = Invoke-RetryOperation `
        -ScriptBlock {
            try {
                $dn = az ad sp show --id $PrincipalId --query displayName -o tsv 2>$null
                if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($dn)) {
                    $result.DisplayName = $dn.Trim()
                    return $true
                }
                $result.LastError = "displayName not found yet"
            } catch {
                $result.LastError = $_.Exception.Message
            }
            return $false
        } `
        -MaxRetries $MaxRetries `
        -BaseDelaySeconds $BaseDelaySeconds `
        -UseExponentialBackoff `
        -UseJitter `
        -MaxDelaySeconds 120 `
        -RetryMessage "service principal propagation; attempt {attempt}/{max}, wait {delay}s" `
        -OperationName "Get-MI-DisplayName"
    
    if ($success) {
        return $result.DisplayName
    }
    
    throw "Unable to resolve managed identity display name for SP '$PrincipalId' after $MaxRetries attempts. Last error: $($result.LastError)"
}

function Assert-AzureResourceName {
    <#
    .SYNOPSIS
    Validates and sanitizes Azure resource names according to Azure naming rules.
    
    .DESCRIPTION
    Applies resource-type-specific naming rules including:
    - Casing requirements (lowercase for SQL Server, Container Apps, ACR)
    - Character restrictions (alphanumeric only for ACR)
    - Length constraints (different limits per resource type)
    - Pattern validation (no double hyphens, no starting/ending with hyphen)
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Name,
        
        [Parameter(Mandatory)]
        [ValidateSet(
            'ResourceGroup',
            'SqlServer',
            'Database',
            'ContainerApp',
            'ContainerEnvironment',
            'LogAnalytics',
            'ACR'
        )]
        [string]$ResourceType
    )
    
    $rules = @{
        'ResourceGroup' = @{
            MinLength = 1; MaxLength = 90
            AllowedChars = '^[a-zA-Z0-9._()-]+$'
            RequireLowercase = $false; StripNonAlphanumeric = $false
            NoDoubleHyphen = $false; NoTrailingHyphen = $false; NoLeadingHyphen = $false
        }
        'SqlServer' = @{
            MinLength = 1; MaxLength = 63
            AllowedChars = '^[a-z0-9-]+$'
            RequireLowercase = $true; StripNonAlphanumeric = $false
            NoDoubleHyphen = $true; NoTrailingHyphen = $true; NoLeadingHyphen = $true
        }
        'Database' = @{
            MinLength = 1; MaxLength = 128
            AllowedChars = '^[^<>*%&:\\\/?]+$'
            RequireLowercase = $false; StripNonAlphanumeric = $false
            NoDoubleHyphen = $false; NoTrailingHyphen = $false; NoLeadingHyphen = $false
        }
        'ContainerApp' = @{
            MinLength = 2; MaxLength = 32
            AllowedChars = '^[a-z0-9-]+$'
            RequireLowercase = $true; StripNonAlphanumeric = $false
            NoDoubleHyphen = $true; NoTrailingHyphen = $true; NoLeadingHyphen = $true
        }
        'ContainerEnvironment' = @{
            MinLength = 1; MaxLength = 60
            AllowedChars = '^[a-zA-Z0-9-]+$'
            RequireLowercase = $false; StripNonAlphanumeric = $false
            NoDoubleHyphen = $true; NoTrailingHyphen = $true; NoLeadingHyphen = $true
        }
        'LogAnalytics' = @{
            MinLength = 4; MaxLength = 63
            AllowedChars = '^[a-zA-Z0-9-]+$'
            RequireLowercase = $false; StripNonAlphanumeric = $false
            NoDoubleHyphen = $true; NoTrailingHyphen = $true; NoLeadingHyphen = $true
        }
        'ACR' = @{
            MinLength = 5; MaxLength = 50
            AllowedChars = '^[a-z0-9]+$'
            RequireLowercase = $true; StripNonAlphanumeric = $true
            NoDoubleHyphen = $false; NoTrailingHyphen = $false; NoLeadingHyphen = $false
        }
    }
    
    $rule = $rules[$ResourceType]
    $sanitizedName = $Name
    
    if ($rule.RequireLowercase) {
        $sanitizedName = $sanitizedName.ToLower()
    }
    
    if ($rule.StripNonAlphanumeric) {
        $sanitizedName = $sanitizedName -replace '[^a-zA-Z0-9]', ''
        if ($rule.RequireLowercase) {
            $sanitizedName = $sanitizedName.ToLower()
        }
    }
    
    if ($rule.NoDoubleHyphen) {
        while ($sanitizedName -match '--') {
            $sanitizedName = $sanitizedName -replace '--', '-'
        }
    }
    
    if ($rule.NoLeadingHyphen) {
        $sanitizedName = $sanitizedName.TrimStart('-')
    }
    
    if ($rule.NoTrailingHyphen) {
        $sanitizedName = $sanitizedName.TrimEnd('-')
    }
    
    if ($sanitizedName.Length -lt $rule.MinLength) {
        throw "Resource name '$Name' for $ResourceType is too short (min: $($rule.MinLength) chars)"
    }
    
    if ($sanitizedName.Length -gt $rule.MaxLength) {
        $sanitizedName = $sanitizedName.Substring(0, $rule.MaxLength)
        if ($rule.NoTrailingHyphen) {
            $sanitizedName = $sanitizedName.TrimEnd('-')
        }
    }
    
    if ($sanitizedName -notmatch $rule.AllowedChars) {
        throw "Resource name '$sanitizedName' for $ResourceType contains invalid characters"
    }
    
    return $sanitizedName
}

function Write-DeploymentSummary {
    param(
        $ResourceGroup, $Region, $SqlServer, $SqlDatabase, $Container, $ContainerUrl,
        $LogAnalytics, $Environment, $CurrentUser, $DatabaseType, $TotalTime, 
        $SqlServerFqdn, $SqlCommander, $SqlCommanderUrl
    )
    
    $subscriptionIdResult = Invoke-AzCli -Arguments @('account', 'show', '--query', 'id', '--output', 'tsv')
    OK $subscriptionIdResult "Failed to retrieve subscription id"
    $subscriptionId = $subscriptionIdResult.TrimmedText
    
    Write-Host "`n================================================================================" -ForegroundColor Green
    Write-Host "  ✓ DEPLOYMENT SUCCESSFUL ($TotalTime)" -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor Green
    
    Write-Host "`nDEPLOYED RESOURCES" -ForegroundColor Cyan
    Write-Host "  Resource Group:    $ResourceGroup"
    Write-Host "  Region:            $Region"
    Write-Host "  SQL Server:        $SqlServer"
    Write-Host "  Database:          $SqlDatabase ($DatabaseType)"
    Write-Host "  Container App:     $Container"
    
    if ($SqlCommander -and $SqlCommanderUrl -ne "Not deployed") {
        Write-Host "  SQL Commander:     $SqlCommander"
    }
    
    Write-Host "`nQUICK LINKS" -ForegroundColor Cyan
    Write-Host "  Portal:            https://portal.azure.com/#@/resource/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup/overview"
    Write-Host "  Swagger:           $ContainerUrl/swagger"
    Write-Host "  GraphQL:           $ContainerUrl/graphql"
    Write-Host "  Health:            $ContainerUrl/health"
    
    if ($SqlCommander -and $SqlCommanderUrl -ne "Not deployed") {
        Write-Host "  SQL Commander:     $SqlCommanderUrl"
    }
    
    Write-Host "`n================================================================================" -ForegroundColor Green
}

# ============================================
# MAIN DEPLOYMENT LOGIC
# ============================================

# Validate unknown arguments
if ($UnknownArgs) {
    Write-Host "`nERROR: Unknown parameter(s) detected" -ForegroundColor Red
    foreach ($arg in $UnknownArgs) {
        Write-Host "  $arg" -ForegroundColor Red
    }
    exit 1
}

Write-Host "DAB Deployment Script v$ScriptVersion" -ForegroundColor Cyan
Write-Host ""

# ============================================
# PREREQUISITES CHECK
# ============================================

Write-Host "Checking prerequisites..." -ForegroundColor Cyan

# Check Azure CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "  Azure CLI: Not installed" -ForegroundColor Red
    Write-Host "  Install from: https://aka.ms/installazurecliwindows" -ForegroundColor Yellow
    throw "Azure CLI is not installed"
}
Write-Host "  Azure CLI: Installed" -ForegroundColor Green

# Check DAB CLI
if (-not (Get-Command dab -ErrorAction SilentlyContinue)) {
    Write-Host "  DAB CLI: Not installed" -ForegroundColor Red
    Write-Host "  Install: dotnet tool install -g Microsoft.DataApiBuilder" -ForegroundColor Yellow
    throw "DAB CLI is not installed"
}
Write-Host "  DAB CLI: Installed" -ForegroundColor Green

# Check SQLCMD
if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) {
    Write-Host "  sqlcmd: Not installed" -ForegroundColor Red
    Write-Host "  Install: winget install sqlcmd" -ForegroundColor Yellow
    throw "sqlcmd is not installed"
}
Write-Host "  sqlcmd: Installed" -ForegroundColor Green

# Check database.sql
if (-not (Test-Path $DatabasePath)) {
    Write-Host "  database.sql: Not found at $DatabasePath" -ForegroundColor Red
    throw "database.sql not found"
}
Write-Host "  database.sql: Found" -ForegroundColor Green

# Check dab-config.json
if (-not (Test-Path $ConfigPath)) {
    Write-Host "  dab-config.json: Not found at $ConfigPath" -ForegroundColor Red
    throw "dab-config.json not found"
}

# Validate dab-config.json uses environment variable
try {
    $dabConfig = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    $connectionStringRef = $dabConfig.'data-source'.'connection-string'
    $expectedRef = "@env('MSSQL_CONNECTION_STRING')"
    
    if ($connectionStringRef -ne $expectedRef) {
        Write-Host "  dab-config.json: Invalid connection string" -ForegroundColor Red
        Write-Host "  Expected: $expectedRef" -ForegroundColor Yellow
        Write-Host "  Found: $connectionStringRef" -ForegroundColor Red
        throw "dab-config.json must use @env('MSSQL_CONNECTION_STRING')"
    }
    Write-Host "  dab-config.json: Valid" -ForegroundColor Green
} catch {
    throw "Failed to validate dab-config.json: $($_.Exception.Message)"
}

# Check Dockerfile
if (-not (Test-Path "./Dockerfile")) {
    Write-Host "  Dockerfile: Not found" -ForegroundColor Red
    throw "Dockerfile not found"
}
Write-Host "  Dockerfile: Found" -ForegroundColor Green

Write-Host ""

# ============================================
# AZURE AUTHENTICATION
# ============================================

Write-Host "Authenticating to Azure..." -ForegroundColor Cyan

az login --output none 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Azure login failed"
}

$accountInfoResult = Invoke-AzCli -Arguments @('account', 'show', '--output', 'json')
OK $accountInfoResult "Failed to retrieve account information"

$accountInfo = $accountInfoResult.TrimmedText | ConvertFrom-Json
$currentSub = $accountInfo.name
$currentSubId = $accountInfo.id
$currentAccountUser = $accountInfo.user.name

Write-Host "Authenticated to: $currentSub" -ForegroundColor Green
Write-Host ""

# ============================================
# RESOURCE NAMING
# ============================================

$defaultPrefix = "dab-demo-"

if ([string]::IsNullOrWhiteSpace($ResourceGroupName)) {
    $ResourceGroupName = "${defaultPrefix}$runTimestamp"
}
if ([string]::IsNullOrWhiteSpace($SqlServerName)) {
    $SqlServerName = "${defaultPrefix}sql-$runTimestamp"
}
if ([string]::IsNullOrWhiteSpace($SqlDatabaseName)) {
    $SqlDatabaseName = "sql-database"
}
if ([string]::IsNullOrWhiteSpace($ContainerAppName)) {
    $ContainerAppName = "${defaultPrefix}container-$runTimestamp"
}
if ([string]::IsNullOrWhiteSpace($AcrName)) {
    $acrPrefix = ($defaultPrefix -replace '[^a-zA-Z0-9]', '').ToLower()
    $AcrName = "${acrPrefix}$runTimestamp".ToLower()
}
if ([string]::IsNullOrWhiteSpace($LogAnalyticsName)) {
    $LogAnalyticsName = "log-workspace"
}
if ([string]::IsNullOrWhiteSpace($ContainerEnvironmentName)) {
    $ContainerEnvironmentName = "aca-environment"
}
if ([string]::IsNullOrWhiteSpace($SqlCommanderName)) {
    $SqlCommanderName = "sql-commander-$runTimestamp"
}

# Sanitize all resource names
$rg = Assert-AzureResourceName -Name $ResourceGroupName -ResourceType 'ResourceGroup'
$sqlServer = Assert-AzureResourceName -Name $SqlServerName -ResourceType 'SqlServer'
$sqlDb = Assert-AzureResourceName -Name $SqlDatabaseName -ResourceType 'Database'
$container = Assert-AzureResourceName -Name $ContainerAppName -ResourceType 'ContainerApp'
$acrName = Assert-AzureResourceName -Name $AcrName -ResourceType 'ACR'
$logAnalytics = Assert-AzureResourceName -Name $LogAnalyticsName -ResourceType 'LogAnalytics'
$acaEnv = Assert-AzureResourceName -Name $ContainerEnvironmentName -ResourceType 'ContainerEnvironment'
$sqlCommander = Assert-AzureResourceName -Name $SqlCommanderName -ResourceType 'ContainerApp'

$commonTagValues = @('author=dab-demo', "version=$ScriptVersion")

# ============================================
# DEPLOYMENT EXECUTION
# ============================================

$estimatedFinishTime = (Get-Date).AddMinutes(8).ToString("HH:mm:ss")
Write-Host "Starting deployment. Estimated completion: ~$estimatedFinishTime" -ForegroundColor Cyan

try {
    # Step 1: Create Resource Group
    Write-StepStatus "Creating resource group" "Started" "5s"
    $rgArgs = @('group', 'create', '--name', $rg, '--location', $Region, '--tags') + $commonTagValues
    $rgResult = Invoke-AzCli -Arguments $rgArgs
    OK $rgResult "Failed to create resource group"
    Write-StepStatus "" "Success" $rg

    # Step 2: Get current Azure AD user
    Write-StepStatus "Getting current Azure AD user" "Started" "5s"
    $userInfoResult = Invoke-AzCli -Arguments @('ad', 'signed-in-user', 'show', '--query', '{id:id,upn:userPrincipalName}', '--output', 'json')
    OK $userInfoResult "Failed to identify Azure AD user"
    $userInfo = $userInfoResult.TrimmedText | ConvertFrom-Json
    $currentUser = $userInfo.id
    $currentUserName = $userInfo.upn
    Write-StepStatus "" "Success" $currentUserName

    # Step 3: Create SQL Server with Azure AD-only auth
    Write-StepStatus "Creating SQL Server (Azure AD-only)" "Started" "80s"
    $sqlServerArgs = @(
        'sql', 'server', 'create',
        '--name', $sqlServer,
        '--resource-group', $rg,
        '--location', $Region,
        '--enable-ad-only-auth',
        '--external-admin-principal-type', 'User',
        '--external-admin-name', $currentUserName,
        '--external-admin-sid', $currentUser
    )
    $sqlServerResult = Invoke-AzCli -Arguments $sqlServerArgs
    OK $sqlServerResult "Failed to create SQL server"
    Write-StepStatus "" "Success" $sqlServer
    
    $sqlFqdnResult = Invoke-AzCli -Arguments @('sql', 'server', 'show', '--name', $sqlServer, '--resource-group', $rg, '--query', 'fullyQualifiedDomainName', '--output', 'tsv')
    OK $sqlFqdnResult "Failed to get SQL FQDN"
    $sqlServerFqdn = $sqlFqdnResult.TrimmedText

    # Step 4: Configure firewall
    $firewallArgs = @(
        'sql', 'server', 'firewall-rule', 'create',
        '--resource-group', $rg,
        '--server', $sqlServer,
        '--name', 'AllowAll',
        '--start-ip-address', '0.0.0.0',
        '--end-ip-address', '255.255.255.255'
    )
    $firewallResult = Invoke-AzCli -Arguments $firewallArgs
    OK $firewallResult "Failed to create firewall rule"

    # Step 5: Create SQL Database (try free tier first)
    Write-StepStatus "Creating SQL database" "Started" "60s"
    $dbType = "Basic DTU"
    
    # Try free tier
    $freeDbArgs = @('sql', 'db', 'create', '--name', $sqlDb, '--server', $sqlServer, '--resource-group', $rg, '--use-free-limit', 'true', '--edition', 'Free', '--max-size', '1GB')
    $freeDbResult = Invoke-AzCli -Arguments $freeDbArgs
    
    if ($freeDbResult.ExitCode -eq 0) {
        $dbType = "Free-tier"
    } else {
        # Fallback to Basic
        $basicDbArgs = @('sql', 'db', 'create', '--name', $sqlDb, '--server', $sqlServer, '--resource-group', $rg, '--edition', 'Basic', '--service-objective', 'Basic')
        $basicDbResult = Invoke-AzCli -Arguments $basicDbArgs
        OK $basicDbResult "Failed to create SQL database"
    }
    Write-StepStatus "" "Success" "$sqlDb ($dbType)"

    # Step 6: Deploy database schema
    Write-StepStatus "Deploying database schema" "Started" "30s"
    
    $schemaSuccess = Invoke-RetryOperation `
        -ScriptBlock {
            $sqlcmdOutput = sqlcmd -S $sqlServerFqdn -d $sqlDb -G -i $DatabasePath 2>&1 | Out-String
            if ($LASTEXITCODE -eq 0) {
                return $true
            }
            return $false
        } `
        -MaxRetries 3 `
        -BaseDelaySeconds 15 `
        -RetryMessage "Azure AD auth propagation, attempt {attempt}/{max}" `
        -OperationName "database schema deployment"
    
    if (-not $schemaSuccess) {
        throw "Failed to deploy database schema after 3 attempts"
    }
    Write-StepStatus "" "Success" "Schema deployed"

    # Step 7: Validate DAB configuration
    Write-StepStatus "Validating DAB configuration" "Started" "5s"
    $env:MSSQL_CONNECTION_STRING = "Server=tcp:${sqlServerFqdn},1433;Database=${sqlDb};Authentication=Active Directory Default;"
    
    try {
        $dabOutput = & dab validate --config $ConfigPath 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "DAB validation failed"
        }
        Write-StepStatus "" "Success" "Configuration valid"
    } finally {
        Remove-Item Env:MSSQL_CONNECTION_STRING -ErrorAction SilentlyContinue
    }

    # Step 8: Create Log Analytics workspace
    Write-StepStatus "Creating Log Analytics workspace" "Started" "40s"
    $lawArgs = @('monitor', 'log-analytics', 'workspace', 'create', '--resource-group', $rg, '--workspace-name', $logAnalytics, '--location', $Region)
    $lawResult = Invoke-AzCli -Arguments $lawArgs
    OK $lawResult "Failed to create Log Analytics"
    
    $lawIdResult = Invoke-AzCli -Arguments @('monitor', 'log-analytics', 'workspace', 'show', '--resource-group', $rg, '--workspace-name', $logAnalytics, '--query', 'customerId', '--output', 'tsv')
    OK $lawIdResult "Failed to get Log Analytics ID"
    $lawCustomerId = $lawIdResult.TrimmedText
    
    $lawKeyResult = Invoke-AzCli -Arguments @('monitor', 'log-analytics', 'workspace', 'get-shared-keys', '--resource-group', $rg, '--workspace-name', $logAnalytics, '--query', 'primarySharedKey', '--output', 'tsv')
    OK $lawKeyResult "Failed to get Log Analytics key"
    $lawPrimaryKey = $lawKeyResult.TrimmedText
    
    Write-StepStatus "" "Success" $logAnalytics

    # Step 9: Create Container Apps environment
    Write-StepStatus "Creating Container Apps environment" "Started" "120s"
    $acaArgs = @('containerapp', 'env', 'create', '--name', $acaEnv, '--resource-group', $rg, '--location', $Region, '--logs-workspace-id', $lawCustomerId, '--logs-workspace-key', $lawPrimaryKey)
    $acaResult = Invoke-AzCli -Arguments $acaArgs
    OK $acaResult "Failed to create Container Apps environment"
    Write-StepStatus "" "Success" $acaEnv

    # Step 10: Create Azure Container Registry
    Write-StepStatus "Creating Azure Container Registry" "Started" "25s"
    $acrArgs = @('acr', 'create', '--resource-group', $rg, '--name', $acrName, '--sku', 'Basic', '--admin-enabled', 'false')
    $acrResult = Invoke-AzCli -Arguments $acrArgs
    OK $acrResult "Failed to create ACR"
    Write-StepStatus "" "Success" $acrName
    
    $acrLoginServer = "$acrName.azurecr.io"
    $imageTag = "$acrLoginServer/dab-baked:$runTimestamp"

    # Step 11: Build and push Docker image
    Write-StepStatus "Building Docker image" "Started" "40s"
    $buildArgs = @('acr', 'build', '--resource-group', $rg, '--registry', $acrName, '--image', $imageTag, '--file', 'Dockerfile', '--build-arg', "DAB_VERSION=$DockerDabVersion", '.')
    
    $buildSuccess = Invoke-RetryOperation `
        -ScriptBlock {
            $buildResult = Invoke-AzCli -Arguments $buildArgs
            return $buildResult.ExitCode -eq 0
        } `
        -MaxRetries 3 `
        -BaseDelaySeconds 30 `
        -UseExponentialBackoff `
        -RetryMessage "ACR build, attempt {attempt}/{max}" `
        -OperationName "Docker build"
    
    if (-not $buildSuccess) {
        throw "Failed to build Docker image"
    }
    Write-StepStatus "" "Success" $imageTag

    # Step 12: Deploy Container App
    Write-StepStatus "Deploying Container App" "Started" "60s"
    
    $connectionString = "Server=tcp:${sqlServerFqdn},1433;Database=${sqlDb};Authentication=Active Directory Managed Identity;"
    
    $createAppArgs = @(
        'containerapp', 'create',
        '--name', $container,
        '--resource-group', $rg,
        '--environment', $acaEnv,
        '--system-assigned',
        '--ingress', 'external',
        '--target-port', '5000',
        '--image', $imageTag,
        '--registry-server', $acrLoginServer,
        '--registry-identity', 'system',
        '--cpu', $Config.ContainerCpu,
        '--memory', $Config.ContainerMemory,
        '--env-vars',
        "MSSQL_CONNECTION_STRING=$connectionString",
        "Runtime__ConfigFile=/App/dab-config.json"
    )
    
    $createAppResult = Invoke-AzCli -Arguments $createAppArgs
    OK $createAppResult "Failed to create Container App"
    Write-StepStatus "" "Success" $container

    # Step 13: Assign ACR pull permissions
    Write-StepStatus "Configuring managed identity" "Started" "15s"
    
    $principalIdResult = Invoke-AzCli -Arguments @('containerapp', 'show', '--name', $container, '--resource-group', $rg, '--query', 'identity.principalId', '--output', 'tsv')
    OK $principalIdResult "Failed to get MI principal ID"
    $principalId = $principalIdResult.TrimmedText -replace '\s+', ''
    
    $acrIdResult = Invoke-AzCli -Arguments @('acr', 'show', '--name', $acrName, '--resource-group', $rg, '--query', 'id', '--output', 'tsv')
    OK $acrIdResult "Failed to get ACR ID"
    $acrId = $acrIdResult.TrimmedText
    
    $roleResult = Invoke-AzCli -Arguments @('role', 'assignment', 'create', '--assignee', $principalId, '--role', 'AcrPull', '--scope', $acrId)
    OK $roleResult "Failed to assign AcrPull role"
    Write-StepStatus "" "Success" "AcrPull role assigned"

    # Step 14: Get MI display name and grant SQL access
    Write-StepStatus "Granting SQL database access" "Started" "30s"
    
    $spDisplayName = Get-MI-DisplayName -PrincipalId $principalId
    
    $sqlSuccess = Invoke-RetryOperation `
        -ScriptBlock {
            $escapedUserName = $spDisplayName.Replace("'", "''")
            $escapedBracketName = $spDisplayName.Replace("]", "]]")
            $sqlQuery = @"
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '$escapedUserName')
    CREATE USER [$escapedBracketName] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [$escapedBracketName];
ALTER ROLE db_datawriter ADD MEMBER [$escapedBracketName];
GRANT EXECUTE TO [$escapedBracketName];
SELECT 'SUCCESS' AS Result;
"@
            $sqlcmdOutput = sqlcmd -S $sqlServerFqdn -d $sqlDb -G -Q $sqlQuery 2>&1 | Out-String
            return $LASTEXITCODE -eq 0 -and $sqlcmdOutput -match 'SUCCESS'
        } `
        -MaxRetries 12 `
        -BaseDelaySeconds 20 `
        -UseExponentialBackoff `
        -UseJitter `
        -RetryMessage "MI propagation, attempt {attempt}/{max}" `
        -OperationName "SQL MI access grant"
    
    if (-not $sqlSuccess) {
        throw "Failed to grant SQL access to managed identity"
    }
    Write-StepStatus "" "Success" "$spDisplayName granted access"

    # Step 15: Verify container is running
    Write-StepStatus "Verifying container health" "Started" "120s"
    
    $containerRunning = Invoke-RetryOperation `
        -ScriptBlock {
            $statusResult = Invoke-AzCli -Arguments @('containerapp', 'show', '--name', $container, '--resource-group', $rg, '--query', '{provisioning:properties.provisioningState,running:properties.runningStatus}', '--output', 'json')
            if ($statusResult.ExitCode -eq 0) {
                $status = $statusResult.TrimmedText | ConvertFrom-Json
                return $status.provisioning -eq 'Succeeded' -and $status.running -eq 'Running'
            }
            return $false
        } `
        -TimeoutSeconds 120 `
        -BaseDelaySeconds 10 `
        -RetryMessage "checking container status" `
        -OperationName "container verification"
    
    if (-not $containerRunning) {
        throw "Container did not reach Running state"
    }
    Write-StepStatus "" "Success" "Container running"

    # Get container URL
    $urlResult = Invoke-AzCli -Arguments @('containerapp', 'show', '--name', $container, '--resource-group', $rg, '--query', 'properties.configuration.ingress.fqdn', '--output', 'tsv')
    $containerUrl = "https://$($urlResult.TrimmedText)"

    # Step 16: Deploy SQL Commander (optional)
    $sqlCommanderUrl = "Not deployed"
    if (-not $NoSqlCommander) {
        Write-StepStatus "Deploying SQL Commander" "Started" "30s"
        
        $sqlConnStr = "Server=$sqlServerFqdn;Database=$sqlDb;Authentication=Active Directory Default;"
        $sqlCmdArgs = @(
            'containerapp', 'create',
            '--name', $sqlCommander,
            '--resource-group', $rg,
            '--environment', $acaEnv,
            '--system-assigned',
            '--image', 'jerrynixon/sql-commander:latest',
            '--ingress', 'external',
            '--target-port', '8080',
            '--cpu', '0.5',
            '--memory', '1.0Gi',
            '--env-vars', "ConnectionStrings__db=$sqlConnStr"
        )
        
        $sqlCmdResult = Invoke-AzCli -Arguments $sqlCmdArgs
        
        if ($sqlCmdResult.ExitCode -eq 0) {
            # Grant SQL Commander MI access
            $sqlCmdPrincipalResult = Invoke-AzCli -Arguments @('containerapp', 'show', '--name', $sqlCommander, '--resource-group', $rg, '--query', 'identity.principalId', '--output', 'tsv')
            
            if ($sqlCmdPrincipalResult.ExitCode -eq 0) {
                $sqlCmdPrincipalId = $sqlCmdPrincipalResult.TrimmedText -replace '\s+', ''
                $sqlCmdDisplayName = Get-MI-DisplayName -PrincipalId $sqlCmdPrincipalId
                
                # Grant SQL access (best effort)
                $escapedUserName = $sqlCmdDisplayName.Replace("'", "''")
                $escapedBracketName = $sqlCmdDisplayName.Replace("]", "]]")
                $sqlQuery = "IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '$escapedUserName') CREATE USER [$escapedBracketName] FROM EXTERNAL PROVIDER; ALTER ROLE db_datareader ADD MEMBER [$escapedBracketName]; ALTER ROLE db_datawriter ADD MEMBER [$escapedBracketName];"
                sqlcmd -S $sqlServerFqdn -d $sqlDb -G -Q $sqlQuery 2>&1 | Out-Null
            }
            
            $sqlCmdUrlResult = Invoke-AzCli -Arguments @('containerapp', 'show', '--name', $sqlCommander, '--resource-group', $rg, '--query', 'properties.configuration.ingress.fqdn', '--output', 'tsv')
            if ($sqlCmdUrlResult.ExitCode -eq 0) {
                $sqlCommanderUrl = "https://$($sqlCmdUrlResult.TrimmedText)"
            }
            Write-StepStatus "" "Success" $sqlCommander
        } else {
            Write-StepStatus "" "Info" "SQL Commander deployment skipped (non-critical)"
        }
    }

    # ============================================
    # DEPLOYMENT COMPLETE
    # ============================================
    
    $totalTime = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)
    
    Write-DeploymentSummary -ResourceGroup $rg -Region $Region -SqlServer $sqlServer -SqlDatabase $sqlDb `
        -Container $container -ContainerUrl $containerUrl -LogAnalytics $logAnalytics `
        -Environment $acaEnv -CurrentUser $currentUserName -DatabaseType $dbType -TotalTime "${totalTime}m" `
        -SqlServerFqdn $sqlServerFqdn -SqlCommander $sqlCommander -SqlCommanderUrl $sqlCommanderUrl

    Write-Host "`nDeployment log: $script:CliLog" -ForegroundColor Green
    exit 0

} catch {
    Write-Host "`n" + ("=" * 80) -ForegroundColor Red
    Write-Host "DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host ("=" * 80) -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    Add-Content -Path $script:CliLog -Value "[ERROR] $($_.Exception.Message)`n$($_.ScriptStackTrace)"
    
    if (-not $NoCleanup -and $rg) {
        Write-Host "`nCleaning up partial deployment..." -ForegroundColor Yellow
        $deleteResult = Invoke-AzCli -Arguments @('group', 'delete', '--name', $rg, '--yes', '--no-wait')
        if ($deleteResult.ExitCode -eq 0) {
            Write-Host "Resource group deletion initiated: $rg" -ForegroundColor Green
        }
    } elseif ($NoCleanup) {
        Write-Host "`nResource group preserved for debugging: $rg" -ForegroundColor Yellow
    }
    
    Write-Host "`nDeployment log: $script:CliLog" -ForegroundColor Cyan
    exit 1
}
