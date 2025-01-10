import * as vscode from 'vscode';
import { EntityDefinition, validateConfigPath, getConnectionString, getEntities } from './readConfig';
import { openConnection, getTableAsPoco } from './mssql/querySql';

export function activate(context: vscode.ExtensionContext) {
  const generatePocoCommand = vscode.commands.registerCommand('dabExtension.generatePoco', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    if (!validateConfigPath(configPath)) {
      vscode.window.showErrorMessage('Invalid configuration file path.');
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
      const entityNames = Object.keys(entities);

      const selectedEntities = await vscode.window.showQuickPick(
        entityNames.map(name => ({ label: name, picked: false })),
        { canPickMany: true, placeHolder: 'Select entities to generate POCOs for' }
      );

      if (!selectedEntities || selectedEntities.length === 0) {
        vscode.window.showInformationMessage('No entities selected.');
        return;
      }

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Generating POCOs', cancellable: false },
        async (progress) => {
          let combinedPocoCode = `using System.Text.Json.Serialization;

namespace Api;

`;

          for (const selected of selectedEntities) {
            progress.report({ message: `Processing ${selected.label}...` });

            const entity = entities[selected.label];
            const poco = await getTableAsPoco(pool, entity.source.object, entity.mappings);
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

export function deactivate() { }
