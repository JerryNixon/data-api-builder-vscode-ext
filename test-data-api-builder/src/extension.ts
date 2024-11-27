import * as vscode from 'vscode';
import { testDatabaseConnection } from './testDatabase';
import { validateConfig } from './testFile';

export function activate(context: vscode.ExtensionContext) {
  const testConnectionCommand = vscode.commands.registerCommand('dabExtension.testConnection', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    const validation = validateConfig(configPath);
    if (!validation) return;

    const { dbType, connectionString } = validation;

    await testDatabaseConnection(dbType, connectionString);
  });

  context.subscriptions.push(testConnectionCommand);
}

export function deactivate() { }
