# Extension Packaging and Deployment

This document explains the packaging and deployment workflow for DAB VS Code extensions, with detailed coverage of `package.bat` - the interactive packaging utility.

## Overview

The workspace uses a batch script (`package.bat`) to automate the packaging of all DAB extensions into `.vsix` files for distribution. These files can be installed locally in VS Code or published to the Visual Studio Code Marketplace.

---

## package.bat - Interactive Packaging Tool

**Location**: `c:\Users\jnixon\source\repos\data-api-builder-vscode-ext\package.bat`

### Purpose

`package.bat` is a Windows batch script that provides an interactive menu for packaging individual or all DAB extensions. It handles:

1. Building extensions (including webpack when needed)
2. Creating `.vsix` package files
3. Moving packaged files to centralized `out/` directory
4. Opening output folder or marketplace publisher page

### Menu System

When executed, `package.bat` displays an interactive menu:

```
==========================================
  Data API Builder - VS Code Extensions
==========================================
[a]  PACKAGE mcp-data-api-builder
[b]  PACKAGE omnibus-data-api-builder
[c]  PACKAGE poco-data-api-builder
[d]  PACKAGE init-data-api-builder
[e]  PACKAGE config-data-api-builder
[f]  PACKAGE start-data-api-builder
[g]  PACKAGE add-data-api-builder
[h]  PACKAGE validate-data-api-builder
[i]  PACKAGE visualize-data-api-builder
[j]  PACKAGE health-data-api-builder
[0]  PACKAGE RUN ALL
==========================================
[x]  Exit this script
[y]  Open Out Folder in File Explorer
[z]  Open VS Marketplace Publisher Page
==========================================
```

### Extensions Order

The menu lists extensions in a specific order (not alphabetical):

1. **mcp-data-api-builder** - MCP integration (planned, not yet created)
2. **omnibus-data-api-builder** - Extension pack (recommended to package first/early)
3. **poco-data-api-builder** - C# code generator (requires webpack)
4. **init-data-api-builder** - Config initialization
5. **config-data-api-builder** - Runtime config editor (planned, not yet created)
6. **start-data-api-builder** - Start DAB engine
7. **add-data-api-builder** - Add entities (requires webpack)
8. **validate-data-api-builder** - Validate config
9. **visualize-data-api-builder** - Visualize as diagram
10. **health-data-api-builder** - Health check

**Note**: The order appears to prioritize meta/important extensions first (mcp, omnibus, poco) followed by workflow order (init, config, start, add, validate, visualize, health).

---

## Script Behavior

### Initialization

```batch
@echo off
:: Create 'out' directory if it doesn't exist
rd out /s /q
md out
```

**Actions**:
1. Deletes existing `out/` directory and all contents (`rd out /s /q`)
2. Creates fresh `out/` directory (`md out`)
3. Ensures clean slate for new packages

**Warning**: This DELETES all previous `.vsix` files in `out/`. Make sure to back up or publish any needed packages before running.

### Individual Extension Packaging

The `:RUN` function handles packaging a single extension:

```batch
:RUN
@echo on
cd ./%1
echo ------------------------------------------
echo   BUILDING: %1
echo ------------------------------------------
if not "%~2"=="" call %~2
call vsce package
move /Y *.vsix ../out
cd ..
@echo off
goto :eof
```

**Parameters**:
- `%1` - Extension folder name (e.g., `init-data-api-builder`)
- `%2` - Optional pre-build command (e.g., `npx webpack`)

**Process**:
1. Navigate to extension folder (`cd ./%1`)
2. Display build header
3. Run pre-build command if specified (e.g., webpack)
4. Run `vsce package` to create `.vsix` file
5. Move `.vsix` file to `../out` directory
6. Return to root directory

### Package All Extensions

The `:RUN_ALL` function packages all extensions sequentially:

```batch
:RUN_ALL
call :RUN omnibus-data-api-builder
call :RUN poco-data-api-builder "npx webpack"
call :RUN init-data-api-builder
call :RUN config-data-api-builder
call :RUN start-data-api-builder
call :RUN add-data-api-builder "npx webpack"
call :RUN validate-data-api-builder
call :RUN visualize-data-api-builder
call :RUN health-data-api-builder
call :RUN mcp-data-api-builder
goto MENU
```

**Order** (different from menu display order):
1. omnibus (extension pack - should be last to reference latest versions)
2. poco (requires webpack)
3. init
4. config (planned, will fail if not created)
5. start
6. add (requires webpack)
7. validate
8. visualize
9. health
10. mcp (planned, will fail if not created)

