# Writes or updates .vscode/mcp.json for DAB MCP endpoint
# Usage: .\write-vscode-mcp.ps1 [-ServerName my-database] [-McpUrl http://localhost:5000/mcp]

Param(
    [string]$ServerName = "my-database",
    [string]$McpUrl = "http://localhost:5000/mcp"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Location).Path
$vscodeDir = Join-Path $repoRoot ".vscode"
$mcpPath = Join-Path $vscodeDir "mcp.json"

if (-not (Test-Path $vscodeDir)) {
    New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null
}

if (Test-Path $mcpPath) {
    $cfg = Get-Content -Path $mcpPath -Raw | ConvertFrom-Json -AsHashtable
} else {
    $cfg = @{}
}

if ($null -eq $cfg) { $cfg = @{} }
if (-not $cfg.ContainsKey('servers') -or $null -eq $cfg.servers) { $cfg.servers = @{} }

$cfg.servers[$ServerName] = @{ type = 'http'; url = $McpUrl }
$cfg | ConvertTo-Json -Depth 100 | Out-File -FilePath $mcpPath -Encoding utf8 -Force

Write-Host "Updated $mcpPath with server '$ServerName' -> $McpUrl" -ForegroundColor Green
