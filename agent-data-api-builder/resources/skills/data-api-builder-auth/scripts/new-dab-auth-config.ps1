# Writes a dab-config auth template to a target path.
# Usage:
#   .\new-dab-auth-config.ps1 -Scenario qs4 -OutputPath .\data-api\dab-config.json

Param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('qs1','qs3','qs4','qs5')]
    [string]$Scenario,

    [string]$OutputPath = ".\dab-config.json"
)

$ErrorActionPreference = 'Stop'

$skillRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$templateMap = @{
    qs1 = 'assets\dab-config\qs1-anonymous-sql-auth.json'
    qs3 = 'assets\dab-config\qs3-entra-provider-anonymous-role.json'
    qs4 = 'assets\dab-config\qs4-entra-authenticated-policy.json'
    qs5 = 'assets\dab-config\qs5-entra-authenticated-rls-ready.json'
}

$templatePath = Join-Path $skillRoot $templateMap[$Scenario]
if (-not (Test-Path $templatePath)) {
    throw "Template not found: $templatePath"
}

$targetDir = Split-Path -Parent $OutputPath
if ($targetDir -and -not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

Copy-Item -Path $templatePath -Destination $OutputPath -Force
Write-Host "Wrote $Scenario template to $OutputPath" -ForegroundColor Green

if ($Scenario -in @('qs3','qs4','qs5')) {
    Write-Host "Reminder: replace __AUDIENCE__ and __ISSUER__ placeholders before runtime." -ForegroundColor Yellow
}

if ($Scenario -eq 'qs5') {
    Write-Host "Reminder: deploy SQL RLS objects from assets/sql/rls/ for DB-layer enforcement." -ForegroundColor Yellow
}