**Note**: The `RUN_ALL` function will fail on `config-data-api-builder` and `mcp-data-api-builder` since these folders don't exist yet. Consider this when using option [0].

### Utility Options

**[y] Open Out Folder**:
```batch
if /I "%choice%"=="y" start "" explorer "%cd%\out"
```
Opens Windows Explorer to the `out/` folder to view generated `.vsix` files.

**[z] Open Marketplace Publisher Page**:
```batch
if /I "%choice%"=="z" start "" "https://marketplace.visualstudio.com/manage/publishers/jerry-nixon"
```
Opens the VS Code Marketplace publisher management page in default browser.

**[x] Exit**:
```batch
if /I "%choice%"=="x" goto EXIT
```
Terminates the script.

---

## Webpack Extensions

Two extensions require webpack bundling BEFORE packaging:

### 1. poco-data-api-builder

**Why webpack**:
- Bundles extension code with dependencies
- Includes C# template files from `resources/`
- Creates self-contained `dist/extension.js`

**Package command**:
```batch
call :RUN poco-data-api-builder "npx webpack"
```

**Process**:
1. Runs `npx webpack` (uses `webpack.config.js`)
2. Bundles TypeScript + dependencies → `dist/extension.js`
3. Runs `vsce package`
4. Moves `.vsix` to `out/`

### 2. add-data-api-builder

**Why webpack**:
- Bundles extension with `mssql` database driver
- Large binary dependencies need bundling
- Creates optimized `dist/extension.js`

**Package command**:
```batch
call :RUN add-data-api-builder "npx webpack"
```

**Process**:
1. Runs `npx webpack` (uses `webpack.config.js`)
2. Bundles TypeScript + mssql driver → `dist/extension.js`
3. Runs `vsce package`
4. Moves `.vsix` to `out/`

**Note**: The `mssql` driver includes native bindings, which webpack handles via configuration.

---

## VSIX Package Files

### Output Location

All `.vsix` files are moved to:
```
c:\Users\jnixon\source\repos\data-api-builder-vscode-ext\out\
```

### File Naming Convention

VSIX files follow this pattern:
```
<extension-name>-<version>.vsix
```

Examples:
- `init-data-api-builder-0.2.0.vsix`
- `omnibus-data-api-builder-0.0.8.vsix`
- `poco-data-api-builder-0.1.0.vsix`

Version numbers come from each extension's `package.json`:
```json
{
  "name": "init-data-api-builder",
  "version": "0.2.0",
  ...
}
```

### Package Contents

A `.vsix` file contains:
- Compiled extension code (`out/` or `dist/` folder)
- `package.json` manifest
- Icon and images
- README and CHANGELOG
- Dependencies (if bundled via webpack)
- Extension metadata

---

## Manual Packaging Workflow

If you need to package an extension manually (without `package.bat`):

### Standard Extensions (no webpack)

```powershell
# Navigate to extension folder
cd init-data-api-builder

# Build TypeScript
npm run build
# OR
tsc

# Package with vsce
vsce package

# VSIX file created in current directory
```

### Webpack Extensions

```powershell
# Navigate to extension folder
cd add-data-api-builder

# Run webpack build
npx webpack

# Package with vsce
vsce package

# VSIX file created in current directory
```

### Requirements

**vsce (Visual Studio Code Extension Manager)**:
```powershell
# Install globally
npm install -g @vscode/vsce

# Or run via npx
npx @vscode/vsce package
```

---

## Installation and Testing

### Local Installation

Install a `.vsix` file locally for testing:

```powershell
# From command line
code --install-extension out/init-data-api-builder-0.2.0.vsix

# Or via VS Code UI:
# 1. Open VS Code
# 2. View → Extensions (Ctrl+Shift+X)
# 3. Click "..." menu → "Install from VSIX..."
# 4. Select .vsix file from out/ folder
```

### Testing Installed Extension

1. **Reload VS Code**: Press `Ctrl+Shift+P` → "Developer: Reload Window"
2. **Verify activation**: Open workspace with DAB config file
3. **Test commands**: Right-click on appropriate files
4. **Check output**: View terminal output for DAB commands

### Uninstall Extension

```powershell
# From command line
code --uninstall-extension jerry-nixon.init-data-api-builder

# Or via VS Code UI:
# Extensions view → Click gear icon → Uninstall
```

---

## Publishing to Marketplace

### Prerequisites

