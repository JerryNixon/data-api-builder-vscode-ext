# DAB MCP Server

This directory contains the Model Context Protocol (MCP) server for the DAB Developer agent extension.

## Overview

The agent extension registers an MCP server using VS Code's `vscode.lm.registerMcpServerDefinitionProvider` API. This makes the `dab_cli` tool available to GitHub Copilot and other AI assistants automatically.

## Architecture

### Registration (extension.ts)
```typescript
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const didChangeEmitter = new vscode.EventEmitter<void>();
  context.subscriptions.push(
    vscode.lm.registerMcpServerDefinitionProvider('dabCli', {
      onDidChangeMcpServerDefinitions: didChangeEmitter.event,
      provideMcpServerDefinitions: async () => {
        const serverPath = path.join(context.extensionPath, 'out', 'tools', 'dabTools.js');
        const server = new vscode.McpStdioServerDefinition(
          'dab-cli',
          'node',
          [serverPath]
        );
        return [server];
      },
      resolveMcpServerDefinition: async (definition) => definition
    })
  );
}
```

### MCP Server Implementation (dabTools.ts)

The server is a standalone Node.js process that uses the MCP SDK to expose tools:

- **Tool Name:** `dab_cli`
- **Subcommands:** init, add, update, configure, validate, start, status
- **Communication:** stdio transport (standard input/output)
- **Output:** Clean JSON responses (ANSI codes stripped)

### Implementation Details

1. **Server Process:** Runs as a separate Node.js process alongside the extension
2. **CLI Execution:** Uses `execSync` for synchronous commands, `spawn` for background processes
3. **Error Handling:** Returns structured JSON with error messages
4. **Dynamic Parameters:** Accepts free-form parameters object for command-specific args

## Usage in Agent

The agent references the tool in its `.agent.md` file and AI assistants can invoke it:

```json
{
  "subcommand": "init",
  "config_path": "dab-config.json",
  "parameters": {
    "databaseType": "mssql",
    "connectionStringEnvVar": "DATABASE_CONNECTION_STRING"
  }
}
```

## Benefits

1. **Standard MCP Protocol:** Works across VS Code, Claude Desktop, and other MCP clients
2. **Separate Process:** No VS Code API access needed in the server code
3. **Clean Output:** JSON responses without terminal noise
4. **Simple Schema:** Only 3 parameters (subcommand, config_path, parameters)
5. **Automatic Discovery:** VS Code loads the server on extension activation

## Testing

To test the MCP server:

1. Run the extension in Extension Development Host (F5)
2. Open GitHub Copilot chat
3. Ask: "@dab create a new API for my database"
4. The agent will use the `dab_cli` tool via the MCP server

## Debugging

The MCP server logs to stderr. To see logs:
1. Open the Output panel (View → Output)
2. Select "Extension Host" from the dropdown
3. Look for "DAB CLI MCP Server running on stdio"

## See Also

- [.github/agents/dab-developer.agent.md](../../../.github/agents/dab-developer.agent.md) - Agent instructions
- [VS Code MCP Guide](https://code.visualstudio.com/api/extension-guides/ai/mcp) - Official documentation
- [MCP Specification](https://modelcontextprotocol.io/) - Protocol details
