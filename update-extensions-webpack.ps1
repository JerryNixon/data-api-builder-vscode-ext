# Update extension package.json files to use webpack
$extensions = @(
    'health-data-api-builder',
    'start-data-api-builder', 
    'validate-data-api-builder',
    'visualize-data-api-builder',
    'agent-data-api-builder'
)

foreach ($ext in $extensions) {
    $pkgPath = Join-Path $ext "package.json"
    if (Test-Path $pkgPath) {
        $content = Get-Content $pkgPath -Raw
        
        # Update main entry point
        $content = $content -replace '"main":\s*"\./out/extension\.js"', '"main": "./dist/extension.js"'
        
        # Update scripts
        $content = $content -replace '"vscode:prepublish":\s*"npm run compile"', '"vscode:prepublish": "npm run package"'
        $content = $content -replace '"compile":\s*"tsc -p \./"|"compile":\s*"tsc"', '"compile": "webpack"'
        $content = $content -replace '"watch":\s*"tsc -watch -p \./"|"watch":\s*"tsc --watch"', '"watch": "webpack --watch"'
        
        # Add package script after watch
        if ($content -notmatch '"package":') {
            $packageScript = ',\n    "package": "webpack --mode production --devtool hidden-source-map"'
            $content = $content -replace '("watch":\s*"[^"]+")','$1' + $packageScript
        }
        
        # Add webpack dependencies
        if ($content -notmatch 'ts-loader') {
            $webpackDeps = ',\n    "ts-loader": "^9.5.1",\n    "webpack": "^5.94.0",\n    "webpack-cli": "^5.1.4"'
            $content = $content -replace '("@types/node":\s*"[^"]+")','$1' + $webpackDeps
        }
        
        Set-Content $pkgPath $content -NoNewline
        Write-Host "Updated $ext/package.json" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "All package.json files updated!" -ForegroundColor Cyan
Write-Host "Run npm install in each extension folder to install webpack dependencies." -ForegroundColor Yellow