1. **Publisher Account**: Create account at https://marketplace.visualstudio.com
2. **Personal Access Token**: Generate from Azure DevOps
3. **Login to vsce**:
   ```powershell
   vsce login jerry-nixon
   ```

### Publish Single Extension

```powershell
cd init-data-api-builder

# Publish (builds and uploads)
vsce publish

# Or publish specific .vsix file
vsce publish -p <personal-access-token> init-data-api-builder-0.2.0.vsix
```

### Version Management

**Increment version before publishing**:

```powershell
# Patch version (0.2.0 → 0.2.1)
vsce publish patch

# Minor version (0.2.0 → 0.3.0)
vsce publish minor

# Major version (0.2.0 → 1.0.0)
vsce publish major
```

This automatically:
1. Updates `package.json` version
2. Builds extension
3. Packages as `.vsix`
4. Publishes to marketplace

### Marketplace Publisher Page

**URL**: https://marketplace.visualstudio.com/manage/publishers/jerry-nixon

**Accessible via**:
- `package.bat` menu option [z]
- Direct browser navigation
- VS Code Marketplace dashboard

**Publisher Capabilities**:
- Upload new extensions
- Update existing extensions
- View download statistics
- Manage extension metadata
- Unpublish extensions

---

## Troubleshooting

### Common Issues

#### 1. "vsce: command not found"

**Solution**:
```powershell
npm install -g @vscode/vsce
```

#### 2. Webpack build failures

**Check**:
- `webpack.config.js` exists
- Dependencies installed: `npm install`
- TypeScript compiles: `tsc`

**Fix**:
```powershell
npm install
npx webpack --verbose
```

#### 3. Package includes wrong files

**Check**:
- `.vscodeignore` file (excludes files from package)
- `files` field in `package.json`
- `main` field points to correct entry point

**Example `.vscodeignore`**:
```
src/**
tsconfig.json
webpack.config.js
.vscode/**
node_modules/**
.gitignore
```

#### 4. Extension doesn't activate after install

**Verify**:
- `activationEvents` in `package.json`
- `main` field points to compiled output
- Output directory exists (`out/` or `dist/`)

#### 5. "out" folder permission errors

**Solution**:
```powershell
# Run as administrator or
# Manually delete out/ folder before running package.bat
```

#### 6. config-data-api-builder or mcp-data-api-builder not found

These extensions are planned but not yet created. Package.bat references them, which causes:

**Error**:
```
The system cannot find the path specified.
```

**Solutions**:

**Option 1**: Package extensions individually (avoid [0] RUN ALL)

**Option 2**: Modify `package.bat` to skip missing extensions:
```batch
:RUN_ALL
call :RUN omnibus-data-api-builder
call :RUN poco-data-api-builder "npx webpack"
call :RUN init-data-api-builder
REM call :RUN config-data-api-builder
call :RUN start-data-api-builder
call :RUN add-data-api-builder "npx webpack"
call :RUN validate-data-api-builder
call :RUN visualize-data-api-builder
call :RUN health-data-api-builder
REM call :RUN mcp-data-api-builder
goto MENU
```

**Option 3**: Create stub folders with minimal `package.json` for planned extensions

---

## Build Dependencies

### Global Tools Required

- **Node.js** (v18+)
- **npm** (v9+)
- **@vscode/vsce** (latest)

```powershell
# Install vsce globally
npm install -g @vscode/vsce
```

### Per-Extension Dependencies

Each extension has its own `package.json` with dependencies. Install before building:

```powershell
# In each extension folder
npm install
```

### Workspace-Level Build

Build shared packages first:

```powershell
# From workspace root
npm run build:all-shared

# Or individually
npm run build:shared          # dab-vscode-shared
npm run build:shared-database # dab-vscode-shared-database
```

**Reference**: [NPM Workspace Management](npm-workspaces.md)

---

## Packaging Best Practices

### 1. Version Consistency

**Before packaging omnibus**:
1. Package all individual extensions first
2. Update omnibus `extensionPack` versions in `package.json`
3. Package omnibus last

### 2. Clean Builds

Always start with clean state:
```powershell
# From extension folder
rm -rf out dist node_modules
npm install
npm run build
vsce package
```

### 3. Test Before Publishing

```powershell
# 1. Package locally
vsce package

# 2. Install in VS Code
code --install-extension *.vsix

# 3. Test all commands

# 4. Uninstall test version
code --uninstall-extension jerry-nixon.<extension-name>

# 5. Publish to marketplace
vsce publish
```

