# Start Data API Builder

A Visual Studio Code extension that adds a quick way to start Data API Builder directly from `dab-config.json`.

![](https://github.com/JerryNixon/data-api-builder-vscode-ext/blob/master/start-data-api-builder/images/screenshot.png?raw=true)

## Features

- Adds a right-click context menu for files named `dab-config.json`.
- Automatically opens a new terminal and runs `dab start`.

## Requirements

- Ensure that `dab` is installed: `dotnet tool install microsoft.dataapibuilder -g`

## Release Notes

### 1.2.0 - 2026-01-13

**Added**
- Configuration file validation before starting DAB
- Error message when attempting to start with invalid config file
- Migrated to dab-vscode-shared package for terminal management

**Changed**
- Terminal management now uses shared package for consistency
- Added config path validation using shared utilities

**Removed**
- Local runTerminal.ts in favor of shared package

### 1.1.0

- Previous version

### 1.0.0

- Initial release

## Known Issues

- Only files named exactly `dab-config.json` will show the context menu option.
- The terminal assumes `dab` is available globally in your environment.

## Release Notes

### 1.0.0

- Initial release: Context menu and terminal support for starting DAB.