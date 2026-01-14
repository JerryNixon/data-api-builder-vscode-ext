import * as vscode from 'vscode';
import { runCommand, askForConnection } from 'dab-vscode-shared';
import { buildConfigCommand, buildInitCommand, resolveConfigPath, waitForFile } from './utils';

export function activate(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand('dabExtension.initDab', async (uri: vscode.Uri) => {
    const folder = uri.fsPath;
    const configPath = resolveConfigPath(folder);

    let connection;
    try {
      connection = await askForConnection(folder);
      if (!connection) {
        vscode.window.showErrorMessage('No connection string selected.');
        return;
      }
    } catch (err) {
      vscode.window.showErrorMessage((err as Error).message);
      return;
    }

    try {
      // Create DAB config with all features enabled, development mode, standard security
      runCommand(buildInitCommand(configPath, connection.name), { cwd: folder });
      runCommand(buildConfigCommand(configPath, 'runtime.rest.request-body-strict', 'false'), { cwd: folder });
      runCommand(buildConfigCommand(configPath, 'runtime.cache.enabled', 'true'), { cwd: folder });

      await new Promise(resolve => setTimeout(resolve, 2000));
      await openFile(configPath);

      // Show success message with option to add tables
      vscode.window.showInformationMessage(
        'DAB configuration created successfully!',
        'Add Tables'
      ).then(selection => {
        if (selection === 'Add Tables') {
          const uri = vscode.Uri.file(configPath);
          vscode.commands.executeCommand('dabExtension.addTable', uri);
        }
      });
    } catch (err) {
      vscode.window.showErrorMessage((err as Error).message);
    }
  });

  context.subscriptions.push(cmd);
}

async function openFile(filePath: string): Promise<void> {
  await waitForFile(filePath, 3000);
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

export function deactivate() {}
