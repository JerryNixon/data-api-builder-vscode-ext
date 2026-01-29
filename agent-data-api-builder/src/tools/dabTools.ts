#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execSync, spawn } from 'child_process';
import { SqlMetadataProvider } from './sqlMetadata.js';

interface RunResult {
  success: boolean;
  output?: string;
  error: string;
}

async function runDab(args: string[], options?: { background?: boolean }): Promise<RunResult> {
  const cmd = 'dab';
  
  if (options?.background) {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.unref();
    return { success: true, error: '' };
  }

  try {
    const output = execSync(`${cmd} ${args.join(' ')}`, {
      encoding: 'utf8',
      timeout: 30000
    });
    return { success: true, output: cleanOutput(output), error: '' };
  } catch (e: any) {
    return { success: false, error: cleanOutput(e.stderr || e.message) };
  }
}

function cleanOutput(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '').trim();
}

// Handle get_schema tool
async function handleGetSchema(args: Record<string, unknown>) {
  const connectionString = args.connection_string as string;
  const filter = (args.filter as string) || 'all';
  const schemaName = args.schema_name as string | undefined;
  const objectName = args.object_name as string | undefined;
  
  if (!connectionString) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'connection_string is required' }, null, 2) }],
      isError: true
    };
  }
  
  try {
    const provider = new SqlMetadataProvider();
    const schema = await provider.getSchema(connectionString);
    
    let result: object;
    
    if (filter === 'summary') {
      result = provider.getSummary(schema);
    } else {
      // Apply filters
      let objects = schema.objects;
      
      if (filter === 'tables') {
        objects = objects.filter(o => o.type === 'TABLE');
      } else if (filter === 'views') {
        objects = objects.filter(o => o.type === 'VIEW');
      } else if (filter === 'procedures') {
        objects = objects.filter(o => o.type === 'STORED_PROCEDURE');
      } else if (filter === 'functions') {
        objects = objects.filter(o => o.type === 'FUNCTION' || o.type === 'TABLE_FUNCTION');
      }
      
      if (schemaName) {
        objects = objects.filter(o => o.schema.toLowerCase() === schemaName.toLowerCase());
      }
      
      if (objectName) {
        objects = objects.filter(o => o.name.toLowerCase().includes(objectName.toLowerCase()));
      }
      
      result = {
        serverName: schema.serverName,
        databaseName: schema.databaseName,
        collation: schema.collation,
        objects,
        relationships: schema.relationships.filter(r => {
          if (schemaName && r.parentSchema.toLowerCase() !== schemaName.toLowerCase()) return false;
          if (objectName && !r.parentTable.toLowerCase().includes(objectName.toLowerCase()) && 
              !r.referencedTable.toLowerCase().includes(objectName.toLowerCase())) return false;
          return true;
        })
      };
    }
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error }, null, 2) }],
      isError: true
    };
  }
}

// Define the dab_cli tool
const tools = [
  {
    name: 'dab_cli',
    description: `Execute Data API Builder (DAB) CLI commands to create and manage REST, GraphQL, and MCP APIs from databases.

USE THIS TOOL WHEN:
- Creating a new DAB configuration (init)
- Adding database tables, views, or stored procedures as API entities (add)
- Updating entity configurations like permissions, mappings, or relationships (update)
- Configuring runtime settings like authentication, CORS, caching, or endpoints (configure)
- Validating a DAB configuration file for errors (validate)
- Starting or checking the status of the DAB server (start, status)

DO NOT use this tool to discover database schema - use get_schema instead.

Subcommands:
- init: Create a new dab-config.json with database connection
- add: Add a table, view, or stored procedure as an API entity
- update: Modify an existing entity's configuration
- configure: Set runtime options (auth, CORS, caching, paths)
- validate: Check configuration for errors
- start: Launch the DAB server
- status: Check if DAB is running and get endpoint URLs`,
    annotations: {
      title: 'Data API builder (DAB)',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        subcommand: {
          type: 'string',
          enum: ['init', 'add', 'update', 'configure', 'validate', 'start', 'status'],
          description: 'DAB CLI operation to perform'
        },
        config_path: {
          type: 'string',
          description: 'Path to dab-config.json (required for most commands, optional for status)'
        },
        parameters: {
          type: 'object',
          description: 'Free-form parameters for the command (e.g., entityName, source, databaseType, port, etc.)'
        }
      },
      required: ['subcommand']
    }
  },
  {
    name: 'get_schema',
    description: `Retrieve comprehensive database schema metadata from SQL Server.

USE THIS TOOL WHEN:
- You need to discover what tables, views, stored procedures, or functions exist in a database
- You need column names, data types, nullability, or constraints for a table
- You need to find primary keys, foreign keys, or indexes
- You need to understand relationships between tables
- You need stored procedure or function parameters
- Before adding entities to DAB to know what's available in the database

DO NOT use this tool to modify anything - it is read-only.
Use dab_cli to create or modify DAB configurations after discovering the schema.

Returns: Database server info, tables with columns/indexes, views, stored procedures with parameters, functions with parameters/return types, and foreign key relationships.`,
    annotations: {
      title: 'Get Database Schema',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        connection_string: {
          type: 'string',
          description: 'SQL Server connection string (e.g., "Server=localhost;Database=mydb;Integrated Security=true" or "Server=localhost;Database=mydb;User Id=sa;Password=xxx")'
        },
        filter: {
          type: 'string',
          enum: ['all', 'tables', 'views', 'procedures', 'functions', 'summary'],
          description: 'Filter results to specific object types. Use "summary" for a quick overview with counts and names only.'
        },
        schema_name: {
          type: 'string',
          description: 'Optional: filter to a specific schema (e.g., "dbo")'
        },
        object_name: {
          type: 'string',
          description: 'Optional: filter to a specific object name (e.g., "Products")'
        }
      },
      required: ['connection_string']
    }
  }
];

