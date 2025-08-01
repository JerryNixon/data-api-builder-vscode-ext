import * as sql from 'mssql';
import * as vscode from 'vscode';
import * as path from 'path';
import { openConnection, getViewMetadata } from './querySql';
import { runCommand } from '../runTerminal';

export async function addView(configPath: string, connectionString: string) {
  const metadata = await fetchViewMetadata(connectionString);
  if (!metadata || metadata.length === 0) {
    vscode.window.showInformationMessage('No user-defined views found.');
    return;
  }

  const selectedView = await chooseView(metadata);
  if (!selectedView) {
    vscode.window.showInformationMessage('No view selected.');
    return;
  }

  const [schema, viewName] = selectedView.split('.');
  const entityName = viewName;
  const source = `${schema}.${viewName}`;

  const viewColumns = metadata.find(v => `${v.schemaName}.${v.viewName}` === selectedView)?.columns || '';
  const columnList = viewColumns.split(',');

  const selectedKeys = await choosePrimaryKeys(columnList);
  if (!selectedKeys || selectedKeys.length === 0) {
    vscode.window.showErrorMessage('No primary keys selected. Operation canceled.');
    return;
  }

  const configDir = path.dirname(configPath);
  const configFile = path.basename(configPath);

  const primaryKeys = selectedKeys.join(',');
  const allColumns = columnList.join(',');

  const addCommand = buildAddCommand(entityName, configFile, source, primaryKeys);
  await runCommand(addCommand, { cwd: configDir });

  const updateCommand = buildUpdateCommand(entityName, configFile, allColumns);
  await runCommand(updateCommand, { cwd: configDir });

  vscode.window.showInformationMessage(`Added and updated view: ${entityName}`);
}

async function fetchViewMetadata(connectionString: string): Promise<{ schemaName: string; viewName: string; columns: string }[] | undefined> {
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Loading View Metadata...',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: 'Connecting to the database...' });
      const pool = await openConnection(connectionString);

      if (!pool) {
        vscode.window.showErrorMessage('Failed to connect to the database.');
        return undefined;
      }

      try {
        progress.report({ message: 'Fetching view metadata...' });
        const metadata = await getViewMetadata(pool);
        await pool.close();
        return metadata;
      } catch (error) {
        vscode.window.showErrorMessage(`Error fetching view metadata: ${error}`);
        return undefined;
      }
    }
  );
}

async function chooseView(metadata: { schemaName: string; viewName: string }[]): Promise<string | undefined> {
  const viewOptions = metadata.map(row => `${row.schemaName}.${row.viewName}`);

  return await vscode.window.showQuickPick(viewOptions, {
    placeHolder: 'Select a view to add',
  });
}

async function choosePrimaryKeys(columns: string[]): Promise<string[] | undefined> {
  return await vscode.window.showQuickPick(columns, {
    canPickMany: true,
    placeHolder: 'Select one or more columns to act as primary keys',
  });
}

function buildAddCommand(entityName: string, configFile: string, source: string, primaryKeys: string): string {
  return `dab add ${entityName} -c "${configFile}" --source ${source} --source.type "view" --source.key-fields "${primaryKeys}" --rest "${entityName}" --permissions "anonymous:*"`;
}

function buildUpdateCommand(entityName: string, configFile: string, allColumns: string): string {
  const mappings = allColumns.split(',').map(column => `${column}:${column}`).join(',');
  return `dab update ${entityName} -c "${configFile}" --map "${mappings}"`;
}
