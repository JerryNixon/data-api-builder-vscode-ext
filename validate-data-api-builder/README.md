# Data API Builder (Validate)

A Visual Studio Code extension that provides a quick way to validate Data API Builder configurations directly from `dab-config.json` or `staticwebapp.database.config.json`.

![](https://raw.githubusercontent.com/JerryNixon/data-api-builder-vscode-ext/refs/heads/master/validate-data-api-builder/images/screenshot.png?raw=true)

## Features

- Adds a right-click context menu for `dab-config.json` or `staticwebapp.database.config.json`.
- Opens a terminal and runs `dab validate -c <config-file>`.

## Requirements

- Ensure that `dab` is installed: `dotnet tool install microsoft.dataapibuilder -g`.

## Release Notes

### 0.3.0 - 2026-01-13

**Added**
- Dedicated Output Channel for validation results
- Progress notification during validation
- Simple status indicators (✅ VALID / ❌ INVALID)
- Migrated to shared package for config validation
- Auto-opens output channel to show results

**Changed**
- Replaced terminal output with child_process execution for better control
- Shows clean DAB CLI output without extra formatting
- Added skipLibCheck to TypeScript config for better compatibility
- Simplified output to just show raw validation results plus status

**Fixed**
- Output now displays immediately in readable format
- Better handling of validation success/failure states

### 0.2.0

- Previous version

### 0.1.0

- Initial release

## Known Issues

- The context menu only appears for `dab-config.json` or `staticwebapp.database.config.json`.
- The terminal assumes `dab` is globally available in your environment.

## Release Notes

### 0.0.1

- Initial release: Validate Data API Builder configurations directly from supported files.