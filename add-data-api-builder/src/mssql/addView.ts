import * as sql from 'mssql';
import * as vscode from 'vscode';
import * as path from 'path';
import { openConnection, getViewMetadata } from './querySql';
import { runCommand } from 'dab-vscode-shared';
import { showErrorMessageWithTimeout } from '../utils/messageTimeout';

export async function addView(configPath: string, connectionString: string) {
  const metadata = await fetchViewMetadata(connectionString);
  
  // If undefined, connection failed (error already shown)
  if (metadata === undefined) {
    return;
  }
  
  // If empty array, connection succeeded but no views found
  if (metadata.length === 0) {
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
    await showErrorMessageWithTimeout('No primary keys selected. Operation canceled.');
    return;
  }

  const configDir = path.dirname(configPath);
  const configFile = path.basename(configPath);

  const primaryKeys = selectedKeys.join(',');
  const allColumns = columnList.join(',');

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Adding view to configuration...',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: `Adding view: ${entityName}` });
      const addCommand = buildAddCommand(entityName, configFile, source, primaryKeys);
      await runCommand(addCommand, { cwd: configDir });

      // Add field descriptions for all columns with types
      const viewMetadata = metadata.find(v => `${v.schemaName}.${v.viewName}` === selectedView);
      if (viewMetadata && viewMetadata.columnDetails) {
        for (const column of viewMetadata.columnDetails) {
          const isPrimaryKey = selectedKeys.includes(column.name);
          progress.report({ message: `Adding field description: ${column.name}` });
          const fieldDescCommand = buildFieldDescriptionCommand(entityName, configFile, column.name, column.type, isPrimaryKey);
          await runCommand(fieldDescCommand, { cwd: configDir });
        }
      }
    }
  );

  vscode.window.showInformationMessage(`Added and updated view: ${entityName}`);
}

async function fetchViewMetadata(connectionString: string): Promise<{ schemaName: string; viewName: string; columns: string; columnDetails: Array<{name: string; type: string}> }[] | undefined> {
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Connecting to the database...',
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: 'Verifying connection...' });
      const pool = await openConnection(connectionString);

      if (!pool) {
        return undefined;
      }

      try {
        progress.report({ message: 'Fetching view metadata...' });
        const metadata = await getViewMetadata(pool);
        await pool.close();
        return metadata;
      } catch (error) {
        await showErrorMessageWithTimeout(`Error fetching view metadata: ${error}`);
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

function buildFieldDescriptionCommand(entityName: string, configFile: string, fieldName: string, fieldType: string, isPrimaryKey: boolean): string {
  return `dab update ${entityName} -c "${configFile}" --fields.name "${fieldName}" --fields.description "${fieldName} (${fieldType})" --fields.primary-key ${isPrimaryKey}`;
}