### 4. Changelog Updates

Update `CHANGELOG.md` before packaging:
```markdown
## [0.2.1] - 2025-01-19
### Fixed
- Fixed issue with environment variable parsing
- Improved error messages

## [0.2.0] - 2025-01-15
### Added
- MCP endpoint support
- Multi-select configuration dialog
```

### 5. README Accuracy

Ensure README reflects current features:
- Update screenshots
- Document new commands
- Update requirements
- Add usage examples

---

## Automation Opportunities

### PowerShell Alternative

Create `package.ps1` for cross-platform support:

```powershell
# package.ps1
param(
    [Parameter(Mandatory=$false)]
    [string[]]$Extensions = @(),
    
    [switch]$All
)

$extensionList = @(
    "omnibus-data-api-builder",
    @{ Name = "poco-data-api-builder"; PreBuild = "npx webpack" },
    "init-data-api-builder",
    "start-data-api-builder",
    @{ Name = "add-data-api-builder"; PreBuild = "npx webpack" },
    "validate-data-api-builder",
    "visualize-data-api-builder",
    "health-data-api-builder"
)

# Create out directory
Remove-Item -Path "out" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -Path "out" -ItemType Directory | Out-Null

function Build-Extension {
    param([object]$ExtensionInfo)
    
    $extName = if ($ExtensionInfo -is [string]) { $ExtensionInfo } else { $ExtensionInfo.Name }
    $preBuild = if ($ExtensionInfo -is [hashtable]) { $ExtensionInfo.PreBuild } else { $null }
    
    Write-Host "`n=========================================="
    Write-Host "BUILDING: $extName"
    Write-Host "=========================================="
    
    Push-Location $extName
    
    if ($preBuild) {
        Invoke-Expression $preBuild
    }
    
    vsce package
    Move-Item -Path "*.vsix" -Destination "../out" -Force
    
    Pop-Location
}

if ($All) {
    foreach ($ext in $extensionList) {
        Build-Extension $ext
    }
} elseif ($Extensions) {
    foreach ($extName in $Extensions) {
        $ext = $extensionList | Where-Object { 
            ($_ -is [string] -and $_ -eq $extName) -or 
            ($_ -is [hashtable] -and $_.Name -eq $extName)
        }
        if ($ext) {
            Build-Extension $ext
        } else {
            Write-Warning "Extension not found: $extName"
        }
    }
} else {
    Write-Host "Usage:"
    Write-Host "  .\package.ps1 -All"
    Write-Host "  .\package.ps1 -Extensions 'init-data-api-builder','start-data-api-builder'"
}
```

### GitHub Actions Workflow

Automate packaging and publishing:

```yaml
# .github/workflows/package-extensions.yml
name: Package Extensions

on:
  push:
    tags:
      - 'v*'

jobs:
  package:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install vsce
        run: npm install -g @vscode/vsce
      
      - name: Build shared packages
        run: npm run build:all-shared
      
      - name: Package extensions
        run: .\package.bat
        # TODO: Make non-interactive
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: vsix-packages
          path: out/*.vsix
```

---

## Related Documentation

- [Extensions Overview](extensions-overview.md) - Complete extension catalog
- [NPM Workspace Management](npm-workspaces.md) - Monorepo build process
- [VS Code Extension Development](vscode-extensions.md) - Extension development guide
- [Troubleshooting](troubleshooting.md) - Common packaging issues

---

## Quick Reference

### package.bat Menu Options

| Key | Action |
|-----|--------|
| a | Package mcp-data-api-builder |
| b | Package omnibus-data-api-builder |
| c | Package poco-data-api-builder (webpack) |
| d | Package init-data-api-builder |
| e | Package config-data-api-builder |
| f | Package start-data-api-builder |
| g | Package add-data-api-builder (webpack) |
| h | Package validate-data-api-builder |
| i | Package visualize-data-api-builder |
| j | Package health-data-api-builder |
| 0 | Package ALL extensions |
| y | Open out/ folder |
| z | Open Marketplace publisher page |
| x | Exit script |

### Webpack-Required Extensions

- poco-data-api-builder
- add-data-api-builder

### Missing Extensions (Planned)

- config-data-api-builder
- mcp-data-api-builder

### Output Directory

`c:\Users\jnixon\source\repos\data-api-builder-vscode-ext\out\`

### Publisher

jerry-nixon (https://marketplace.visualstudio.com/manage/publishers/jerry-nixon)
