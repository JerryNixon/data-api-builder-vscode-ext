# DAB MCP (Data API builder)

A Visual Studio Code extension that installs Data API Builder configurations as MCP (Model Context Protocol) servers.

![DAB MCP extension screenshot](https://github.com/JerryNixon/data-api-builder-vscode-ext/blob/master/mcp-data-api-builder/images/screenshot.png)

## Features

- Adds a right-click context menu for files named `dab-config.json` or `staticwebapp.database.config.json`.
- Automatically generates server name from the folder name (e.g., "my-project" becomes "my-project-mcp").
- Uses VS Code's MCP install protocol to handle installation automatically.
- Configures dynamic log level selection via VS Code input variable.
- One-click installation - no manual editing required.

## Usage

1. Right-click on a `dab-config.json` file in the Explorer.
2. Select **"Install MCP Server"** from the context menu.
3. VS Code will automatically handle the MCP server installation.
4. Restart VS Code to activate the MCP server.

## Requirements

- Ensure that `dab` is installed: `dotnet tool install microsoft.dataapibuilder -g`.
- GitHub Copilot Chat extension must be installed to use MCP servers.

## MCP Server Configuration

The extension adds a configuration like this to your VS Code settings using STDIO transport:

```json
{
  "servers": {
    "my-project-mcp": {
      "type": "stdio",
      "command": "dab",
      "args": [
        "start",
        "--mcp-stdio",
        "role:anonymous",
        "--loglevel",
        "${input:logLevel}",
        "--config",
        "${workspaceFolder}/dab-config.json"
      ]
    }
  },
  "inputs": [
    {
      "id": "logLevel",
      "type": "pickString",
      "description": "DAB log level",
      "default": "none",
      "options": ["none", "trace", "debug", "information", "warning", "error", "critical"]
    }
  ]
}
```

The server name is automatically generated from the folder name containing the config file. Spaces and special characters are converted to hyphens, and "-mcp" is appended.

The configuration path uses `${workspaceFolder}` variable for portability, with a relative path from the workspace root to the config file.

The log level uses an input variable `${input:logLevel}` which allows you to select the logging level dynamically when the MCP server starts.

Learn more about DAB's STDIO transport: https://learn.microsoft.com/en-us/azure/data-api-builder/mcp/stdio-transport

## Known Issues

- Requires VS Code restart to activate the MCP server after installation.
- MCP server feature requires GitHub Copilot Chat extension.

## Release Notes

### 1.0.3 - 2026-03-14

**Changed**
- Version bump for coordinated release

### 1.0.0 - 2026-03-13

**Added**
- Initial release
- Install MCP Server command for dab-config.json files
- Automatic server name generation from folder name (e.g., "my-project" → "my-project-mcp")
- Smart character cleaning (spaces and special characters converted to hyphens)
- Uses VS Code's `vscode:mcp/install` protocol for seamless installation
- Configures DAB with STDIO transport for MCP communication
- Uses `${workspaceFolder}` variable for portable configuration paths
- Dynamic log level selection with VS Code input variable (`${input:logLevel}`)
- One-click installation with no manual configuration needed
