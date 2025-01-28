import * as vscode from 'vscode';
import { runCommand } from './runTerminal';

export function activate(context: vscode.ExtensionContext) {
  const validateDabCommand = vscode.commands.registerCommand('dabExtension.validateDab', async (uri: vscode.Uri) => {
    const configFilePath = uri.fsPath;

    const command = `dab validate -c "${configFilePath}"`;
    runCommand(command);
  });

  context.subscriptions.push(validateDabCommand);
}

export function deactivate() {}