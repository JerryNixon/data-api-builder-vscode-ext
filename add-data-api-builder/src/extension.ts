import * as vscode from 'vscode';
import { addTable } from './mssql/addTable';
import { addView } from './mssql/addView';
import { addProc } from './mssql/addProc';
import { addRelationship } from './mssql/addRelationship';
import { addLinkingTable } from './mssql/addLinkingTable';
import { readDatabaseType, getConnectionString } from './readConfig';

export function activate(context: vscode.ExtensionContext) {
  const addTableCommand = vscode.commands.registerCommand('dabExtension.addTable', async (uri: vscode.Uri) => {
    await handleAddEntity(uri, addTable, 'Add Table');
  });

  const addViewCommand = vscode.commands.registerCommand('dabExtension.addView', async (uri: vscode.Uri) => {
    await handleAddEntity(uri, addView, 'Add View');
  });

  const addProcCommand = vscode.commands.registerCommand('dabExtension.addProc', async (uri: vscode.Uri) => {
    await handleAddEntity(uri, addProc, 'Add Stored Procedure');
  });

  const addRelationshipCommand = vscode.commands.registerCommand('dabExtension.addRelationship', async (uri: vscode.Uri) => {
    await handleAddEntity(uri, addRelationship, 'Add Relationship');
  });

  const addLinkingTableCommand = vscode.commands.registerCommand('dabExtension.addLinkingTable', async (uri: vscode.Uri) => {
    await handleAddEntity(uri, addLinkingTable, 'Add Linking Table');
  });

  context.subscriptions.push(
    addTableCommand,
    addViewCommand,
    addProcCommand,
    addRelationshipCommand,
    addLinkingTableCommand
  );
}

async function handleAddEntity(uri: vscode.Uri, action: (configPath: string, connectionString: string) => Promise<void>, entityType: string) {
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

  await action(configPath, connectionString);
}

export function deactivate() {}
