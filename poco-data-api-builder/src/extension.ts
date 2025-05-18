import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition, validateConfigPath, getConnectionString, getEntities } from './readConfig';
import { openConnection } from './mssql/querySql';
import { createApiCs } from './csharpApiRepository';
import { createApiLogicCs } from './csharpApiLogic';
import { createApiModelsCs } from './csharpApiModels';
import { createProjectFile } from './csharpProjectFile';
import { createProgramCs } from './csharpProgramCs';

export function activate(context: vscode.ExtensionContext) {
  const generatePocoCommand = vscode.commands.registerCommand('dabExtension.generatePoco', handleGeneratePoco);

  const generateMcpServerCommand = vscode.commands.registerCommand('dabExtension.generateMcpServer', async (uri: vscode.Uri) => {
    vscode.window.showInformationMessage('MCP server generation not implemented yet.');
    return;
  });

  const generateRestClientCommand = vscode.commands.registerCommand('dabExtension.generateRestClient', async (uri: vscode.Uri) => {
    vscode.window.showInformationMessage('REST client generation not implemented yet.');
    return;
  });

  context.subscriptions.push(
    generatePocoCommand,
    generateMcpServerCommand,
    generateRestClientCommand
  );
}

async function handleGeneratePoco(uri: vscode.Uri) {
  const configPath = uri.fsPath;

  try {
    const selection = await getSelectedEntities(configPath);
    if (!selection) {return;}
    const { entities, selectedEntities } = selection;

    const connectionString = await getConnectionString(configPath);
    if (!connectionString) {
      vscode.window.showErrorMessage('Failed to retrieve the connection string.');
      return;
    }

    const pool = await openConnection(connectionString);
    if (!pool) {
      return;
    }

    const genCsFolder = path.join(path.dirname(configPath), 'Gen');
    if (!fs.existsSync(genCsFolder)) {
      fs.mkdirSync(genCsFolder);
    }

    await createApiModelsCs(pool, entities, selectedEntities!, genCsFolder);
    await openInIde(genCsFolder);

    vscode.window.showInformationMessage('POCO model generation completed successfully.');
  } catch (error) {
    vscode.window.showErrorMessage(`Error during POCO generation: ${error}`);
  }
}

export async function getSelectedEntities(configPath: string): Promise<{
  configPath: string;
  entities: Record<string, EntityDefinition>;
  selectedEntities: vscode.QuickPickItem[] | undefined;
} | undefined> {
  const entities = getEntities(configPath);
  if (!entities || Object.keys(entities).length === 0) {
    vscode.window.showInformationMessage('No entities found in the configuration.');
    return;
  }

  const selectedEntities = await selectEntities(entities);
  if (!selectedEntities || selectedEntities.length === 0) {
    vscode.window.showInformationMessage('No entities selected.');
    return;
  }

  return { configPath, entities, selectedEntities };
}

async function openInIde(genCsFolder: string) {
  const filePath = path.join(genCsFolder, 'Program.cs');
  if (fs.existsSync(filePath)) {
    const modelsDocument = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(modelsDocument);
  }
}

export function deactivate() { }

async function selectEntities(entities: Record<string, EntityDefinition>): Promise<vscode.QuickPickItem[] | undefined> {
  const typeOrder = { table: 1, view: 2, 'stored-procedure': 3 };
  const entityItems = Object.entries(entities)
    .sort(([nameA, entityA], [nameB, entityB]) => {
      const typeComparison = typeOrder[entityA.source.type] - typeOrder[entityB.source.type];
      return typeComparison !== 0 ? typeComparison : nameA.localeCompare(nameB);
    })
    .map(([name, entity]) => ({
      label: name,
      detail: `${entity.source.type.charAt(0).toUpperCase() + entity.source.type.slice(1)}: ${entity.source.object}`,
    }));

  return await vscode.window.showQuickPick(entityItems, {
    canPickMany: true,
    placeHolder: 'Select entities to generate POCOs for',
  });
}

async function selectOperations(): Promise<{
  includePoco: boolean;
  includeRepos: boolean;
  includeImplementation: boolean;
  includeProject: boolean;
} | undefined> {
  const selectedOptions = await vscode.window.showQuickPick(
    [
      { label: 'Include POCO models', picked: true },
      { label: 'Include repository code', picked: true },
      { label: 'Include implementation code', picked: true },
      { label: 'Include Sample project for testing', picked: false },
    ],
    {
      canPickMany: true,
      placeHolder: 'Select components to generate',
    }
  );

  if (!selectedOptions || selectedOptions.length === 0) {
    return undefined;
  }

  return {
    includePoco: selectedOptions.some((option) => option.label === 'Include POCO models'),
    includeRepos: selectedOptions.some((option) => option.label === 'Include repository code'),
    includeImplementation: selectedOptions.some((option) => option.label === 'Include implementation code'),
    includeProject: selectedOptions.some((option) => option.label === 'Include Sample project for testing'),
  };
}