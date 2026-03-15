import * as vscode from 'vscode';
import { getConnectionString, readConfig } from 'dab-vscode-shared';
import { addTable } from './mssql/addTable';
import { addView } from './mssql/addView';
import { addProc } from './mssql/addProc';
import { addRelationship } from './mssql/addRelationship';
import { addLinkingTable } from './mssql/addLinkingTable';
import { autoEntities } from './mssql/autoEntities';
import { showErrorMessageWithTimeout } from './utils/messageTimeout';

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

  const autoEntitiesCommand = vscode.commands.registerCommand('dabExtension.autoEntities', async (uri: vscode.Uri) => {
    if (!uri?.fsPath) {
      return;
    }
    await autoEntities(uri.fsPath);
  });

  context.subscriptions.push(
    addTableCommand,
    addViewCommand,
    addProcCommand,
    addRelationshipCommand,
    addLinkingTableCommand,
    autoEntitiesCommand
  );
}

async function handleAddEntity(uri: vscode.Uri, action: (configPath: string, connectionString: string) => Promise<void>, entityType: string) {
  const configPath = uri.fsPath;

  try {
    const config = readConfig(configPath);
    const dbType = config?.['data-source']?.['database-type'];
    
    if (dbType !== 'mssql') {
      await showErrorMessageWithTimeout(`Unsupported database type: ${dbType}. Only Microsoft SQL Server (mssql) is supported.`);
      return;
    }

    const connectionString = await getConnectionString(configPath);
    if (!connectionString) {
      await showErrorMessageWithTimeout('Unable to retrieve the connection string. Please check your configuration.');
      return;
    }

    await action(configPath, connectionString);
  } catch (error) {
    await showErrorMessageWithTimeout(`Error processing ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function deactivate() {}