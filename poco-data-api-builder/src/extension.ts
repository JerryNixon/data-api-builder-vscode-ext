import * as vscode from 'vscode';
import * as path from 'path';
import { askForConnection } from 'dab-vscode-shared';
import { openConnection } from 'dab-vscode-shared-database';
import { getEntities, EntityDefinition } from './readConfig';
import { generateCSharpCode } from './csharp';

interface EntityQuickPickItem extends vscode.QuickPickItem {
  entityName: string;
}

/**
 * Shows a multi-select dialog allowing users to select which entities to generate.
 * @param entities - The entities from the configuration file.
 * @returns The filtered entities based on user selection, or undefined if cancelled.
 */
async function selectEntities(entities: Record<string, EntityDefinition>): Promise<Record<string, EntityDefinition> | undefined> {
  const items: EntityQuickPickItem[] = Object.entries(entities).map(([name, entity]) => {
    const objectType = entity.type || 'unknown';
    const objectName = entity.source?.object || '';
    return {
      label: `${name} (${objectType}) ${objectName}`,
      picked: true,
      entityName: name
    };
  });

  const selected = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: 'Select entities to generate (all selected by default)',
    title: 'Select Entities to Generate',
    ignoreFocusOut: true
  });

  if (!selected || selected.length === 0) {
    return undefined;
  }

  const selectedEntities: Record<string, EntityDefinition> = {};
  for (const item of selected) {
    selectedEntities[item.entityName] = entities[item.entityName];
  }

  return selectedEntities;
}

export function activate(context: vscode.ExtensionContext) {
  const generateRestClientCommand = vscode.commands.registerCommand('dabExtension.generateRestClient', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    try {
      const allEntities = getEntities(configPath);
      if (!allEntities || Object.keys(allEntities).length === 0) {
        vscode.window.showInformationMessage('No entities found in the configuration.');
        return;
      }

      // Show multi-select dialog for entity selection before database connection
      const entities = await selectEntities(allEntities);
      if (!entities) {
        vscode.window.showInformationMessage('No entities selected for generation.');
        return;
      }

      const folder = path.dirname(configPath);
      const connection = await askForConnection(folder);
      if (!connection) {
        vscode.window.showErrorMessage('No connection string selected.');
        return;
      }

      const pool = await openConnection(connection.value);
      if (!pool) { return; }

      try {
        const result = await generateCSharpCode(context, pool, entities, configPath);

        if (result.success) {
          vscode.window.showInformationMessage(
            `C# generation complete: ${result.modelsGenerated.length} models, ${result.repositoriesGenerated.length} repositories.`
          );
        } else {
          vscode.window.showWarningMessage(
            `C# generation completed with ${result.errors.length} error(s). Check output for details.`
          );
          for (const error of result.errors) {
            console.error(error);
          }
        }
      } finally {
        await pool.close();
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Error during C# code generation: ${error}`);
    }
  });

  context.subscriptions.push(generateRestClientCommand);
}

export function deactivate() { }
