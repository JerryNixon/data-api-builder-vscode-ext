import * as vscode from 'vscode';
import { runCommand } from './runTerminal';

export function activate(context: vscode.ExtensionContext) {
  const startDabCommand = vscode.commands.registerCommand('dabExtension.startDab', async (uri: vscode.Uri) => {
    const configFilePath = uri.fsPath;

    const command = `dab start -c "${configFilePath}"`;
    runCommand(command);
  });

  context.subscriptions.push(startDabCommand);
}

export function deactivate() { }