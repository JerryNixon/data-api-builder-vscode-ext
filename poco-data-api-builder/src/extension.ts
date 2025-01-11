import * as vscode from 'vscode';
import { EntityDefinition, validateConfigPath, getConnectionString, getEntities } from './readConfig';
import { openConnection, getTableAsPoco, getViewAsPoco, getProcedureAsPoco } from './mssql/querySql';

export function activate(context: vscode.ExtensionContext) {
  const generatePocoCommand = vscode.commands.registerCommand('dabExtension.generatePoco', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    if (!validateConfigPath(configPath)) {
      vscode.window.showErrorMessage('Invalid configuration file path.');
      return;
    }

    const menuOptions = [
      { label: 'POCO Models', picked: true },
      { label: 'Repository Class', description: '(Coming Soon)', disabled: true },
      { label: 'Repository Unit Tests', description: '(Coming Soon)', disabled: true },
    ];

    const selectedMenu = await vscode.window.showQuickPick(
      menuOptions.map((option) => ({
        label: option.label,
        picked: option.picked,
        description: option.disabled ? option.description : undefined,
        alwaysShow: true,
        disabled: option.disabled, // Track disabled state
      })),
      {
        canPickMany: true, // Allow multiple selections for checklist behavior
        placeHolder: 'Select the type of artifacts to generate',
      }
    );

    if (!selectedMenu || selectedMenu.length > 1 || !selectedMenu.some((item) => item.label === 'POCO Models')) {
      vscode.window.showInformationMessage('Only POCO Models are currently supported.');
      return;
    }

    if (selectedMenu.some((item) => item.label !== 'POCO Models' && !item.disabled)) {
      vscode.window.showErrorMessage('Invalid selection. Only POCO Models can be selected.');
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

    try {
      const entities: Record<string, EntityDefinition> = getEntities(configPath);

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

      const selectedEntities = await vscode.window.showQuickPick(entityItems, {
        canPickMany: true,
        placeHolder: 'Select entities to generate POCOs for',
      });

      if (!selectedEntities || selectedEntities.length === 0) {
        vscode.window.showInformationMessage('No entities selected.');
        return;
      }

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Generating POCOs', cancellable: false },
        async (progress) => {
          let combinedPocoCode = `using System.Text.Json.Serialization;

namespace Models;

`;

          for (const selected of selectedEntities) {
            progress.report({ message: `Processing ${selected.label}...` });

            const entity = entities[selected.label];
            let poco = '';

            if (entity.source.type === 'table') {
              poco = await getTableAsPoco(pool, entity.source.object, entity.mappings);
            } else if (entity.source.type === 'view') {
              poco = await getViewAsPoco(pool, entity.source.object, entity.mappings);
            } else if (entity.source.type === 'stored-procedure') {
              poco = await getProcedureAsPoco(pool, entity.source.object, entity.mappings);
            } else {
              vscode.window.showWarningMessage(`Unsupported entity type: ${entity.source.type}`);
              continue;
            }

            combinedPocoCode += poco + '\n';
          }

          const document = await vscode.workspace.openTextDocument({ language: 'csharp', content: combinedPocoCode });
          await vscode.window.showTextDocument(document);
        }
      );

      vscode.window.showInformationMessage('All POCOs generated successfully.');

    } catch (error) {
      vscode.window.showErrorMessage(`Error during POCO generation: ${error}`);
    } finally {
      pool.close();
    }
  });

  context.subscriptions.push(generatePocoCommand);
}

export function deactivate() {}
