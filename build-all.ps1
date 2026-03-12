# Build all Data API Builder VS Code extensions
Write-Host "Building Data API Builder Extensions..." -ForegroundColor Cyan
npm run build:all
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Build completed! Press F5 to debug." -ForegroundColor Green
}
