# Local Docker start script (recommended over raw `docker compose up -d`)
# Usage: .\docker.ps1 [-DbName TodoDb] [-SqlPort 14330]

Param(
    [string]$DbName = "TodoDb",
    [int]$SqlPort = 14330
)

$ErrorActionPreference = "Stop"

Write-Host "Starting containers..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

Write-Host "Waiting for SQL health..." -ForegroundColor Yellow
$max = 60
$i = 0
while ($i -lt $max) {
    $health = docker inspect --format="{{.State.Health.Status}}" sql-2025 2>$null
    if ($health -eq "healthy") { break }
    Start-Sleep -Seconds 2
    $i++
}
if ($i -ge $max) { throw "SQL container did not become healthy in time" }

Write-Host "Building SQL project..." -ForegroundColor Yellow
dotnet build database/database.sqlproj
if ($LASTEXITCODE -ne 0) { throw "database build failed" }

if (-not $env:SA_PASSWORD) {
    throw "SA_PASSWORD environment variable is required (set from .env or current shell)"
}

$conn = "Server=localhost,$SqlPort;Database=$DbName;User Id=sa;Password=$($env:SA_PASSWORD);TrustServerCertificate=true"
Write-Host "Publishing schema..." -ForegroundColor Yellow
sqlpackage /Action:Publish /SourceFile:database/bin/Debug/database.dacpac /TargetConnectionString:"$conn" /p:BlockOnPossibleDataLoss=false
if ($LASTEXITCODE -ne 0) { throw "sqlpackage publish failed" }

Write-Host "Done. Stack is ready." -ForegroundColor Green
