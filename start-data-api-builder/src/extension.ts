import * as vscode from 'vscode';
import * as path from 'path';
import { runCommand, validateConfigPath } from 'dab-vscode-shared';

export function activate(context: vscode.ExtensionContext) {
  const startDabCommand = vscode.commands.registerCommand('dabExtension.startDab', async (uri: vscode.Uri) => {
    const configFilePath = uri.fsPath;
    
    if (!validateConfigPath(configFilePath)) {
      vscode.window.showErrorMessage('❌ Invalid DAB configuration file.');
      return;
    }
    
    const folderPath = path.dirname(configFilePath);
    const fileName = path.basename(configFilePath);

    // Change to the config directory first, then run dab with just the file name
    const command = `cd "${folderPath}" && dab start -c "${fileName}"`;
    runCommand(command, { cwd: folderPath });
  });

  context.subscriptions.push(startDabCommand);
}

export function deactivate() {}
