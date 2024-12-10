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
  let validTables: { schemaName: string; tableName: string; primaryKeys: string; allColumns: string }[] = [];

  const pool = await vscode.window.withProgress(
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
        if (metadata.length === 0) {
          vscode.window.showInformationMessage('No user-defined tables found.');
          await pool.close();
          return undefined;
        }

        progress.report({ message: 'Loading configuration...' });
        const existingEntities = getExistingEntities(configPath);

        // Filter out tables with no primary keys or tables already in the configuration
        validTables = metadata.filter(
          table =>
            table.primaryKeys &&
            table.primaryKeys.trim() !== '' &&
            !existingEntities.includes(`${table.schemaName}.${table.tableName}`)
        );

        if (validTables.length === 0) {
          vscode.window.showErrorMessage('No new tables with primary keys found. Operation canceled.');
          await pool.close();
          return undefined;
        }

        return pool;
      } catch (error) {
        vscode.window.showErrorMessage(`Error adding tables: ${error}`);
        await pool.close();
        return undefined;
      }
    }
  );

  if (!pool) {
    return;
  }

  // At this point, the progress dialog is gone, and we can show the table selection dialog
  const selectedTables = await chooseTable(validTables);
  if (!selectedTables || selectedTables.length === 0) {
    vscode.window.showInformationMessage('No tables selected.');
    await pool.close();
    return;
  }

  selectedTables.forEach(table => {
    const [schema, tableName] = table.split('.');
    const entityName = tableName;
    const source = `${schema}.${tableName}`;
    const primaryKeys = validTables.find(t => `${t.schemaName}.${t.tableName}` === table)?.primaryKeys || '';
    const allColumns = validTables.find(t => `${t.schemaName}.${t.tableName}` === table)?.allColumns || '';

    callAddTable(configPath, entityName, source, primaryKeys);
    callUpdateTable(configPath, entityName, allColumns);
  });

  vscode.window.showInformationMessage(`Added and updated tables: ${selectedTables.join(', ')}`);
  await pool.close();
}

/**
 * Loads the existing entities from the configuration file.
 * @param configPath - The path to the configuration file.
 * @returns An array of schema-qualified table names already in the configuration.
 */
function getExistingEntities(configPath: string): string[] {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    if (!config.entities) {
      return [];
    }

    return Object.values(config.entities)
      .map((entity: any) => entity.source?.object)
      .filter((source: string | undefined) => source)
      .map((source: string) => source.replace(/[\[\]]/g, '')); // Remove brackets from source names
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
async function chooseTable(metadata: { schemaName: string; tableName: string }[]): Promise<string[] | undefined> {
  const tableOptions = metadata.map(row => `${row.schemaName}.${row.tableName}`);

  return await vscode.window.showQuickPick(tableOptions, {
    canPickMany: true,
    placeHolder: 'Select tables to add',
  });
}

/**
 * Calls the `dab add` command to add a table entity.
 * @param configPath - The path to the configuration file.
 * @param entityName - The name of the entity.
 * @param source - The schema-qualified table name.
 * @param primaryKeys - The primary key fields for the table.
 */
function callAddTable(configPath: string, entityName: string, source: string, primaryKeys: string) {
  const command = `dab add ${entityName} -c "${configPath}" --source ${source} --source.key-fields "${primaryKeys}" --rest "${entityName}" --permissions "anonymous:*"`;
  runCommand(command);
}

/**
 * Calls the `dab update` command to add mappings to the table entity.
 * @param configPath - The path to the configuration file.
 * @param entityName - The name of the entity.
 * @param allColumns - A comma-separated string of all column names.
 */
function callUpdateTable(configPath: string, entityName: string, allColumns: string) {
  // Generate the mapping string: "column1:column1,column2:column2"
  const mappings = allColumns.split(',').map(column => `${column}:${column}`).join(',');
  const command = `dab update ${entityName} -c "${configPath}" --map "${mappings}"`;
  runCommand(command);
}

