# Init Data API Builder

A Visual Studio Code extension that guides users through initializing Data API Builder in a folder.

![](https://github.com/JerryNixon/data-api-builder-vscode-ext/blob/master/init-data-api-builder/images/screenshot.png?raw=true)

## Features

- Adds a right-click context menu for folders.
- Single multi-select dialog for all configuration options: REST, GraphQL, MCP, Cache, Developer Mode, and Simulated security.
- Guides users through streamlined prompts for `dab init` configuration.
- Automatically configures OpenTelemetry with environment variable placeholders for observability.
- Automatically updates `.env` and `.gitignore`.

## Requirements

- Ensure that `dab` is installed: `dotnet tool install microsoft.dataapibuilder -g`.

## Known Issues

- Assumes `dab` is available globally in your environment.
- Prompts may fail if folder paths contain unsupported characters.

## Release Notes

### 0.2.0 - 2026-01-13

**Added**
- Single consolidated multi-select dialog for all configuration options
- REST, GraphQL, MCP, Cache, Developer Mode, and Simulated security all in one dialog
- MCP (Model Context Protocol) endpoint configuration support
- Developer Mode checkbox to control development vs production host mode
- Simulated security option integrated into main dialog (defaults to unchecked)
- Migrated to dab-vscode-shared package for terminal management
- Automatic .env file creation with connection string placeholder
- Automatic .gitignore creation/update to protect sensitive files

**Changed**
- Consolidated ALL configuration dialogs into single multi-checkbox selection
- Simulated security option moved from separate dialog to main features dialog
- Improved user experience - from 3 separate dialogs down to 1
- Standard security (StaticWebApps) is now the default
- Terminal management moved to shared package for consistency
- Enhanced prompts with better defaults and descriptions

**Removed**
- Individual boolean prompts for REST, GraphQL, and Cache options
- Separate host mode selection dialog
- Separate security provider selection dialog
- Local runTerminal.ts in favor of shared package

**Fixed**
- .gitignore properly excludes .env files
- Connection string properly references @env() syntax
- Default selections align with best practices

### 0.1.0

- Initial release: Guided prompts for `dab init` and configuration updates.