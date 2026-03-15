# Start Data API Builder

A Visual Studio Code extension that adds a quick way to start Data API Builder directly from `dab-config.json`.

![](https://raw.githubusercontent.com/JerryNixon/data-api-builder-vscode-ext/refs/heads/master/add-data-api-builder/images/screenshot.png)

## Features

- Adds a right-click context menu for files named `dab-config.json`.
- Automatically opens a new terminal and runs `dab start`.

## Requirements

- Ensure that `dab` is installed: `dotnet tool install microsoft.dataapibuilder -g`

## Known Issues

- Only files named exactly `dab-config.json` will show the context menu option.
- The terminal assumes `dab` is available globally in your environment.

## Release Notes

### 1.2.2 - 2026-03-14

**Changed**
- Version bump for coordinated release
- SQL Server TCP/IP connectivity improvements

### 0.2.0 - 2026-01-13

**Added**
- Auto-dismiss dialogs after 5 seconds for better UX (error, info, warning messages)
- Data types in field descriptions for tables and views (e.g., "ActorId (int)")
- Parameter descriptions with types for stored procedures
- Field descriptions for stored procedure result columns
- Required `--fields.primary-key` parameter for all table/view fields

**Fixed**
- Stored procedure parameter handling (removed incorrect `--source.params` usage)
- Entity names now strip brackets to avoid CLI errors
- Stored procedures default to GET method instead of POST
- Async filtering bug preventing duplicate stored procedure detection
- Removed incorrect `--map` usage for tables and views
- Relationship field parsing to use `source.fields`/`target.fields` from config JSON
- Bidirectional relationship filtering to properly exclude already-added relationships
- Undefined field array handling that caused "Cannot read properties of undefined" errors

**Changed**
- Enhanced SQL queries to retrieve column data types via `TYPE_NAME()`
- Improved relationship duplicate detection to check both forward and reverse relationships

### 0.1.0

- Initial release: Context menu and terminal support for starting DAB.