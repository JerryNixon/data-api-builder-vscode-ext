# Init Data API Builder

A Visual Studio Code extension that guides users through initializing Data API Builder in a folder.

![](https://github.com/JerryNixon/data-api-builder-vscode-ext/blob/master/init-data-api-builder/images/screenshot.png?raw=true)

## Features

- Adds a right-click context menu for folders.
- Selects an existing MSSQL connection from `.env` or securely adds a new one.
- Runs one `dab init` process with development mode and local-development CORS enabled.
- Relies on DAB defaults for REST, GraphQL, MCP, request-body strictness, and unauthenticated access.
- Waits for the DAB CLI exit code before opening the generated configuration or reporting success.
- Creates or updates `.env` and `.gitignore` when a new connection is added.

## Requirements

- Ensure that `dab` is installed: `dotnet tool install microsoft.dataapibuilder -g`.

## Known Issues

- Assumes `dab` is available globally in your environment.
- Prompts may fail if folder paths contain unsupported characters.

## Release Notes

### 1.2.7 - 2026-07-28

**Changed**
- Reduced initialization from eight DAB CLI commands to one `dab init` process.
- Removed redundant REST, GraphQL, MCP, authentication, strictness, mode, and cache configuration operations.
- Moved wildcard CORS configuration into `dab init`.
- Deferred caching until an entity explicitly opts in.
- Wait for the CLI exit code and report failures instead of using a fixed delay.
- Updated documentation and the sample configuration to match actual behavior.

### 1.2.5 - 2026-03-14

**Changed**
- Version bump for coordinated release

### 0.2.0 - 2026-01-13

- Added connection selection backed by `.env`.
- Added `.gitignore` protection when creating a new connection.
- Migrated common connection management to `dab-vscode-shared`.

### 0.1.0

- Initial release: Guided prompts for `dab init` and configuration updates.