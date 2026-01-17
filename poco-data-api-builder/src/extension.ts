import * as vscode from 'vscode';
import * as path from 'path';
import { askForConnection } from 'dab-vscode-shared';
import { getEntities } from './readConfig';
import { openConnection } from './mssql/querySql';
import { generateCSharpCode } from './csharp';

export function activate(context: vscode.ExtensionContext) {
  const generateRestClientCommand = vscode.commands.registerCommand('dabExtension.generateRestClient', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    try {
      const entities = getEntities(configPath);
      if (!entities || Object.keys(entities).length === 0) {
        vscode.window.showInformationMessage('No entities found in the configuration.');
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
