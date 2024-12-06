import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const startDabCommand = vscode.commands.registerCommand('dabExtension.startDab', async (uri: vscode.Uri) => {
    const terminal = vscode.window.createTerminal('Data API');
    terminal.show();
    terminal.sendText(`cd "${path.dirname(uri.fsPath)}"`);

    // Include the file name in the -c option
    const configFileName = path.basename(uri.fsPath);
    terminal.sendText(`dab start -c ${configFileName}`);
  });

  context.subscriptions.push(startDabCommand);
}

export function deactivate() { }
