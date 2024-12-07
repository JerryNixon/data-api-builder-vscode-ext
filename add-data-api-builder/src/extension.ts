import * as vscode from 'vscode';
import { addTable } from './mssql/addTable';
import { addView } from './mssql/addView';
import { addProc } from './mssql/addProc';
import { readDatabaseType, getConnectionString } from './readConfig';

export function activate(context: vscode.ExtensionContext) {
  const addDabCommand = vscode.commands.registerCommand('dabExtension.addDab', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    const dbType = await readDatabaseType(configPath);
    if (dbType !== 'mssql') {
      vscode.window.showErrorMessage(`Unsupported database type: ${dbType}. Only Microsoft SQL Server (mssql) is supported.`);
      return;
    }

    const connectionString = await getConnectionString(configPath);
    if (!connectionString) {
      vscode.window.showErrorMessage('Unable to retrieve the connection string. Please check your configuration.');
      return;
    }

    const options = ['Add Table', 'Add View', 'Add Stored Procedure'];
    const choice = await vscode.window.showQuickPick(options, {
      placeHolder: 'Choose an entity type to add',
    });

    if (!choice) {
      return;
    }

    switch (choice) {
      case 'Add Table':
        await addTable(configPath, connectionString);
        break;
      case 'Add View':
        await addView(configPath, connectionString);
        break;
      case 'Add Stored Procedure':
        await addProc(configPath, connectionString);
        break;
    }
  });

  context.subscriptions.push(addDabCommand);
}

export function deactivate() {}
