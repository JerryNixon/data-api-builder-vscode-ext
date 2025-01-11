import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition, validateConfigPath, getConnectionString, getEntities } from './readConfig';
import { openConnection, getTableAsPoco, getViewAsPoco, getProcedureAsPoco } from './mssql/querySql';
import { createApiCsFull } from './csharpApi';

// Public Methods
export function activate(context: vscode.ExtensionContext) {
  const generatePocoCommand = vscode.commands.registerCommand('dabExtension.generatePoco', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    if (!validateConfigPath(configPath)) {
      vscode.window.showErrorMessage('Invalid configuration file path.');
      return;
    }

    try {
      const entities: Record<string, EntityDefinition> = getEntities(configPath);

      if (!entities || Object.keys(entities).length === 0) {
        vscode.window.showInformationMessage('No entities found in the configuration.');
        return;
      }

      const selectedEntities = await pickEntities(entities);

      if (!selectedEntities || selectedEntities.length === 0) {
        vscode.window.showInformationMessage('No entities selected.');
        return;
      }

      const connectionString = await getConnectionString(configPath);
      if (!connectionString) {
        vscode.window.showErrorMessage('Failed to retrieve the connection string.');
        return;
      }

      const pool = await openConnection(connectionString);
      if (!pool) {
        return;
      }

      const genCsFolder = path.join(path.dirname(configPath), 'GenCs');
      if (!fs.existsSync(genCsFolder)) {
        fs.mkdirSync(genCsFolder);
      }

      await createApiModelsCs(pool, entities, selectedEntities, genCsFolder);
      await createApiLogicCs(context, genCsFolder);
      await createApiCs(genCsFolder, entities, selectedEntities);
      await createProgramCs(genCsFolder, selectedEntities, entities);
      
      // Open Models.cs in the IDE
      const modelsFilePath = path.join(genCsFolder, 'Api.Models.cs');
      const modelsDocument = await vscode.workspace.openTextDocument(modelsFilePath);
      await vscode.window.showTextDocument(modelsDocument);

      vscode.window.showInformationMessage('Generation completed successfully.');
    } catch (error) {
      vscode.window.showErrorMessage(`Error during generation: ${error}`);
    }
  });

  context.subscriptions.push(generatePocoCommand);
}

export function deactivate() { }

// Private Methods
async function createApiModelsCs(
  pool: any,
  entities: Record<string, EntityDefinition>,
  selectedEntities: vscode.QuickPickItem[],
  genCsFolder: string
): Promise<void> {
  const modelsFilePath = path.join(genCsFolder, 'Api.Models.cs');

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Generating POCOs', cancellable: false },
    async (progress) => {
      let combinedPocoCode = `namespace Api.Models;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

`;

      for (const selected of selectedEntities) {
        progress.report({ message: `Processing ${selected.label}...` });

        const entity = entities[selected.label];
        let poco = '';

        if (entity.source.type === 'table') {
          poco = await getTableAsPoco(pool, entity.source.object, entity.source['key-fields'], entity.mappings);
        } else if (entity.source.type === 'view') {
          poco = await getViewAsPoco(pool, entity.source.object, entity.source['key-fields'], entity.mappings);
        } else if (entity.source.type === 'stored-procedure') {
          poco = await getProcedureAsPoco(pool, entity.source.object, entity.mappings);
        } else {
          vscode.window.showWarningMessage(`Unsupported entity type: ${entity.source.type}`);
          continue;
        }

        combinedPocoCode += poco + '\n';
      }

      fs.writeFileSync(modelsFilePath, combinedPocoCode.trim());
    }
  );
}

async function createApiLogicCs(context: vscode.ExtensionContext, genCsFolder: string): Promise<void> {
  const logicFilePath = path.join(genCsFolder, 'Api.Logic.cs');
  const sourceLogicPath = path.join(context.extensionPath, 'resources', 'api.logic.cs');

  if (fs.existsSync(sourceLogicPath)) {
    fs.copyFileSync(sourceLogicPath, logicFilePath);
  } else {
    vscode.window.showWarningMessage('Logic.cs template file not found.');
  }
}

async function createApiCs(
  genCsFolder: string,
  entities: Record<string, EntityDefinition>,
  selectedEntities: vscode.QuickPickItem[]
): Promise<void> {
  createApiCsFull(genCsFolder, entities, selectedEntities);
}

export async function createProgramCs(
  genCsFolder: string,
  selectedEntities: vscode.QuickPickItem[],
  entities: Record<string, EntityDefinition>
): Promise<void> {
  const programFilePath = path.join(genCsFolder, 'Program.cs');

  if (selectedEntities.length === 0) {
    vscode.window.showWarningMessage('No entities selected for Program.cs generation.');
    return;
  }

  const programCodeParts: string[] = [];

  for (const selected of selectedEntities) {
    const entity = selected.label;
    const entityDef = entities[entity];
    const restPath = entityDef.restPath?.replace(/^\/+/g, '') || entity;

    programCodeParts.push(`        var ${entity.toLowerCase()}Uri = new Uri($"{baseUrl}${restPath}");
        var ${entity}Repository = new Api.${entity}Repository(${entity.toLowerCase()}Uri);
        var ${entity.toLowerCase()}Items = await ${entity}Repository.GetAsync(options: new() { First = 1 });
        foreach (var item in ${entity.toLowerCase()}Items)
        {
            Console.WriteLine(item.ToString());
        }`);
  }

  const programCode = `namespace App;

public class Program
{
    public static async Task Main(string[] args)
    {
        var baseUrl = "http://localhost:5000/api/";

${programCodeParts.join('\n\n')}
    }
}`;

  fs.writeFileSync(programFilePath, programCode);
}

async function pickEntities(entities: Record<string, EntityDefinition>): Promise<vscode.QuickPickItem[] | undefined> {
  const sortedEntities = Object.entries(entities)
    .sort(([nameA, entityA], [nameB, entityB]) => {
      const typeOrder = { table: 1, view: 2, 'stored-procedure': 3 };
      const typeComparison = typeOrder[entityA.source.type] - typeOrder[entityB.source.type];
      return typeComparison !== 0 ? typeComparison : nameA.localeCompare(nameB);
    });

  const entityItems = sortedEntities.map(([name, entity]) => ({
    label: name,
    detail: `${entity.source.type.charAt(0).toUpperCase() + entity.source.type.slice(1)}: ${entity.source.object}`,
  }));

  return await vscode.window.showQuickPick(entityItems, {
    canPickMany: true,
    placeHolder: 'Select entities to generate POCOs for',
  });
}
