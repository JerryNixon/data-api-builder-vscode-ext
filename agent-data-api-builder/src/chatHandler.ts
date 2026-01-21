import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DabChatResult } from './extension';
import { getAgentInstructions } from './instructions';
import { runCommand } from 'dab-vscode-shared';

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

    // Detect intent and route appropriately
    if (this.isInitIntent(prompt)) {
      return this.handleInit(request, stream, token);
    }

    if (this.isAddIntent(prompt)) {
      return this.handleAdd(request, stream, token);
    }

    if (this.isRelationshipIntent(prompt)) {
      return this.handleRelationship(request, stream, token);
    }

    if (this.isMcpIntent(prompt)) {
      return this.handleMcp(request, stream, token);
    }

    if (this.isStartIntent(prompt)) {
      return this.handleStart(request, stream, token);
    }

    if (this.isValidateIntent(prompt)) {
      return this.handleValidate(request, stream, token);
    }

    if (this.isConfigureIntent(prompt)) {
      return this.handleConfigure(request, stream, token);
    }

    if (this.isFixIntent(prompt)) {
      return this.handleFix(request, stream, token);
    }

    if (this.isHelpIntent(prompt)) {
      return this.handleHelp(request, stream, token);
    }

    // Default: Use LLM with DAB context
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
      stream.markdown('⚠️ A `dab-config.json` already exists in this workspace.\n\n');
      stream.markdown('Would you like to:\n');
      stream.markdown('- Use `/configure` to modify runtime settings\n');
      stream.markdown('- Use `/add` to add entities\n');
      stream.markdown('- Or manually delete the file and try again\n');
      
      stream.button({
        command: 'dab.openChat',
        title: 'Configure DAB'
      });

      return { metadata: { command: 'init', success: false, configPath } };
    }

    // Look for connection string
    stream.progress('Looking for connection string...');
    const connectionInfo = await this.findConnectionString(workspaceFolder);

    if (connectionInfo) {
      stream.markdown(`✅ Found connection string in \`${connectionInfo.source}\`\n\n`);
      stream.markdown(`Using environment variable: \`@env('${connectionInfo.envVar}')\`\n\n`);
      
      // Build the init command
      const initCommand = this.buildInitCommand(connectionInfo.envVar);
      
      stream.markdown('### Creating DAB Configuration\n\n');
      stream.markdown('```bash\n' + initCommand + '\n```\n\n');
      
      stream.button({
        command: 'workbench.action.terminal.sendSequence',
        title: 'Run Command',
        arguments: [{ text: initCommand + '\n' }]
      });

      stream.markdown('\n### What\'s Next?\n\n');
      stream.markdown('After initialization, use `@dab /add` to add tables, views, or stored procedures.\n');

      return { metadata: { command: 'init', success: true, configPath } };
    } else {
      stream.markdown('### Connection String Required\n\n');
      stream.markdown('I couldn\'t find a connection string in your workspace. You\'ll need to provide one.\n\n');
      stream.markdown('**For SQL Server/Azure SQL:**\n');
      stream.markdown('```\nServer=localhost;Database=YourDb;Integrated Security=true;TrustServerCertificate=true\n```\n\n');
      stream.markdown('**Recommended:** Create a `.env` file with:\n');
      stream.markdown('```\nDATABASE_CONNECTION_STRING=Server=localhost;Database=YourDb;...\n```\n\n');
      stream.markdown('Then run:\n');
      stream.markdown('```bash\ndab init --database-type mssql --connection-string "@env(\'DATABASE_CONNECTION_STRING\')"\n```\n');

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
      stream.markdown('❌ No `dab-config.json` found. Use `/init` first to create one.\n');
      return { metadata: { command: 'add', success: false } };
    }

    stream.markdown('### Adding Entities to DAB\n\n');
    stream.markdown('To add database objects, use the `dab add` command:\n\n');
    
    stream.markdown('**Add a table:**\n');
    stream.markdown('```bash\ndab add Product --source dbo.Products --permissions "anonymous:read"\n```\n\n');
    
    stream.markdown('**Add a view (requires key-fields):**\n');
    stream.markdown('```bash\ndab add ProductSummary --source dbo.vw_ProductSummary --source.type view --source.key-fields "ProductId" --permissions "anonymous:read"\n```\n\n');
    
    stream.markdown('**Add a stored procedure:**\n');
    stream.markdown('```bash\ndab add GetProducts --source dbo.usp_GetProducts --source.type stored-procedure --permissions "anonymous:execute"\n```\n\n');

    if (request.prompt) {
      stream.markdown(`\n---\n\nYou mentioned: "${request.prompt}"\n\n`);
      stream.markdown('Tell me more about what you\'d like to add, and I\'ll generate the exact command.\n');
    }

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
      stream.markdown('❌ No `dab-config.json` found. Use `/init` first to create one.\n');
      return { metadata: { command: 'start', success: false } };
    }

    stream.markdown('### Starting Data API Builder\n\n');
    
    const configName = path.basename(configPath);
    const startCommand = `dab start -c "${configName}"`;
    
    stream.markdown('```bash\n' + startCommand + '\n```\n\n');
    
    stream.button({
      command: 'workbench.action.terminal.sendSequence',
      title: '🚀 Start DAB',
      arguments: [{ text: startCommand + '\n' }]
    });

    stream.markdown('\n**Endpoints available after start:**\n');
    stream.markdown('- REST: `http://localhost:5000/api`\n');
    stream.markdown('- GraphQL: `http://localhost:5000/graphql`\n');
    stream.markdown('- MCP: `http://localhost:5000/mcp` (if enabled)\n');
    stream.markdown('- Health: `http://localhost:5000/health` (if enabled)\n');

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
      stream.markdown('❌ No `dab-config.json` found. Use `/init` first to create one.\n');
      return { metadata: { command: 'validate', success: false } };
    }

    stream.markdown('### Validating DAB Configuration\n\n');
    
    const configName = path.basename(configPath);
    const validateCommand = `dab validate -c "${configName}"`;
    
    stream.markdown('```bash\n' + validateCommand + '\n```\n\n');
    
    stream.button({
      command: 'workbench.action.terminal.sendSequence',
      title: '✅ Validate Config',
      arguments: [{ text: validateCommand + '\n' }]
    });

    stream.markdown('\n**Validation checks:**\n');
    stream.markdown('1. Schema validation (JSON syntax)\n');
    stream.markdown('2. Config properties validation\n');
    stream.markdown('3. Permission validation\n');
    stream.markdown('4. Database connection validation\n');
    stream.markdown('5. Entity metadata validation\n');

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
      stream.markdown('❌ No `dab-config.json` found. Use `/init` first to create one.\n');
      return { metadata: { command: 'configure', success: false } };
    }

    stream.markdown('### Configuring DAB Runtime\n\n');
    stream.markdown('Use `dab configure` to modify runtime settings:\n\n');
    
    stream.markdown('**Enable/disable endpoints:**\n');
    stream.markdown('```bash\ndab configure --runtime.rest.enabled true\ndab configure --runtime.graphql.enabled true\ndab configure --runtime.mcp.enabled true\n```\n\n');
    
    stream.markdown('**Configure caching:**\n');
    stream.markdown('```bash\ndab configure --runtime.cache.enabled true --runtime.cache.ttl-seconds 30\n```\n\n');
    
    stream.markdown('**Set CORS origins:**\n');
    stream.markdown('```bash\ndab configure --runtime.host.cors.origins "http://localhost:3000"\n```\n\n');
    
    stream.markdown('**Set host mode:**\n');
    stream.markdown('```bash\ndab configure --runtime.host.mode development\n```\n\n');

    if (request.prompt) {
      stream.markdown(`\n---\n\nYou mentioned: "${request.prompt}"\n\n`);
      stream.markdown('Tell me what you\'d like to configure, and I\'ll generate the exact command.\n');
    }

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
    stream.markdown('# Data API Builder Help\n\n');
    
    stream.markdown('**Data API Builder (DAB)** creates REST, GraphQL, and MCP APIs from your database without writing code.\n\n');
    
    stream.markdown('## Commands\n\n');
    stream.markdown('| Command | Description |\n');
    stream.markdown('|---------|-------------|\n');
    stream.markdown('| `/init` | Create a new DAB configuration file |\n');
    stream.markdown('| `/add` | Add tables, views, or stored procedures |\n');
    stream.markdown('| `/start` | Start the DAB engine |\n');
    stream.markdown('| `/validate` | Validate your configuration |\n');
    stream.markdown('| `/configure` | Configure runtime settings |\n');
    stream.markdown('| `/relationship` | Set up entity relationships |\n');
    stream.markdown('| `/mcp` | Enable MCP for AI tool integration |\n');
    stream.markdown('| `/fix` | Troubleshoot common issues |\n');
    stream.markdown('| `/help` | Show this help |\n\n');
    
    stream.markdown('## Getting Started\n\n');
    stream.markdown('1. **Initialize**: `@dab /init` - Creates `dab-config.json`\n');
    stream.markdown('2. **Add entities**: `@dab /add` - Add your database tables\n');
    stream.markdown('3. **Relationships**: `@dab /relationship` - Link entities together\n');
    stream.markdown('4. **Validate**: `@dab /validate` - Check your configuration\n');
    stream.markdown('5. **Start**: `@dab /start` - Run the API server\n\n');
    
    stream.markdown('## Learn More\n\n');
    stream.markdown('- [Official Documentation](https://learn.microsoft.com/azure/data-api-builder/)\n');
    stream.markdown('- [CLI Reference](https://learn.microsoft.com/azure/data-api-builder/reference-command-line-interface)\n');
    stream.markdown('- [REST API](https://learn.microsoft.com/azure/data-api-builder/rest)\n');
    stream.markdown('- [GraphQL API](https://learn.microsoft.com/azure/data-api-builder/graphql)\n');
    stream.markdown('- [Configuration Schema](https://learn.microsoft.com/azure/data-api-builder/reference-configuration)\n');
    stream.markdown('- [GitHub Repository](https://github.com/Azure/data-api-builder)\n');
    stream.markdown('- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.omnibus-data-api-builder)\n');

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
      // Build context-aware prompt
      const systemPrompt = this.buildSystemPrompt();
      
      // Get the language model from the request
      const model = request.model;
      
      const messages = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
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

      // Send to LLM
      const response = await model.sendRequest(messages, {}, token);
      
      // Stream the response
      for await (const chunk of response.text) {
        stream.markdown(chunk);
      }

      return { metadata: { success: true } };
    } catch (error) {
      stream.markdown(`\n\n⚠️ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      return { metadata: { success: false } };
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

  private buildInitCommand(envVar: string): string {
    return `dab init \\
  --database-type mssql \\
  --connection-string "@env('${envVar}')" \\
  --host-mode development \\
  --rest.enabled true \\
  --graphql.enabled true \\
  --mcp.enabled true`;
  }

  private buildSystemPrompt(): string {
    return `You are a Data API Builder (DAB) expert assistant. Your role is to help developers create REST, GraphQL, and MCP APIs from their databases without writing custom code.

## About DAB
Data API Builder is a free, open-source (MIT license) tool from Microsoft. It's a foundational component of Microsoft Fabric, meaning it's high-performance and enterprise-ready.

## Supported Databases
- **mssql**: SQL Server / Azure SQL
- **postgresql**: PostgreSQL
- **mysql**: MySQL
- **cosmosdb_nosql**: Azure Cosmos DB NoSQL
- **dwsql**: Azure SQL Data Warehouse

## API Endpoints
- **REST**: http://localhost:5000/api/{entity} - Full CRUD with OData-style filtering
- **GraphQL**: http://localhost:5000/graphql - Queries, mutations, nested relationships
- **MCP**: http://localhost:5000/mcp - Model Context Protocol for AI tool integration
- **Health**: http://localhost:5000/health - Health check endpoint
- **OpenAPI**: http://localhost:5000/swagger - API documentation (when enabled)

## DAB CLI Commands
| Command | Purpose |
|---------|----------|
| dab init | Create new configuration file |
| dab add | Add tables, views, or stored procedures as entities |
| dab update | Modify existing entity settings |
| dab configure | Change runtime/data-source settings |
| dab validate | Check configuration for errors |
| dab start | Run the DAB engine locally |
| dab export | Export current configuration |

## Key Concepts
- **Entities**: Database objects (tables, views, stored procedures) exposed as API endpoints
- **Permissions**: Role-based access with actions (read, create, update, delete, execute, *)
- **Relationships**: Links between entities enabling nested GraphQL queries
- **Caching**: L1 (in-memory) and L2 (Redis) caching for performance
- **Policies**: Row-level security using database predicates

## Best Practices
- Always use @env('VAR_NAME') for connection strings (never hardcode secrets)
- Use descriptive entity names different from source object names
- Apply least-privilege permissions (start with anonymous:read)
- Validate configuration before deployment
- Use development host mode for local testing

## Official Documentation
- Main docs: https://learn.microsoft.com/azure/data-api-builder/
- CLI reference: https://learn.microsoft.com/azure/data-api-builder/reference-command-line-interface
- GitHub: https://github.com/Azure/data-api-builder

When providing commands, format them as code blocks so users can easily copy them.

${this.instructions}`;
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
