# MCP Integration Guide for DAB Extensions

This guide documents how to integrate Model Context Protocol (MCP) servers into VS Code extensions, based on the successful integration in the `agent-data-api-builder` extension.

## Official Documentation

- **VS Code MCP Guide**: https://code.visualstudio.com/api/extension-guides/ai/mcp
- **MCP Specification**: https://modelcontextprotocol.io/
- **MCP TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk

## Architecture Overview

VS Code extensions register MCP servers using **`vscode.lm.registerMcpServerDefinitionProvider`**, NOT `vscode.lm.registerTool`. The MCP server runs as a **separate Node.js process** that communicates via stdio.

```
Extension Process                     MCP Server Process
┌────────────────┐                   ┌──────────────────┐
│ extension.ts   │                   │  server.ts       │
│                │                   │                  │
│ registerMcp... │─────spawns──────>│  Server()        │
│ Definition...  │<────stdio─────────│  tools/handlers  │
└────────────────┘                   └──────────────────┘
        │                                     │
        v                                     v
  GitHub Copilot ─────calls────────> Tool execution
```

## Implementation Steps

### 1. Add Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4"
  }
}
```

Note: `zod` is optional but recommended for schema validation.

### 2. Add Contribution Point

Add to `package.json`:

```json
{
  "contributes": {
    "mcpServerDefinitionProviders": [
      {
        "id": "yourProviderId",
        "label": "Your MCP Server"
      }
    ]
  }
}
```

### 3. Register MCP Server in Extension

In `extension.ts`:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const didChangeEmitter = new vscode.EventEmitter<void>();
  
  context.subscriptions.push(
    vscode.lm.registerMcpServerDefinitionProvider('yourProviderId', {
      onDidChangeMcpServerDefinitions: didChangeEmitter.event,
      
      provideMcpServerDefinitions: async () => {
        const serverPath = path.join(
          context.extensionPath,
          'out',
          'server',
          'index.js'
        );
        
        const server = new vscode.McpStdioServerDefinition(
          'your-server-name',
          'node',
          [serverPath]
        );
        
        return [server];
      },
      
      resolveMcpServerDefinition: async (definition) => {
        return definition;
      }
    })
  );
}
```

### 4. Create MCP Server

In `src/server/index.ts`:

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Define your tools
const tools = [
  {
    name: 'your_tool',
    description: 'Tool description',
    inputSchema: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Parameter description'
        }
      },
      required: ['param1']
    }
  }
];

// Handle tool calls
async function handleToolCall(name: string, args: Record<string, unknown>) {
  if (name === 'your_tool') {
    // Implement your tool logic
    const result = { success: true, data: 'result' };
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
}

// Initialize server
const server = new Server(
  { name: 'your-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return handleToolCall(request.params.name, request.params.arguments ?? {});
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

main().catch(console.error);
```

### 5. Update Build Configuration

Ensure TypeScript compiles the server file:

In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "outDir": "./out",
    "module": "commonjs",
    "target": "ES2020",
    "moduleResolution": "node"
  },
  "include": ["src/**/*"]
}
```

## Key Learnings

### ✅ Correct Approach

1. **Use `vscode.lm.registerMcpServerDefinitionProvider`** - This is the official VS Code API
2. **MCP server runs as separate process** - No VS Code API access in server code
3. **Use MCP SDK's `Server` class** - Not `McpServer` from newer SDK versions
4. **Use `StdioServerTransport`** - For stdin/stdout communication
5. **Define tools as plain objects** - With JSON Schema for `inputSchema`
6. **Use `setRequestHandler`** - For `ListToolsRequestSchema` and `CallToolRequestSchema`

### ❌ Common Mistakes

1. **DON'T use `vscode.lm.registerTool`** - This is for inline tools, not MCP servers
2. **DON'T use `McpServer` from SDK** - Causes TypeScript type inference errors
3. **DON'T use Zod schemas directly in tool config** - Use plain JSON Schema
4. **DON'T import `vscode` in server code** - Server runs in separate process
5. **DON'T add `mcpServers` to `contributes`** - Not a valid VS Code contribution point

## TypeScript Type Issues

If you encounter "Type instantiation is excessively deep" errors:

```typescript
// ❌ This causes type errors
server.registerTool("tool", {
  inputSchema: z.object({ ... })
}, handler);

// ✅ Use this pattern instead
const tools = [
  {
    name: 'tool',
    inputSchema: {
      type: 'object',
      properties: { ... }
    }
  }
];

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return handleToolCall(request.params.name, request.params.arguments ?? {});
});
```

## Debugging

### View MCP Server Logs

1. Open Output panel (View → Output)
2. Select "Extension Host" from dropdown
3. Look for your server's `console.error` messages

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "MCP server not found" | Server path incorrect | Check `serverPath` in `provideMcpServerDefinitions` |
| "Tool not available" | Server didn't start | Check Output panel for errors |
| TypeScript compile errors | Wrong SDK API | Use `Server`, not `McpServer` |
| "vscode is not defined" | Imported VS Code API in server | Remove `vscode` imports from server code |

## Testing

1. Press F5 to launch Extension Development Host
2. Open GitHub Copilot chat
3. Enable agent mode
4. Your MCP tools should appear in the tools picker
5. Test by asking the agent to use your tool

## Example: DAB CLI MCP Server

See `agent-data-api-builder/src/tools/dabTools.ts` for a complete working example that:

- Exposes `dab_cli` tool with 7 subcommands
- Executes DAB CLI commands via `execSync`/`spawn`
- Returns clean JSON responses
- Handles errors gracefully
- Strips ANSI codes from output

## Best Practices

1. **Keep server code simple** - No VS Code API dependencies
2. **Use descriptive tool names** - Follow snake_case convention
3. **Provide clear descriptions** - AI models use these to select tools
4. **Return structured JSON** - Makes responses easier to parse
5. **Handle errors gracefully** - Return error objects instead of throwing
6. **Log to stderr** - Use `console.error` for debugging (stdout is for MCP protocol)
7. **Clean output** - Strip ANSI codes and formatting from CLI output
8. **Test thoroughly** - MCP servers run in separate process with different environment

## Resources

- [VS Code MCP Extension Sample](https://github.com/microsoft/vscode-extension-samples/tree/main/mcp-extension-sample)
- [MCP for Beginners](https://github.com/microsoft/mcp-for-beginners)
- [DAB Agent Extension](./agent-data-api-builder/) - Working example in this repo
