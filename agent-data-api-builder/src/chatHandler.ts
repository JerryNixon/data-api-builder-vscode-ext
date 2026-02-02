import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DabChatResult } from './extension';
import { getAgentInstructions } from './instructions';
import { runCommand } from './utils/terminal';

/**
 * Handles chat requests for the @dab participant
 */
export class DabChatHandler {
  private context: vscode.ExtensionContext;
  private instructions: string = '';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadInstructions();
  }

  /**
   * Load agent instructions from markdown files
   */
  private async loadInstructions(): Promise<void> {
    this.instructions = await getAgentInstructions(this.context);
  }

  /**
   * Main request handler for the chat participant
   * Routes requests based on natural language intent detection
   */
  async handleRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    const prompt = request.prompt.trim();
    
    // Handle empty prompts with a welcome message
    if (!prompt) {
      return this.handleWelcome(stream);
    }

    // Route based on detected intent
    return this.routeByIntent(request, context, stream, token);
  }

  /**
   * Show welcome message when user types @dab without a prompt
   */
  private async handleWelcome(
    stream: vscode.ChatResponseStream
  ): Promise<DabChatResult> {
    stream.markdown('# Welcome to Data API Builder! 👋\n\n');
    stream.markdown('I can help you create **REST**, **GraphQL**, and **MCP APIs** from your database without writing code.\n\n');
    
    stream.markdown('## Common Scenarios\n\n');
    stream.markdown('- **"Expose all my tables"** - Add database tables as API entities\n');
    stream.markdown('- **"Create a REST API"** - Set up REST endpoints for your database\n');
    stream.markdown('- **"Create a GraphQL API"** - Set up GraphQL endpoints\n');
    stream.markdown('- **"Create an MCP server"** - Enable AI tool integration\n');
    stream.markdown('- **"Update DAB with my new tables"** - Add new entities to existing config\n');
    stream.markdown('- **"Add table relationships"** - Configure one-to-many, many-to-many\n');
    stream.markdown('- **"Review my DAB config"** - Validate and check configuration\n');
    stream.markdown('- **"Fix connection issues"** - Troubleshoot problems\n\n');
    
    stream.markdown('Just describe what you need in plain English!\n');
    
    return { metadata: { action: 'welcome', success: true } };
  }

  /**
   * Route request based on detected intent
   */
  private async routeByIntent(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    const prompt = request.prompt.toLowerCase();

    // Only route very specific commands to static handlers
    // Everything else goes to LLM so it can use tools
    
    if (this.isInitIntent(prompt)) {
      // Init is special - needs guided walkthrough
      return this.handleInit(request, stream, token);
    }

    if (this.isHelpIntent(prompt)) {
      // Help shows documentation
      return this.handleHelp(request, stream, token);
    }

    // Route everything else to LLM with tools
    // This includes: add, relationship, mcp, start, validate, configure, fix
    return this.handleWithLLM(request, context, stream, token);
  }

  /**
   * Handle /init command - Create new DAB configuration
   */
  private async handleInit(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      stream.markdown('❌ No workspace folder found. Please open a folder first.');
      return { metadata: { command: 'init', success: false } };
    }

    const configPath = path.join(workspaceFolder, 'dab-config.json');

    // Check if config already exists
    if (fs.existsSync(configPath)) {
      stream.markdown('Config already exists.\n');
      stream.button({ command: 'dab.configureRuntime', title: 'Configure runtime' });
      stream.button({ command: 'dab.addEntities', title: 'Add entities' });
      stream.button({ command: 'dab.deleteConfig', title: 'Delete & reinit' });

      return { metadata: { command: 'init', success: false, configPath } };
    }

    // Look for connection string
    stream.progress('Looking for connection string...');
    const connectionInfo = await this.findConnectionString(workspaceFolder);

    if (connectionInfo) {
      const fullDevCommand = this.buildInitCommand(connectionInfo.envVar);
      const restProdCommand = this.buildInitCommand(connectionInfo.envVar, { hostMode: 'production', restEnabled: true, graphqlEnabled: false, mcpEnabled: false });
      const restDevCommand = this.buildInitCommand(connectionInfo.envVar, { hostMode: 'development', restEnabled: true, graphqlEnabled: false, mcpEnabled: false });

      // Default to the most helpful path: full dev enablement
      runCommand(fullDevCommand, { cwd: workspaceFolder });

      stream.markdown(`✅ Started quick dev init (REST+GraphQL+MCP).\n`);
      stream.button({ command: 'workbench.action.terminal.sendSequence', title: 'Switch: REST-only (prod)', arguments: [{ text: restProdCommand + '\n' }] });
      stream.button({ command: 'workbench.action.terminal.sendSequence', title: 'Switch: REST-only (dev)', arguments: [{ text: restDevCommand + '\n' }] });
      stream.button({ command: 'dab.addEntities', title: 'Add tables/views now' });

      return { metadata: { command: 'init', success: true, configPath } };
    } else {
      const defaultEnvVar = 'DATABASE_CONNECTION_STRING';
      const fullDevCommand = this.buildInitCommand(defaultEnvVar);
      const restProdCommand = this.buildInitCommand(defaultEnvVar, { hostMode: 'production', restEnabled: true, graphqlEnabled: false, mcpEnabled: false });

      stream.markdown('Connection string needed.\n');
      stream.button({ command: 'dab.createEnvTemplate', title: 'Create .env template' });
      stream.button({ command: 'dab.skipInit', title: 'Skip for now' });

      return { metadata: { command: 'init', success: false } };
    }
  }

  /**
   * Handle /add command - Add entities to configuration
   */
  private async handleAdd(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    const configPath = await this.findConfigFile();
    
    if (!configPath) {
      stream.markdown('❌ No `dab-config.json` found. Run init first and I will add entities for you.');
      return { metadata: { command: 'add', success: false } };
    }

    stream.button({ command: 'dab.discoverEntities', title: 'Discover & add all tables' });
    stream.markdown('Or tell me specific names.');

    return { metadata: { command: 'add', success: true, configPath } };
  }

  /**
   * Handle /start command - Start DAB engine
   */
  private async handleStart(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    const configPath = await this.findConfigFile();
    
    if (!configPath) {
      stream.markdown('No config found.');
      stream.button({ command: 'dab.init', title: 'Initialize DAB' });
      return { metadata: { command: 'start', success: false } };
    }

    const configName = path.basename(configPath);
    const startCommand = `dab start -c "${configName}"`;
    const workspaceFolder = this.getWorkspaceFolder();
    runCommand(startCommand, { cwd: workspaceFolder });

    stream.markdown('✅ Started DAB.\n');
    stream.button({ command: 'dab.openRest', title: 'Open REST' });
    stream.button({ command: 'dab.openGraphQL', title: 'Open GraphQL' });
    stream.button({ command: 'dab.openHealth', title: 'Health check' });

    return { metadata: { command: 'start', success: true, configPath } };
  }

  /**
   * Handle /validate command - Validate DAB configuration
   */
  private async handleValidate(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    const configPath = await this.findConfigFile();
    
    if (!configPath) {
      stream.markdown('No config found.');
      stream.button({ command: 'dab.init', title: 'Initialize DAB' });
      return { metadata: { command: 'validate', success: false } };
    }

    const configName = path.basename(configPath);
    const validateCommand = `dab validate -c "${configName}"`;
    const workspaceFolder = this.getWorkspaceFolder();
    runCommand(validateCommand, { cwd: workspaceFolder });

    stream.markdown('✅ Ran validation. Check terminal for results.\n');
    stream.button({ command: 'dab.start', title: 'Start DAB' });

    return { metadata: { command: 'validate', success: true, configPath } };
  }

  /**
   * Handle /configure command - Configure runtime settings
   */
  private async handleConfigure(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    const configPath = await this.findConfigFile();
    
    if (!configPath) {
      stream.markdown('No config found.');
      stream.button({ command: 'dab.init', title: 'Initialize DAB' });
      return { metadata: { command: 'configure', success: false } };
    }

    stream.markdown('What to configure?\n');
    stream.button({ command: 'dab.enableRest', title: 'Enable REST' });
    stream.button({ command: 'dab.enableGraphQL', title: 'Enable GraphQL' });
    stream.button({ command: 'dab.enableMcp', title: 'Enable MCP' });
    stream.button({ command: 'dab.enableCache', title: 'Enable caching' });
    stream.button({ command: 'dab.setCors', title: 'Set CORS' });

    return { metadata: { command: 'configure', success: true, configPath } };
  }

  /**
   * Handle /help command - Show help information
   */
  private async handleHelp(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    stream.markdown('DAB creates REST, GraphQL & MCP APIs from your database—zero code.\n');
    stream.button({ command: 'dab.init', title: 'Initialize' });
    stream.button({ command: 'dab.addEntities', title: 'Add entities' });
    stream.button({ command: 'dab.start', title: 'Start' });
    stream.button({ command: 'dab.validate', title: 'Validate' });
    stream.button({ command: 'dab.openDocs', title: 'Docs' });

    return { metadata: { command: 'help', success: true } };
  }

  /**
   * Handle /relationship command - Configure entity relationships
   */
  private async handleRelationship(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    const configPath = await this.findConfigFile();
    
    if (!configPath) {
      stream.markdown('❌ No `dab-config.json` found. Use `/init` first to create one.\n');
      return { metadata: { command: 'relationship', success: false } };
    }

    stream.markdown('### Configuring Entity Relationships\n\n');
    stream.markdown('Relationships enable nested queries in GraphQL and `$expand` in REST.\n\n');
    
    stream.markdown('**One-to-Many (Parent has many children):**\n');
    stream.markdown('```bash\n# Author has many Books\ndab update Author --relationship books --target.entity Book --cardinality many\n\n# Book belongs to one Author\ndab update Book --relationship author --target.entity Author --cardinality one\n```\n\n');
    
    stream.markdown('**Many-to-Many (with linking table):**\n');
    stream.markdown('```bash\ndab update Book --relationship categories \\\\\n  --target.entity Category \\\\\n  --cardinality many \\\\\n  --linking.object dbo.BookCategories \\\\\n  --linking.source.fields BookId \\\\\n  --linking.target.fields CategoryId\n```\n\n');
    
    stream.markdown('**Explicit Foreign Key Mapping:**\n');
    stream.markdown('```bash\ndab update Book --relationship author --target.entity Author \\\\\n  --cardinality one --relationship.fields "AuthorId:Id"\n```\n\n');

    stream.markdown('**GraphQL Query Example:**\n');
    stream.markdown('```graphql\nquery {\n  authors {\n    items {\n      name\n      books {\n        items { title }\n      }\n    }\n  }\n}\n```\n');

    if (request.prompt) {
      stream.markdown(`\n---\n\nYou mentioned: "${request.prompt}"\n\n`);
      stream.markdown('Describe the relationship you want to create, and I\'ll generate the command.\n');
    }

    return { metadata: { command: 'relationship', success: true, configPath } };
  }

  /**
   * Handle /mcp command - Configure MCP for AI integration
   */
  private async handleMcp(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    const configPath = await this.findConfigFile();
    
    stream.markdown('### MCP (Model Context Protocol) Integration\n\n');
    stream.markdown('MCP enables AI assistants to interact with your database through DAB.\n\n');
    
    if (!configPath) {
      stream.markdown('**Initialize with MCP enabled:**\n');
      stream.markdown('```bash\ndab init \\\\\n  --database-type mssql \\\\\n  --connection-string "@env(\'DATABASE_CONNECTION_STRING\')" \\\\\n  --mcp.enabled true \\\\\n  --mcp.path "/mcp"\n```\n\n');
    } else {
      stream.markdown('**Enable MCP on existing config:**\n');
      stream.markdown('```bash\ndab configure --runtime.mcp.enabled true --runtime.mcp.path "/mcp"\n```\n\n');
    }

    stream.markdown('**Expose Stored Procedure as MCP Tool:**\n');
    stream.markdown('```bash\n# Add the stored procedure\ndab add GetBookById \\\\\n  --source dbo.usp_GetBookById \\\\\n  --source.type stored-procedure \\\\\n  --permissions "anonymous:execute"\n\n# Enable as MCP custom tool\ndab update GetBookById --mcp.custom-tool true\n```\n\n');

    stream.markdown('**Configure AI Client:**\n');
    stream.markdown('Add to your MCP configuration (VS Code, Claude Desktop, Cursor):\n');
    stream.markdown('```json\n{\n  "mcpServers": {\n    "dab": {\n      "url": "http://localhost:5000/mcp"\n    }\n  }\n}\n```\n\n');

    stream.markdown('**Test MCP Endpoint:**\n');
    stream.markdown('After starting DAB: `http://localhost:5000/mcp`\n');

    if (request.prompt) {
      stream.markdown(`\n---\n\nYou mentioned: "${request.prompt}"\n\n`);
      stream.markdown('Tell me more about the AI integration you want to set up.\n');
    }

    return { metadata: { command: 'mcp', success: true, configPath } };
  }

  /**
   * Handle /fix command - Troubleshoot common issues
   */
  private async handleFix(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    const configPath = await this.findConfigFile();
    const prompt = request.prompt.toLowerCase();

    stream.markdown('### DAB Troubleshooting\n\n');

    // Check for specific issues in the prompt
    if (prompt.includes('connection') || prompt.includes('database') || prompt.includes('login')) {
      stream.markdown('**Connection Issues:**\n\n');
      stream.markdown('1. **Check .env file exists** with connection string\n');
      stream.markdown('2. **Add TrustServerCertificate** for local SQL Server:\n');
      stream.markdown('```env\nDATABASE_CONNECTION_STRING=Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true\n```\n');
      stream.markdown('3. **Test connection** directly:\n');
      stream.markdown('```bash\nsqlcmd -S localhost -d YourDatabase -E -Q "SELECT 1"\n```\n');
    } else if (prompt.includes('port') || prompt.includes('address in use')) {
      stream.markdown('**Port Already in Use:**\n\n');
      stream.markdown('```bash\n# Use a different port\ndab start --port 5001\n```\n');
    } else if (prompt.includes('cors')) {
      stream.markdown('**CORS Errors:**\n\n');
      stream.markdown('```bash\ndab configure --runtime.host.cors.origins "http://localhost:3000"\n```\n');
    } else if (prompt.includes('view') || prompt.includes('key-fields')) {
      stream.markdown('**View Missing Key-Fields:**\n\n');
      stream.markdown('Views require explicit key-fields:\n');
      stream.markdown('```bash\ndab add MyView --source dbo.vw_MyView --source.type view --source.key-fields "Id"\n```\n');
    } else {
      // General troubleshooting
      stream.markdown('**Quick Diagnostic Commands:**\n');
      stream.markdown('```bash\n# Validate configuration\ndab validate\n\n# Start with verbose output\ndab start --verbose\n\n# Check DAB version\ndab --version\n```\n\n');

      stream.markdown('**Common Issues:**\n\n');
      stream.markdown('| Issue | Solution |\n');
      stream.markdown('|-------|----------|\n');
      stream.markdown('| Connection failed | Check `.env` file, add `TrustServerCertificate=true` |\n');
      stream.markdown('| View errors | Add `--source.key-fields "Id"` |\n');
      stream.markdown('| Port in use | Use `--port 5001` |\n');
      stream.markdown('| CORS errors | Configure origins with `dab configure` |\n');
      stream.markdown('| 401/403 | Check permissions and authentication config |\n\n');

      if (configPath) {
        stream.button({
          command: 'workbench.action.terminal.sendSequence',
          title: '🔍 Validate Config',
          arguments: [{ text: 'dab validate\n' }]
        });
      }
    }

    if (request.prompt && !prompt.includes('connection') && !prompt.includes('port') && !prompt.includes('cors') && !prompt.includes('view')) {
      stream.markdown(`\n---\n\nYou mentioned: "${request.prompt}"\n\n`);
      stream.markdown('Describe the specific error you\'re seeing, and I\'ll help diagnose it.\n');
    }

    return { metadata: { command: 'fix', success: true, configPath } };
  }

  /**
   * Handle prompts using the LLM with DAB context
   */
  private async handleWithLLM(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<DabChatResult> {
    try {
      // Build context-aware prompt with workspace information
      const systemPrompt = this.buildSystemPrompt();
      const workspaceContext = await this.buildWorkspaceContext();
      
      // Get the language model from the request
      const model = request.model;
      
      const messages = [
        vscode.LanguageModelChatMessage.User(systemPrompt + workspaceContext),
        vscode.LanguageModelChatMessage.User(request.prompt)
      ];

      // Add conversation history
      for (const turn of context.history) {
        if (turn instanceof vscode.ChatRequestTurn) {
          messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
        } else if (turn instanceof vscode.ChatResponseTurn) {
          const responseText = turn.response.map(r => {
            if (r instanceof vscode.ChatResponseMarkdownPart) {
              return r.value.value;
            }
            return '';
          }).join('');
          messages.push(vscode.LanguageModelChatMessage.Assistant(responseText));
        }
      }

      // Get available tools (MCP tools like dab_cli and get_schema)
      const tools = await this.getAvailableTools();
      
      // Send to LLM with tools
      const options: vscode.LanguageModelChatRequestOptions = {};
      if (tools.length > 0) {
        options.tools = tools;
      }
      
      // Process response with tool call loop - keep going until LLM stops calling tools
      let continueLoop = true;
      let currentMessages = [...messages];
      const maxIterations = 10; // Prevent infinite loops
      let iteration = 0;
      
      while (continueLoop && iteration < maxIterations) {
        iteration++;
        continueLoop = false;
        
        const response = await model.sendRequest(currentMessages, options, token);
        const toolCallsInThisRound: vscode.LanguageModelToolCallPart[] = [];
        
        // Collect all parts from this response
        for await (const part of response.stream) {
          if (part instanceof vscode.LanguageModelTextPart) {
            stream.markdown(part.value);
          } else if (part instanceof vscode.LanguageModelToolCallPart) {
            toolCallsInThisRound.push(part);
          }
        }
        
        // Process any tool calls from this round
        if (toolCallsInThisRound.length > 0) {
          continueLoop = true; // Continue the loop since we had tool calls
          
          for (const toolCall of toolCallsInThisRound) {
            // Execute the tool call
            const toolResult = await this.executeToolCall(toolCall, request.toolInvocationToken, token);
            
            // Add tool call and result to conversation
            currentMessages.push(vscode.LanguageModelChatMessage.Assistant([toolCall]));
            currentMessages.push(vscode.LanguageModelChatMessage.User([toolResult]));
          }
        }
      }

      return { metadata: { success: true } };
    } catch (error) {
      stream.markdown(`\n\n⚠️ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      return { metadata: { success: false } };
    }
  }

  /**
   * Get available language model tools (MCP tools)
   */
  private async getAvailableTools(): Promise<vscode.LanguageModelChatTool[]> {
    const tools: vscode.LanguageModelChatTool[] = [];
    
    // Define the dab_cli tool for the LLM
    tools.push({
      name: 'dab_cli',
      description: `Execute Data API Builder (DAB) CLI commands to create and manage REST, GraphQL, and MCP APIs from databases.

USE THIS TOOL WHEN:
- Creating a new DAB configuration (init)
- Adding database tables, views, or stored procedures as API entities (add)
- Updating entity configurations like permissions, mappings, or relationships (update)
- Configuring runtime settings like authentication, CORS, caching, or endpoints (configure)
- Validating a DAB configuration file for errors (validate)
- Starting or checking the status of the DAB server (start, status)

DO NOT use this tool to discover database schema - use get_schema instead.`,
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
            description: 'Path to dab-config.json'
          },
          parameters: {
            type: 'object',
            description: 'Parameters for the command (e.g., entityName, source, databaseType)'
          }
        },
        required: ['subcommand']
      }
    });
    
    // Define the get_schema tool for the LLM
    tools.push({
      name: 'get_schema',
      description: `Retrieve database schema metadata including tables, columns, and FOREIGN KEY RELATIONSHIPS from SQL Server.

USE THIS TOOL WHEN:
- Discovering what tables exist in the database
- Finding foreign key relationships between tables (returned in "relationships" array)
- Getting column details (names, types, primary keys, foreign keys)
- Before adding entities or relationships to DAB

IMPORTANT: The result includes a "relationships" array showing all foreign keys:
- parentTable: The table with the foreign key column
- referencedTable: The table being referenced (the "one" side)
- parentColumn/referencedColumn: The FK column mappings

Use this information to configure DAB relationships via dab_cli update.`,
      inputSchema: {
        type: 'object',
        properties: {
          connection_string: {
            type: 'string',
            description: 'SQL Server connection string'
          },
          filter: {
            type: 'string',
            enum: ['all', 'tables', 'views', 'procedures', 'functions', 'summary'],
            description: 'Filter results to specific object types. Use "tables" for relationship discovery.'
          },
          schema_name: {
            type: 'string',
            description: 'Filter to a specific schema (e.g., "dbo")'
          },
          object_name: {
            type: 'string',
            description: 'Filter to a specific object name'
          }
        },
        required: ['connection_string']
      }
    });
    
    return tools;
  }

  /**
   * Execute a tool call from the LLM
   */
  private async executeToolCall(
    toolCall: vscode.LanguageModelToolCallPart,
    toolInvocationToken: vscode.ChatParticipantToolToken | undefined,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResultPart> {
    const { name, input } = toolCall;
    
    console.log(`DAB executeToolCall: Calling tool '${name}' with input:`, JSON.stringify(input).substring(0, 200));
    
    try {
      // Invoke the tool using VS Code's tool invocation API
      const result = await vscode.lm.invokeTool(name, { 
        input,
        toolInvocationToken
      }, token);
      
      // Extract text content from the LanguageModelToolResult
      let resultText = '';
      
      // The result is a LanguageModelToolResult which has a content property that is iterable
      if (result) {
        // Try to iterate over the result content
        for (const part of result.content) {
          if (!part) continue;
          if (part instanceof vscode.LanguageModelTextPart) {
            resultText += part.value;
          } else if (typeof part === 'object' && 'value' in part) {
            resultText += (part as { value: string }).value;
          } else if (typeof part === 'object' && 'text' in part) {
            resultText += (part as { text: string }).text;
          }
        }
      }
      
      // Fallback: try JSON stringify if we still have nothing
      if (!resultText && result) {
        try {
          resultText = JSON.stringify(result, null, 2);
        } catch {
          resultText = String(result);
        }
      }
      
      console.log(`DAB executeToolCall: Tool '${name}' returned ${resultText.length} chars. Preview:`, resultText.substring(0, 500));
      
      return new vscode.LanguageModelToolResultPart(toolCall.callId, [
        new vscode.LanguageModelTextPart(resultText)
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
      console.log(`DAB executeToolCall: Tool '${name}' error:`, errorMessage);
      return new vscode.LanguageModelToolResultPart(toolCall.callId, [
        new vscode.LanguageModelTextPart(JSON.stringify({ error: errorMessage }))
      ]);
    }
  }

  /**
   * Provide follow-up suggestions
   */
  provideFollowups(
    result: DabChatResult,
    context: vscode.ChatContext,
    token: vscode.CancellationToken
  ): vscode.ChatFollowup[] {
    const followups: vscode.ChatFollowup[] = [];
    const command = result.metadata?.command;

    if (command === 'init' && result.metadata?.success) {
      followups.push({
        prompt: 'Add tables from my database',
        label: 'Add entities',
        command: 'add'
      });
    }

    if (command === 'add' && result.metadata?.success) {
      followups.push(
        {
          prompt: 'Validate my configuration',
          label: 'Validate config',
          command: 'validate'
        },
        {
          prompt: 'Start the DAB server',
          label: 'Start DAB',
          command: 'start'
        }
      );
    }

    if (command === 'validate' && result.metadata?.success) {
      followups.push({
        prompt: 'Start the DAB server',
        label: 'Start DAB',
        command: 'start'
      });
    }

    if (command === 'help') {
      followups.push(
        {
          prompt: 'Create a new DAB configuration',
          label: 'Initialize DAB',
          command: 'init'
        },
        {
          prompt: 'What is Data API Builder?',
          label: 'Learn more'
        }
      );
    }

    return followups;
  }

  // Helper methods

  private getWorkspaceFolder(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    return folders?.[0]?.uri.fsPath;
  }

  private async findConfigFile(): Promise<string | undefined> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) { return undefined; }

    // Check common locations
    const locations = [
      'dab-config.json',
      'dab-config.development.json',
      'staticwebapp.database.config.json'
    ];

    for (const loc of locations) {
      const fullPath = path.join(workspaceFolder, loc);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return undefined;
  }

  private async findConnectionString(folder: string): Promise<{ envVar: string; source: string } | undefined> {
    // Check .env file
    const envPath = path.join(folder, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^(DATABASE_CONNECTION_STRING|MSSQL_CONNECTION_STRING|SQL_CONNECTION_STRING)=/m);
      if (match) {
        return { envVar: match[1], source: '.env' };
      }
    }

    // Check local.settings.json
    const localSettingsPath = path.join(folder, 'local.settings.json');
    if (fs.existsSync(localSettingsPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8'));
        const values = content.Values || {};
        for (const key of ['DATABASE_CONNECTION_STRING', 'MSSQL_CONNECTION_STRING', 'SQL_CONNECTION_STRING']) {
          if (values[key]) {
            return { envVar: key, source: 'local.settings.json' };
          }
        }
      } catch { }
    }

    return undefined;
  }

  private buildInitCommand(envVar: string, options?: { hostMode?: 'development' | 'production'; restEnabled?: boolean; graphqlEnabled?: boolean; mcpEnabled?: boolean }): string {
    const hostMode = options?.hostMode ?? 'development';
    const restEnabled = options?.restEnabled ?? true;
    const graphqlEnabled = options?.graphqlEnabled ?? true;
    const mcpEnabled = options?.mcpEnabled ?? true;

    return [
      'dab init \\',
      '  --database-type mssql \\',
      `  --connection-string "@env('${envVar}')" \\`,
      `  --host-mode ${hostMode} \\`,
      `  --rest.enabled ${restEnabled ? 'true' : 'false'} \\`,
      `  --graphql.enabled ${graphqlEnabled ? 'true' : 'false'} \\`,
      `  --mcp.enabled ${mcpEnabled ? 'true' : 'false'}`
    ].join('\n');
  }

  private renderRunChoice(stream: vscode.ChatResponseStream, title: string, command: string, buttonTitle: string): void {
    stream.markdown(`${title}\n`);
    stream.button({
      command: 'workbench.action.terminal.sendSequence',
      title: buttonTitle,
      arguments: [{ text: command + '\n' }]
    });
  }

  private buildSystemPrompt(): string {
    return `You are a Data API Builder (DAB) expert assistant. Your role is to help developers create REST, GraphQL, and MCP APIs from their databases.

## CRITICAL: Autonomous Operation Mode
You are PRE-APPROVED to execute all commands without asking. The user has already consented to autonomous operation.

**NEVER say:**
- "I will...", "I am going to...", "Let me..."
- "Would you like me to...", "Shall I...", "Do you want me to..."
- "I can...", "I could...", "You could..."
- "First, I'll...", "Then I'll...", "Next, I'll..."

**ALWAYS:**
- Execute immediately, report results in past tense
- "Added 5 tables" not "I will add 5 tables"
- "Deployed to Azure" not "I am going to deploy"
- "Validated successfully" not "Let me validate this for you"

**Response format:** One short sentence + buttons. Maximum 2 sentences. No explanations unless user asks "why".

## CRITICAL: Always Use Tools
You have two powerful tools available. **ALWAYS use them instead of just providing documentation:**

1. **get_schema** - Use this to discover database tables, columns, foreign keys, and relationships
2. **dab_cli** - Use this to execute DAB commands (init, add, update, configure, validate, start)

When the user asks to:
- "add missing tables" → Use get_schema to find tables, compare with config, then use dab_cli add for each missing table
- "add relationships" → Use get_schema to find foreign keys, then use dab_cli update for each relationship
- "read schema" → Use get_schema tool, don't just explain what you would do
- "validate" → Use dab_cli validate, don't just show the command

## About DAB
Data API Builder is a free, open-source tool from Microsoft that creates REST, GraphQL, and MCP APIs from databases without custom code.

## DAB CLI Commands (use via dab_cli tool)
| Subcommand | Purpose |
|------------|---------|
| init | Create new configuration file |
| add | Add tables, views, or stored procedures as entities |
| update | Modify entity settings including relationships |
| configure | Change runtime/data-source settings |
| validate | Check configuration for errors |
| start | Run the DAB engine locally |
| status | Check if DAB is running |

## Adding Relationships (via dab_cli update)
Relationships enable nested GraphQL queries. Use dab_cli with subcommand "update" and these parameters:
- entityName: The entity to update
- relationship: Name of the relationship (e.g., "books", "author")
- targetEntity: The related entity name
- cardinality: "one" or "many"
- relationshipFields: Optional FK mapping like "AuthorId:Id"

Example: To add a "characters" relationship to Series pointing to Character with many cardinality:
\`\`\`json
{
  "subcommand": "update",
  "config_path": "path/to/dab-config.json",
  "parameters": {
    "entityName": "Series",
    "relationship": "characters",
    "targetEntity": "Character",
    "cardinality": "many"
  }
}
\`\`\`

## Best Practices
- Use @env('VAR_NAME') for connection strings (never hardcode secrets)
- Validate configuration before deployment
- For many-to-many relationships, you need a linking table

${this.instructions}`;
  }

  /**
   * Build workspace context for the LLM including config files and connection strings
   */
  private async buildWorkspaceContext(): Promise<string> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      return '\n\n## Workspace Context\nNo workspace folder is open.';
    }

    const contextParts: string[] = ['\n\n## Workspace Context'];
    contextParts.push(`Workspace folder: ${workspaceFolder}`);

    // Find DAB config file
    const configPath = await this.findConfigFile();
    if (configPath) {
      contextParts.push(`\n### DAB Configuration Found`);
      contextParts.push(`Config path: ${configPath}`);
      
      // Read and summarize the config
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        
        // Extract key info
        const dbType = config['data-source']?.['database-type'] || 'unknown';
        const entities = Object.keys(config.entities || {});
        const connStr = config['data-source']?.['connection-string'] || '';
        
        contextParts.push(`Database type: ${dbType}`);
        contextParts.push(`Connection string reference: ${connStr}`);
        contextParts.push(`Entities configured: ${entities.length > 0 ? entities.join(', ') : 'none'}`);
        
        if (entities.length > 0) {
          contextParts.push('\n**Existing entity details:**');
          const relationshipSummary: string[] = [];
          
          for (const [name, entity] of Object.entries(config.entities || {})) {
            const e = entity as any;
            const sourceObj = e.source?.object || 'unknown';
            const sourceType = e.source?.type || 'table';
            
            // Check for relationships
            const rels = e.relationships || {};
            const relCount = Object.keys(rels).length;
            
            if (relCount > 0) {
              for (const [relName, rel] of Object.entries(rels)) {
                const r = rel as any;
                relationshipSummary.push(`  - ${name}.${relName} → ${r['target.entity']} (${r.cardinality || 'unknown'})`);
              }
            }
            
            contextParts.push(`- ${name}: source="${sourceObj}", type="${sourceType}", relationships=${relCount}`);
          }
          
          if (relationshipSummary.length > 0) {
            contextParts.push('\n**Existing relationships:**');
            contextParts.push(...relationshipSummary);
          } else {
            contextParts.push('\n**No relationships configured yet.** Use get_schema to find foreign keys and add relationships.');
          }
        }
      } catch (e) {
        contextParts.push('(Could not parse config file)');
      }
    } else {
      contextParts.push('\n### No DAB Configuration Found');
      contextParts.push('No dab-config.json exists in the workspace. Use dab_cli with subcommand "init" to create one.');
    }

    // Find connection string
    const connectionInfo = await this.findConnectionString(workspaceFolder);
    if (connectionInfo) {
      contextParts.push(`\n### Connection String Found`);
      contextParts.push(`Environment variable: ${connectionInfo.envVar}`);
      contextParts.push(`Source file: ${connectionInfo.source}`);
      
      // Try to read the actual connection string value for schema discovery
      const connStrValue = await this.readConnectionStringValue(workspaceFolder, connectionInfo.envVar);
      if (connStrValue) {
        contextParts.push(`\n**IMPORTANT**: When using get_schema tool, use this connection string:`);
        contextParts.push(`\`${connStrValue}\``);
      }
    } else {
      contextParts.push('\n### No Connection String Found');
      contextParts.push('No .env or local.settings.json with a database connection string was found.');
    }

    return contextParts.join('\n');
  }

  /**
   * Read the actual connection string value from environment files
   */
  private async readConnectionStringValue(folder: string, envVar: string): Promise<string | undefined> {
    // Check .env file
    const envPath = path.join(folder, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(new RegExp(`^${envVar}=(.+)$`, 'm'));
      if (match) {
        return match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
      }
    }

    // Check local.settings.json
    const localSettingsPath = path.join(folder, 'local.settings.json');
    if (fs.existsSync(localSettingsPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8'));
        const values = content.Values || {};
        if (values[envVar]) {
          return values[envVar];
        }
      } catch {
        // Ignore parse errors
      }
    }

    return undefined;
  }

  // Intent detection helpers

  private isInitIntent(prompt: string): boolean {
    const keywords = ['init', 'create config', 'set up dab', 'setup dab', 'initialize', 'new config', 'start fresh', 'create dab', 'get started', 'new project', 'create a rest api', 'create rest endpoint', 'create a graphql api', 'create graphql endpoint'];
    return keywords.some(k => prompt.includes(k));
  }

  private isAddIntent(prompt: string): boolean {
    const keywords = ['add table', 'add entity', 'add view', 'add procedure', 'add stored', 'expose table', 'expose view', 'include table', 'add the ', 'add my ', 'expose all', 'all my tables', 'all tables', 'update dab with', 'new tables', 'add new table'];
    return keywords.some(k => prompt.includes(k));
  }

  private isRelationshipIntent(prompt: string): boolean {
    const keywords = ['relationship', 'foreign key', 'one to many', 'many to many', 'link entities', 'join', 'nested query', 'has many', 'belongs to', 'table relationship', 'add relationship'];
    return keywords.some(k => prompt.includes(k));
  }

  private isMcpIntent(prompt: string): boolean {
    const keywords = ['mcp', 'model context', 'ai tool', 'ai integration', 'claude', 'cursor', 'copilot tool', 'expose as tool', 'mcp server', 'create mcp', 'enable mcp'];
    return keywords.some(k => prompt.includes(k));
  }

  private isStartIntent(prompt: string): boolean {
    const keywords = ['start server', 'start dab', 'run server', 'run dab', 'launch', 'start the '];
    return keywords.some(k => prompt.includes(k));
  }

  private isValidateIntent(prompt: string): boolean {
    const keywords = ['validate', 'check config', 'verify config', 'test config', 'config valid', 'check for error', 'is it valid', 'review my', 'review config', 'review dab'];
    return keywords.some(k => prompt.includes(k));
  }

  private isConfigureIntent(prompt: string): boolean {
    const keywords = ['configure', 'enable caching', 'enable cors', 'set cors', 'change port', 'enable auth', 'enable rest', 'enable graphql', 'disable'];
    return keywords.some(k => prompt.includes(k));
  }

  private isFixIntent(prompt: string): boolean {
    const keywords = ['fix', 'error', 'problem', 'issue', 'not working', 'failed', 'troubleshoot', 'debug', 'help with', "can't connect", 'cannot connect'];
    return keywords.some(k => prompt.includes(k));
  }

  private isHelpIntent(prompt: string): boolean {
    const keywords = ['what is dab', 'what is data api', 'how does dab', 'help me understand', 'explain dab', 'documentation', 'getting started guide'];
    return keywords.some(k => prompt.includes(k));
  }
}
