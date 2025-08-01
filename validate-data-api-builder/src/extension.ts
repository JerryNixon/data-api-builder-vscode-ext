import * as vscode from 'vscode';
import * as path from 'path';
import { runCommand } from './runTerminal';

export function activate(context: vscode.ExtensionContext) {
  const validateDabCommand = vscode.commands.registerCommand('dabExtension.validateDab', async (uri: vscode.Uri) => {
    const configFilePath = uri.fsPath;
    const folderPath = path.dirname(configFilePath);
    const fileName = path.basename(configFilePath);

    const command = `dab validate -c "${fileName}"`;
    runCommand(command, { cwd: folderPath });
  });

  context.subscriptions.push(validateDabCommand);
}

export function deactivate() {}
