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
  const generatePocoCommand = vscode.commands.registerCommand('dabExtension.generatePoco', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    try {
      // Read configuration
      const entities: Record<string, EntityDefinition> = getEntities(configPath);
      if (!entities || Object.keys(entities).length === 0) {
        vscode.window.showInformationMessage('No entities found in the configuration.');
        return;
      }

      // User selects entities
      const selectedEntities = await selectEntities(entities);
      if (!selectedEntities || selectedEntities.length === 0) {
        vscode.window.showInformationMessage('No entities selected.');
        return;
      }

      // Ask user which components to include
      const selectedOperations = await selectOperations();
      if (!selectedOperations) {
        vscode.window.showInformationMessage('No components selected.');
        return;
      }

      const { includePoco, includeRepos, includeImplementation, includeProject } = selectedOperations;

      // Read connection string
      const connectionString = await getConnectionString(configPath);
      if (!connectionString) {
        vscode.window.showErrorMessage('Failed to retrieve the connection string.');
        return;
      }

      // Open database connection
      const pool = await openConnection(connectionString);
      if (!pool) {
        return;
      }

      // Create target folder
      const genCsFolder = path.join(path.dirname(configPath), 'GenCs');
      if (!fs.existsSync(genCsFolder)) {
        fs.mkdirSync(genCsFolder);
      }

      // Generate selected components
      if (includeProject) {
        await createProjectFile(context, genCsFolder);
      }
      if (includePoco) {
        await createApiModelsCs(pool, entities, selectedEntities, genCsFolder);
      }
      if (includeRepos) {
        await createApiLogicCs(context, genCsFolder);
        await createApiCs(pool, genCsFolder, entities, selectedEntities);
      }
      if (includeImplementation) {
        await createProgramCs(genCsFolder, selectedEntities, entities);
      }

      await openInIde(genCsFolder);
      vscode.window.showInformationMessage('Generation completed successfully.');
    } catch (error) {
      vscode.window.showErrorMessage(`Error during generation: ${error}`);
    }
  });

  context.subscriptions.push(generatePocoCommand);
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