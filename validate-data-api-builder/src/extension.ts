import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const startDabCommand = vscode.commands.registerCommand('dabExtension.validateDab', async (uri: vscode.Uri) => {
    if (uri && (uri.fsPath.endsWith('dab-config.json') || uri.fsPath.endsWith('staticwebapp.database.config.json'))) {
      const terminal = vscode.window.createTerminal('Data API');
      terminal.show();
      terminal.sendText(`cd "${path.dirname(uri.fsPath)}"`);

      // Include the file name in the -c option
      const configFileName = path.basename(uri.fsPath);
      terminal.sendText(`dab validate -c ${configFileName}`);
    } else {
      vscode.window.showErrorMessage(
        'This action can only be performed on files named "dab-config.json" or "staticwebapp.database.config.json".'
      );
    }
  });

  context.subscriptions.push(startDabCommand);
}

export function deactivate() {}
