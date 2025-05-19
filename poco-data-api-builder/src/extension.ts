import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition, getConnectionString, getEntities } from './readConfig';
import { openConnection } from './mssql/querySql';
import { createModels } from './csharpPocos';
import { createRepository } from './csharpRepositories';
import { createProjectFile } from './csharpProjectFile';
import { createProgramCs } from './csharpProgramCs';

export function activate(context: vscode.ExtensionContext) {
  const generateRestClientCommand = vscode.commands.registerCommand('dabExtension.generateRestClient', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    try {
      const selection = await getSelectedEntities(configPath);
      if (!selection) { return; }

      const { entities, selectedEntities } = selection;
      if (!selectedEntities) { return; }

      const connectionString = await getConnectionString(configPath);
      if (!connectionString) {
        vscode.window.showErrorMessage('Failed to retrieve the connection string.');
        return;
      }

      const pool = await openConnection(connectionString);
      if (!pool) { return; }

      const genCsFolder = path.join(path.dirname(configPath), 'Gen');
      fs.mkdirSync(genCsFolder, { recursive: true });

      await createModels(pool, entities, selectedEntities, genCsFolder);
      await createRepository(pool, genCsFolder, entities, selectedEntities);
      await createProjectFile(context, genCsFolder);
      await createProgramCs(pool, genCsFolder, entities, selectedEntities);

      vscode.window.showInformationMessage('C# code generation completed successfully.');
    } catch (error) {
      vscode.window.showErrorMessage(`Error during C# code generation: ${error}`);
    }
  });

  context.subscriptions.push(generateRestClientCommand);
}

export function deactivate() { }

async function getSelectedEntities(configPath: string): Promise<{
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

async function selectEntities(entities: Record<string, EntityDefinition>): Promise<vscode.QuickPickItem[] | undefined> {
  const typeOrder = { table: 1, view: 2, 'stored-procedure': 3 };
  const entityItems: vscode.QuickPickItem[] = Object.entries(entities)
    .sort(([aName, a], [bName, b]) => {
      const typeCmp = typeOrder[a.source.type] - typeOrder[b.source.type];
      return typeCmp !== 0 ? typeCmp : aName.localeCompare(bName);
    })
    .map(([name, entity]) => ({
      label: name,
      detail: `${entity.source.type.toUpperCase()}: ${entity.source.object}`,
      picked: true
    }));

  return await vscode.window.showQuickPick(entityItems, {
    canPickMany: true,
    placeHolder: 'Select entities to generate C# code for'
  });
}
