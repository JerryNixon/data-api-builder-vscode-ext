import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getEntities, getConnectionString, validateConfigPath } from './readConfig';
import { openConnection, enrichEntitiesWithSqlMetadata } from './mssql/querySql';
import { EntityDefinition } from './types';
import { generateMcpModels } from './csharp/createPoco';
import { generateMcpRepositories } from './csharp/createRepository';
import { generateMcpToolClasses } from './csharp/createTool';
import { createMcpJson } from './csharp/createJson';

export function activate(context: vscode.ExtensionContext) {
  const generateMcpCommand = vscode.commands.registerCommand('dabMcp.generateMcp', async (uri: vscode.Uri) => {
    await handleGenerateMcp(uri, context);
  });

  context.subscriptions.push(generateMcpCommand);
}

export function deactivate() { }

async function handleGenerateMcp(uri: vscode.Uri, context: vscode.ExtensionContext): Promise<void> {
  const configPath = uri.fsPath;
  if (!validateConfigPath(configPath)) {
    vscode.window.showErrorMessage('Invalid configuration file.');
    return;
  }

  const connectionString = await getConnectionString(configPath);
  if (!connectionString) {
    vscode.window.showErrorMessage('Connection string could not be resolved.');
    return;
  }

  const pool = await openConnection(connectionString);
  if (!pool) {
    vscode.window.showErrorMessage('Could not connect to the database.');
    return;
  }

  const entityMap = getEntities(configPath);
  const aliases = Object.keys(entityMap);
  if (aliases.length === 0) {
    vscode.window.showErrorMessage('No entities found in the configuration file.');
    return;
  }

  const selected = await vscode.window.showQuickPick(aliases, {
    canPickMany: true,
    title: 'Generate MCP Tools',
    placeHolder: 'Select entities to include in the MCP server'
  });

  if (!selected || selected.length === 0) {
    vscode.window.showInformationMessage('No entities selected. Operation canceled.');
    return;
  }

  const enrichedEntities = await enrichEntitiesWithSqlMetadata(pool, Object.values(entityMap));
  const filtered = enrichedEntities.filter(e =>
    selected.includes(getAliasForObjectName(e.dbMetadata!.objectName, entityMap))
  );

  await generateMcpModels(filtered, selected, configPath);
  await generateMcpToolClasses(filtered, selected, configPath);
  await copyMcpResources(context.extensionPath, configPath);
  // await generateMcpRepositories(filtered, selected, configPath);
  // await createMcpJson(path.join(path.dirname(configPath), 'Mcp', 'Mcp.Server'));

  vscode.window.showInformationMessage('MCP generation complete.');
}

function getAliasForObjectName(
  objectName: string,
  entityMap: Record<string, EntityDefinition>
): string {
  const match = Object.entries(entityMap).find(
    ([_, def]) => def.source.normalizedObjectName === objectName.toLowerCase()
  );
  return match?.[0] || objectName;
}

/**
 * Recursively copies the entire contents of the extension's /resources folder
 * to the workspace's /Mcp folder next to the config file.
 */
export async function copyMcpResources(extensionRoot: string, configPath: string): Promise<void> {
  const sourceDir = path.join(extensionRoot, 'resources');
  const targetDir = path.join(path.dirname(configPath), 'Mcp');

  if (!fs.existsSync(sourceDir)) {
    vscode.window.showErrorMessage('Unable to locate extension resources folder.');
    return;
  }

  copyFolderRecursive(sourceDir, targetDir);
}

function copyFolderRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) { return; }

  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

