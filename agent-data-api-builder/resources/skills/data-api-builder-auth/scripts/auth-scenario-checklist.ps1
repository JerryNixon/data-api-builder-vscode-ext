# Quick validation checklist per DAB auth scenario
# Usage: .\auth-scenario-checklist.ps1 -Scenario qs4

Param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('qs1','qs2','qs3','qs4','qs5')]
    [string]$Scenario
)

$ErrorActionPreference = 'Stop'

$items = switch ($Scenario) {
    'qs1' { @(
        '[ ] DAB entity role is anonymous',
        '[ ] No Entra auth provider configured in dab-config',
        '[ ] SQL auth connection string present (local and/or Azure)',
        '[ ] /api, /graphql, /mcp endpoints reachable'
    ) }
    'qs2' { @(
        '[ ] Azure deployment uses Managed Identity for API->SQL',
        '[ ] No DB password required for Azure API runtime',
        '[ ] SQL principal/user exists for managed identity',
        '[ ] Local fallback path still works for developer loop'
    ) }
    'qs3' { @(
        '[ ] runtime.host.authentication.provider = EntraId',
        '[ ] audience and issuer placeholders are replaced',
        '[ ] entity role remains anonymous (staged auth)',
        '[ ] web remains functional without bearer token'
    ) }
    'qs4' { @(
        '[ ] entity role is authenticated',
        '[ ] DAB policy uses @item... and @claims... syntax',
        '[ ] web sends bearer token on API requests',
        '[ ] each user only sees own rows'
    ) }
    'qs5' { @(
        '[ ] entity role is authenticated',
        '[ ] DAB row policies removed (or intentionally layered)',
        '[ ] SQL RLS predicate function deployed',
        '[ ] SQL security policy enabled on target table'
    ) }
}

Write-Host "Checklist for $Scenario" -ForegroundColor Cyan
$items | ForEach-Object { Write-Host $_ }
