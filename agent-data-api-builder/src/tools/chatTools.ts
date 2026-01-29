import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { SqlMetadataProvider } from './sqlMetadata';

/**
 * Register DAB tools with VS Code's Language Model Tool API
 * These tools can be invoked by the chat participant when processing requests
 */
export function registerChatTools(context: vscode.ExtensionContext): void {
  // Register dab_cli tool
  const dabCliTool = vscode.lm.registerTool('dab_cli', new DabCliTool());
  context.subscriptions.push(dabCliTool);
  console.log('DAB: Registered dab_cli tool');

  // Register get_schema tool
  const getSchemaTool = vscode.lm.registerTool('get_schema', new GetSchemaTool());
  context.subscriptions.push(getSchemaTool);
  console.log('DAB: Registered get_schema tool');
}

/**
 * DAB CLI Tool - Execute Data API Builder CLI commands
 */
class DabCliTool implements vscode.LanguageModelTool<DabCliInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<DabCliInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { subcommand, config_path, parameters } = options.input;
    const params = parameters || {};
    const configPath = config_path;

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

          const runResult = await this.runDab(args);
          if (!runResult.success) throw new Error(runResult.error);
          result = { created: configPath || 'dab-config.json', databaseType, envVar: connStrEnvVar };
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

          const runResult = await this.runDab(args);
          if (!runResult.success) throw new Error(runResult.error);
          result = { entity: entityName, config: configPath, parameters: params };
          break;
        }

        case 'update': {
          const entityName = params.entityName as string;
          if (!entityName) throw new Error('entityName is required for dab update');

          const args = ['update', entityName];
          if (configPath) args.push('--config', configPath);

          // Map of parameter names to DAB CLI flags
          const flagMap: Record<string, string> = {
            'relationship': 'relationship',
            'targetEntity': 'target.entity',
            'cardinality': 'cardinality',
            'relationshipFields': 'relationship.fields',
            'sourceFields': 'source.fields',
            'targetFields': 'target.fields',
            'linkingObject': 'linking.object',
            'linkingSourceFields': 'linking.source.fields',
            'linkingTargetFields': 'linking.target.fields',
            'permissions': 'permissions',
            'source': 'source',
            'sourceType': 'source.type'
          };

          for (const [key, value] of Object.entries(params)) {
            if (key === 'entityName') continue;
            
            // Use mapped flag name or convert camelCase to dotted notation
            let flagName = flagMap[key];
            if (!flagName) {
              // Convert camelCase to dot.notation for DAB CLI
              flagName = key.replace(/([A-Z])/g, '.$1').toLowerCase();
            }
            
            args.push(`--${flagName}`, String(value));
          }

          console.log('DAB dab_cli update args:', args.join(' '));
          const runResult = await this.runDab(args);
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

          const runResult = await this.runDab(args);
          if (!runResult.success) throw new Error(runResult.error);
          result = { configured: true, configPath };
          break;
        }

        case 'validate': {
          const args = ['validate'];
          if (configPath) args.push('--config', configPath);

          const runResult = await this.runDab(args);
          if (!runResult.success) throw new Error(runResult.error);
          result = { valid: true, configPath };
          break;
        }

        case 'start': {
          const args = ['start'];
          if (configPath) args.push('--config', configPath);

          const runResult = await this.runDab(args, { background: true });
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

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
      ]);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify({ error }, null, 2))
      ]);
    }
  }

  private async runDab(args: string[], options?: { background?: boolean }): Promise<{ success: boolean; output?: string; error: string }> {
    const cmd = 'dab';
    
    // Get working directory from config path if present
    let cwd: string | undefined;
    const configIndex = args.indexOf('--config');
    if (configIndex >= 0 && args[configIndex + 1]) {
      const configPath = args[configIndex + 1];
      cwd = path.dirname(configPath);
    } else {
      // Try to use workspace folder
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        cwd = workspaceFolders[0].uri.fsPath;
      }
    }
    
    // Load environment variables from .env file if it exists
    const env = { ...process.env };
    if (cwd) {
      const envPath = path.join(cwd, '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        for (const line of envContent.split('\n')) {
          // Skip comments and empty lines
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith('#')) continue;
          
          // Parse KEY=VALUE, handling quotes and inline comments
          const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
          if (match) {
            let value = match[2].trim();
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            env[match[1]] = value;
          }
        }
      }
    }

    if (options?.background) {
      const child = spawn(cmd, args, { detached: true, stdio: 'ignore', cwd, env });
      child.unref();
      return { success: true, error: '' };
    }

    try {
      const output = execSync(`${cmd} ${args.join(' ')}`, {
        encoding: 'utf8',
        timeout: 30000,
        cwd,
        env
      });
      return { success: true, output: this.cleanOutput(output), error: '' };
    } catch (e: any) {
      return { success: false, error: this.cleanOutput(e.stderr || e.message) };
    }
  }

  private cleanOutput(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '').trim();
  }
}

/**
 * Get Schema Tool - Retrieve database schema metadata from SQL Server
 */
class GetSchemaTool implements vscode.LanguageModelTool<GetSchemaInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetSchemaInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { connection_string, filter, schema_name, object_name } = options.input;

    console.log('DAB get_schema: Invoked with connection_string length:', connection_string?.length || 0);
    console.log('DAB get_schema: Connection string (masked):', connection_string?.replace(/Password=[^;]+/i, 'Password=***'));

    if (!connection_string) {
      console.log('DAB get_schema: ERROR - No connection string provided');
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify({ error: 'connection_string is required' }, null, 2))
      ]);
    }

    try {
      console.log('DAB get_schema: Creating SqlMetadataProvider...');
      const provider = new SqlMetadataProvider();
      console.log('DAB get_schema: Calling getSchema...');
      const schema = await provider.getSchema(connection_string);
      console.log('DAB get_schema: Got schema with', schema.objects?.length || 0, 'objects');

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

        if (schema_name) {
          objects = objects.filter(o => o.schema.toLowerCase() === schema_name.toLowerCase());
        }

        if (object_name) {
          objects = objects.filter(o => o.name.toLowerCase().includes(object_name.toLowerCase()));
        }

        result = {
          serverName: schema.serverName,
          databaseName: schema.databaseName,
          collation: schema.collation,
          objects,
          relationships: schema.relationships.filter(r => {
            if (schema_name && r.parentSchema.toLowerCase() !== schema_name.toLowerCase()) return false;
            if (object_name && !r.parentTable.toLowerCase().includes(object_name.toLowerCase()) &&
              !r.referencedTable.toLowerCase().includes(object_name.toLowerCase())) return false;
            return true;
          })
        };
      }

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
      ]);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.log('DAB get_schema: ERROR -', error);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify({ error }, null, 2))
      ]);
    }
  }
}

// Input types for tools
interface DabCliInput {
  subcommand: 'init' | 'add' | 'update' | 'configure' | 'validate' | 'start' | 'status';
  config_path?: string;
  parameters?: Record<string, unknown>;
}

interface GetSchemaInput {
  connection_string: string;
  filter?: 'all' | 'tables' | 'views' | 'procedures' | 'functions' | 'summary';
  schema_name?: string;
  object_name?: string;
}
