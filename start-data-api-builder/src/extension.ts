import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const startDabCommand = vscode.commands.registerCommand('dabExtension.startDab', async (uri: vscode.Uri) => {
    if (uri && uri.fsPath.endsWith('dab-config.json')) {
      const terminal = vscode.window.createTerminal('Data API');
      terminal.show();
      terminal.sendText(`cd "${path.dirname(uri.fsPath)}"`);
      terminal.sendText('dab start');
    } else {
      vscode.window.showErrorMessage('This action can only be performed on a file named "dab-config.json".');
    }
  });

  context.subscriptions.push(startDabCommand);
}

export function deactivate() {}