// Handle tool call
async function handleToolCall(name: string, args: Record<string, unknown>) {
  if (name === 'get_schema') {
    return handleGetSchema(args);
  }
  
  if (name !== 'dab_cli') {
    throw new Error(`Unknown tool: ${name}`);
  }

  const { subcommand, config_path, parameters } = args;
  const params = (parameters || {}) as Record<string, unknown>;
  const configPath = config_path as string | undefined;
  
  try {
    let result: object;
    
    switch (subcommand) {
      case 'init': {
        const databaseType = (params.databaseType as string) || 'mssql';
        const connStrEnvVar = (params.connectionStringEnvVar as string) || 'DATABASE_CONNECTION_STRING';
        const args = [
          'init',
          '--database-type', databaseType,
          '--connection-string', `@env('${connStrEnvVar}')`,
          '--host-mode', 'development',
          '--rest.enabled', 'true',
          '--graphql.enabled', 'true',
          '--mcp.enabled', 'true'
        ];
        if (configPath) args.push('--config', configPath);
        
        const runResult = await runDab(args);
        if (!runResult.success) throw new Error(runResult.error);
        result = { created: configPath, databaseType, envVar: connStrEnvVar };
        break;
      }
      
      case 'add': {
        const entityName = params.entityName as string;
        if (!entityName) throw new Error('entityName is required for dab add');
        
        const args = ['add', entityName];
        if (configPath) args.push('--config', configPath);
        
        for (const [key, value] of Object.entries(params)) {
          if (key === 'entityName') continue;
          const flagName = key === 'sourceType' ? 'source.type' : 
                          key.replace(/([A-Z])/g, '-$1').toLowerCase();
          args.push(`--${flagName}`, String(value));
        }
        
        const runResult = await runDab(args);
        if (!runResult.success) throw new Error(runResult.error);
        result = { entity: entityName, config: configPath, parameters: params };
        break;
      }
      
      case 'update': {
        const entityName = params.entityName as string;
        if (!entityName) throw new Error('entityName is required for dab update');
        
        const args = ['update', entityName];
        if (configPath) args.push('--config', configPath);
        
        for (const [key, value] of Object.entries(params)) {
          if (key === 'entityName') continue;
          const flagName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          args.push(`--${flagName}`, String(value));
        }
        
        const runResult = await runDab(args);
        if (!runResult.success) throw new Error(runResult.error);
        result = { updated: entityName, config: configPath, parameters: params };
        break;
      }
      
      case 'configure': {
        const args = ['configure'];
        if (configPath) args.push('--config', configPath);
        
        for (const [key, value] of Object.entries(params)) {
          const flagName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          args.push(`--${flagName}`, String(value));
        }
        
        const runResult = await runDab(args);
        if (!runResult.success) throw new Error(runResult.error);
        result = { configured: true, configPath };
        break;
      }
      
      case 'validate': {
        const args = ['validate'];
        if (configPath) args.push('--config', configPath);
        
        const runResult = await runDab(args);
        if (!runResult.success) throw new Error(runResult.error);
        result = { valid: true, configPath };
        break;
      }
      
      case 'start': {
        const args = ['start'];
        if (configPath) args.push('--config', configPath);
        
        const runResult = await runDab(args, { background: true });
        if (!runResult.success) throw new Error(runResult.error);
        result = { started: true, configPath };
        break;
      }
      
      case 'status': {
        const port = (params.port as number) || 5000;
        try {
          const response = await fetch(`http://localhost:${port}/health`);
          const healthy = response.ok;
          result = {
            running: healthy,
            port,
            endpoints: healthy ? {
              swagger: `http://localhost:${port}/swagger`,
              graphql: `http://localhost:${port}/graphql`,
              health: `http://localhost:${port}/health`,
              mcp: `http://localhost:${port}/mcp`
            } : null
          };
        } catch {
          result = { running: false, port };
        }
        break;
      }
      
      default:
        throw new Error(`Unknown subcommand: ${subcommand}`);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error }, null, 2)
        }
      ],
      isError: true
    };
  }
}

// Initialize server
const server = new Server(
  { name: 'dab-cli-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return handleToolCall(request.params.name, request.params.arguments ?? {});
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DAB CLI MCP Server running on stdio');
}

main().catch(console.error);

