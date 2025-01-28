import * as sql from 'mssql';
import * as vscode from 'vscode';
import { openConnection, getViewMetadata } from './querySql';
import { runCommand } from '../runTerminal';

/**
 * Adds views to the configuration by presenting a list of user-defined views to select from.
 * Prompts the user for primary key fields and runs the `dab add` and `dab update` CLI commands.
 * @param configPath - The path to the configuration file.
 * @param connectionString - The SQL Server connection string.
 */
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

  const primaryKeys = selectedKeys.join(',');
  const allColumns = columnList.join(',');

  const addCommand = buildAddCommand(entityName, configPath, source, primaryKeys);
  runCommand(addCommand);

  const updateCommand = buildUpdateCommand(entityName, configPath, allColumns);
  runCommand(updateCommand);

  vscode.window.showInformationMessage(`Added and updated view: ${entityName}`);
}

/**
 * Fetches metadata of views from the database.
 * @param connectionString - The SQL Server connection string.
 * @returns An array of view metadata or undefined in case of failure.
 */
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

/**
 * Presents a list of views to the user and allows single selection.
 * @param metadata - The metadata of views containing schemaName and viewName.
 * @returns The selected view in the format "schemaName.viewName".
 */
async function chooseView(metadata: { schemaName: string; viewName: string }[]): Promise<string | undefined> {
  const viewOptions = metadata.map(row => `${row.schemaName}.${row.viewName}`);

  return await vscode.window.showQuickPick(viewOptions, {
    placeHolder: 'Select a view to add',
  });
}

/**
 * Prompts the user to select primary key fields from a list of columns.
 * @param columns - The list of column names.
 * @returns An array of selected primary key fields.
 */
async function choosePrimaryKeys(columns: string[]): Promise<string[] | undefined> {
  return await vscode.window.showQuickPick(columns, {
    canPickMany: true,
    placeHolder: 'Select one or more columns to act as primary keys',
  });
}

/**
 * Builds the `dab add` command to add a view entity.
 * @param entityName - The name of the entity.
 * @param configPath - The path to the configuration file.
 * @param source - The schema-qualified view name.
 * @param primaryKeys - The primary key fields for the view.
 * @returns The constructed `dab add` command.
 */
function buildAddCommand(entityName: string, configPath: string, source: string, primaryKeys: string): string {
  return `dab add ${entityName} -c "${configPath}" --source ${source} --source.type "view" --source.key-fields "${primaryKeys}" --rest "${entityName}" --permissions "anonymous:*"`;
}

/**
 * Builds the `dab update` command to add mappings to the view entity.
 * @param entityName - The name of the entity.
 * @param configPath - The path to the configuration file.
 * @param allColumns - A comma-separated string of all column names.
 * @returns The constructed `dab update` command.
 */
function buildUpdateCommand(entityName: string, configPath: string, allColumns: string): string {
  const mappings = allColumns.split(',').map(column => `${column}:${column}`).join(',');
  return `dab update ${entityName} -c "${configPath}" --map "${mappings}"`;
}
