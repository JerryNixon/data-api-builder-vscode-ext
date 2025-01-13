import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition, validateConfigPath, getConnectionString, getEntities } from './readConfig';
import { openConnection } from './mssql/querySql';
import { createApiCs } from './csharpApi';
import { createApiLogicCs } from './csharpApiLogic';
import { createApiModelsCs } from './csharpApiModels';
import { createProjectFile } from './csharpProjectFile';
import { createProgramCs } from './csharpProgramCs';

export function activate(context: vscode.ExtensionContext) {
  const generatePocoCommand = vscode.commands.registerCommand('dabExtension.generatePoco', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    try {

      // read configuration
      const entities: Record<string, EntityDefinition> = getEntities(configPath);
      if (!entities || Object.keys(entities).length === 0) {
        vscode.window.showInformationMessage('No entities found in the configuration.');
        return;
      }

      // user selects entities
      const selectedEntities = await selectEntities(entities);
      if (!selectedEntities || selectedEntities.length === 0) {
        vscode.window.showInformationMessage('No entities selected.');
        return;
      }

      // read connection string
      const connectionString = await getConnectionString(configPath);
      if (!connectionString) {
        vscode.window.showErrorMessage('Failed to retrieve the connection string.');
        return;
      }

      // open database connection
      const pool = await openConnection(connectionString);
      if (!pool) {
        return;
      }

      // create target folder
      const genCsFolder = path.join(path.dirname(configPath), 'GenCs');
      if (!fs.existsSync(genCsFolder)) {
        fs.mkdirSync(genCsFolder);
      }

      await createProjectFile(context, genCsFolder);
      await createApiModelsCs(pool, entities, selectedEntities, genCsFolder);
      await createApiLogicCs(context, genCsFolder);
      await createApiCs(genCsFolder, entities, selectedEntities);
      await createProgramCs(genCsFolder, selectedEntities, entities);
      await openInIde(genCsFolder);

      vscode.window.showInformationMessage('Generation completed successfully.');
    } catch (error) {
      vscode.window.showErrorMessage(`Error during generation: ${error}`);
    }
  });

  context.subscriptions.push(generatePocoCommand);
}

async function openInIde(genCsFolder: string) {
  const modelsFilePath = path.join(genCsFolder, 'Api.Models.cs');
  const modelsDocument = await vscode.workspace.openTextDocument(modelsFilePath);
  await vscode.window.showTextDocument(modelsDocument);
}

export function deactivate() { }

async function selectEntities(entities: Record<string, EntityDefinition>): Promise<vscode.QuickPickItem[] | undefined> {
  console.time('Sorting and Mapping Entities');
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
  console.timeEnd('Sorting and Mapping Entities');

  return await vscode.window.showQuickPick(entityItems, {
      canPickMany: true,
      placeHolder: 'Select entities to generate POCOs for',
  });
}