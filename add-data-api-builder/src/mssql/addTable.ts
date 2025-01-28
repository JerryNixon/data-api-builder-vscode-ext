import * as sql from 'mssql';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { openConnection, getTableMetadata } from './querySql';
import { runCommand } from '../runTerminal';

/**
 * Adds tables to the configuration by presenting a list of user-defined tables to select from
 * and runs the `dab add` and `dab update` CLI commands for each selected table.
 * @param configPath - The path to the configuration file.
 * @param connectionString - The SQL Server connection string.
 */
export async function addTable(configPath: string, connectionString: string) {
  const metadata = await fetchTableMetadata(connectionString);
  if (!metadata || metadata.length === 0) {
    vscode.window.showInformationMessage('No user-defined tables found.');
    return;
  }

  const existingEntities = loadExistingEntities(configPath);
  const validTables = filterValidTables(metadata, existingEntities);

  if (validTables.length === 0) {
    vscode.window.showErrorMessage('No new tables with primary keys found. Operation canceled.');
    return;
  }

  const selectedTables = await chooseTables(validTables);
  if (!selectedTables || selectedTables.length === 0) {
    vscode.window.showInformationMessage('No tables selected.');
    return;
  }

  processTables(selectedTables, validTables, configPath);
}

/**
 * Fetches metadata of tables from the database.
 * @param connectionString - The SQL Server connection string.
 * @returns An array of table metadata or undefined in case of failure.
 */
async function fetchTableMetadata(connectionString: string): Promise<{ schemaName: string; tableName: string; primaryKeys: string; allColumns: string }[] | undefined> {
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Loading Table Metadata...',
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
        progress.report({ message: 'Fetching table metadata...' });
        const metadata = await getTableMetadata(pool);
        await pool.close();
        return metadata;
      } catch (error) {
        vscode.window.showErrorMessage(`Error fetching table metadata: ${error}`);
        return undefined;
      }
    }
  );
}

/**
 * Filters valid tables based on primary keys and existing entities.
 * @param metadata - The table metadata fetched from the database.
 * @param existingEntities - List of schema-qualified table names already in the configuration.
 * @returns An array of valid tables.
 */
function filterValidTables(
  metadata: { schemaName: string; tableName: string; primaryKeys: string; allColumns: string }[],
  existingEntities: string[]
): { schemaName: string; tableName: string; primaryKeys: string; allColumns: string }[] {
  return metadata.filter(
    table =>
      table.primaryKeys?.trim() &&
      !existingEntities.includes(`${table.schemaName}.${table.tableName}`)
  );
}

/**
 * Loads the existing entities from the configuration file.
 * @param configPath - The path to the configuration file.
 * @returns An array of schema-qualified table names already in the configuration.
 */
function loadExistingEntities(configPath: string): string[] {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    if (!config.entities) {
      return [];
    }

    return Object.values(config.entities)
      .map((entity: any) => entity.source?.object)
      .filter((source: string | undefined) => source)
      .map((source: string) => source.replace(/[\[\]]/g, ''));
  } catch (error) {
    vscode.window.showErrorMessage(`Error reading configuration file: ${error}`);
    return [];
  }
}

/**
 * Presents a list of tables to the user and allows multiple selections.
 * @param metadata - The metadata of tables containing schemaName and tableName.
 * @returns An array of selected tables in the format "schemaName.tableName".
 */
async function chooseTables(metadata: { schemaName: string; tableName: string }[]): Promise<string[] | undefined> {
  const tableOptions = metadata.map(row => `${row.schemaName}.${row.tableName}`);

  return await vscode.window.showQuickPick(tableOptions, {
    canPickMany: true,
    placeHolder: 'Select tables to add',
  });
}

/**
 * Processes the selected tables and executes the add and update commands.
 * @param selectedTables - The selected tables in "schemaName.tableName" format.
 * @param validTables - The valid tables metadata.
 * @param configPath - The configuration file path.
 */
function processTables(
  selectedTables: string[],
  validTables: { schemaName: string; tableName: string; primaryKeys: string; allColumns: string }[],
  configPath: string
) {
  selectedTables.forEach(table => {
    const [schema, tableName] = table.split('.');
    const entityName = tableName;
    const source = `${schema}.${tableName}`;
    const tableMetadata = validTables.find(t => `${t.schemaName}.${t.tableName}` === table);

    if (tableMetadata) {
      const addCommand = buildAddCommand(entityName, configPath, source, tableMetadata.primaryKeys);
      runCommand(addCommand);

      const updateCommand = buildUpdateCommand(entityName, configPath, tableMetadata.allColumns);
      runCommand(updateCommand);
    }
  });

  vscode.window.showInformationMessage(`Added and updated tables: ${selectedTables.join(', ')}`);
}

/**
 * Builds the `dab add` command to add a table entity.
 * @param entityName - The name of the entity.
 * @param configPath - The path to the configuration file.
 * @param source - The schema-qualified table name.
 * @param primaryKeys - The primary key fields for the table.
 * @returns The constructed `dab add` command.
 */
function buildAddCommand(entityName: string, configPath: string, source: string, primaryKeys: string): string {
  return `dab add ${entityName} -c "${configPath}" --source ${source} --source.key-fields "${primaryKeys}" --rest "${entityName}" --permissions "anonymous:*"`;
}

/**
 * Builds the `dab update` command to add mappings to the table entity.
 * @param entityName - The name of the entity.
 * @param configPath - The path to the configuration file.
 * @param allColumns - A comma-separated string of all column names.
 * @returns The constructed `dab update` command.
 */
function buildUpdateCommand(entityName: string, configPath: string, allColumns: string): string {
  const mappings = allColumns.split(',').map(column => `${column}:${column}`).join(',');
  return `dab update ${entityName} -c "${configPath}" --map "${mappings}"`;
}
