import * as vscode from 'vscode';
import * as path from 'path';
import { runCommand } from './runTerminal';

export function activate(context: vscode.ExtensionContext) {
  const startDabCommand = vscode.commands.registerCommand('dabExtension.startDab', async (uri: vscode.Uri) => {
    const configFilePath = uri.fsPath;
    const folderPath = path.dirname(configFilePath);
    const fileName = path.basename(configFilePath); // Get just the file name

    const cdCommand = `cd "${folderPath}"`;
    const command = `${cdCommand} && dab start -c "${fileName}"`;
    runCommand(command);
  });

  context.subscriptions.push(startDabCommand);
}

export function deactivate() { }
