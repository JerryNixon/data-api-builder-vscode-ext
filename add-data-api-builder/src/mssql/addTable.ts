import * as sql from 'mssql';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { runCommand, readConfig } from 'dab-vscode-shared';
import { openConnection, getTableMetadata } from './querySql';
import { showErrorMessageWithTimeout } from '../utils/messageTimeout';

export async function addTable(configPath: string, connectionString: string) {
  const metadata = await fetchTableMetadata(connectionString);
  
  // If undefined, connection failed (error already shown)
  if (metadata === undefined) {
    return;
  }
  
  // If empty array, connection succeeded but no tables found
  if (metadata.length === 0) {
    vscode.window.showInformationMessage('No user-defined tables found.');
    return;
  }

  const existingEntities = await loadExistingEntities(configPath);
  const validTables = filterValidTables(metadata, existingEntities);

  if (validTables.length === 0) {
    await showErrorMessageWithTimeout('No new tables with primary keys found. Operation canceled.');
    return;
  }

  const selectedTables = await chooseTables(validTables);
  if (!selectedTables || selectedTables.length === 0) {
    vscode.window.showInformationMessage('No tables selected.');
    return;
  }

  await processTables(selectedTables, validTables, configPath);
}

async function fetchTableMetadata(connectionString: string): Promise<{ schemaName: string; tableName: string; primaryKeys: string; allColumns: string; columnDetails: Array<{name: string; type: string; isPrimaryKey: boolean}> }[] | undefined> {
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
        progress.report({ message: 'Fetching table metadata...' });
        const metadata = await getTableMetadata(pool);
        await pool.close();
        return metadata;
      } catch (error) {
        await showErrorMessageWithTimeout(`Error fetching table metadata: ${error}`);
        return undefined;
      }
    }
  );
}

function filterValidTables(
  metadata: { schemaName: string; tableName: string; primaryKeys: string; allColumns: string; columnDetails: Array<{name: string; type: string; isPrimaryKey: boolean}> }[],
  existingEntities: string[]
): { schemaName: string; tableName: string; primaryKeys: string; allColumns: string; columnDetails: Array<{name: string; type: string; isPrimaryKey: boolean}> }[] {
  return metadata.filter(
    table =>
      table.primaryKeys?.trim() &&
      !existingEntities.includes(`${table.schemaName}.${table.tableName}`)
  );
}

async function loadExistingEntities(configPath: string): Promise<string[]> {
  try {
    const config = readConfig(configPath);

    if (!config || !config.entities) {
      return [];
    }

    return Object.values(config.entities)
      .map((entity: any) => entity.source?.object)
      .filter((source: string | undefined) => source)
      .map((source: string) => source.replace(/[\[\]]/g, ''));
  } catch (error) {
    await showErrorMessageWithTimeout(`Error reading configuration file: ${error}`);
    return [];
  }
}

async function chooseTables(metadata: { schemaName: string; tableName: string }[]): Promise<string[] | undefined> {
  const tableOptions = metadata.map(row => `${row.schemaName}.${row.tableName}`);

  return await vscode.window.showQuickPick(tableOptions, {
    canPickMany: true,
    placeHolder: 'Select tables to add',
  });
}

async function processTables(
  selectedTables: string[],
  validTables: { schemaName: string; tableName: string; primaryKeys: string; allColumns: string; columnDetails: Array<{name: string; type: string; isPrimaryKey: boolean}> }[],
  configPath: string
) {
  const configDir = path.dirname(configPath);
  const configFile = path.basename(configPath);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Adding tables to configuration...',
      cancellable: false,
    },
    async (progress) => {
      for (const table of selectedTables) {
        const [schema, tableName] = table.split('.');
        const entityName = tableName;
        const source = `${schema}.${tableName}`;
        const tableMetadata = validTables.find(t => `${t.schemaName}.${t.tableName}` === table);

        if (tableMetadata) {
          progress.report({ message: `Adding table: ${entityName}` });
          const addCommand = buildAddCommand(entityName, configFile, source, tableMetadata.primaryKeys);
          await runCommand(addCommand, { cwd: configDir });

          // Add field descriptions for all columns with types
          for (const column of tableMetadata.columnDetails) {
            progress.report({ message: `Adding field description: ${column.name}` });
            const fieldDescCommand = buildFieldDescriptionCommand(entityName, configFile, column.name, column.type, column.isPrimaryKey);
            await runCommand(fieldDescCommand, { cwd: configDir });
          }
        }
      }
    }
  );

  vscode.window.showInformationMessage(`Added and updated tables: ${selectedTables.join(', ')}`);
}

function buildAddCommand(entityName: string, configFile: string, source: string, primaryKeys: string): string {
  return `dab add ${entityName} -c "${configFile}" --source ${source} --source.key-fields "${primaryKeys}" --rest "${entityName}" --permissions "anonymous:*"`;
}

function buildFieldDescriptionCommand(entityName: string, configFile: string, fieldName: string, fieldType: string, isPrimaryKey: boolean): string {
  return `dab update ${entityName} -c "${configFile}" --fields.name "${fieldName}" --fields.description "${fieldName} (${fieldType})" --fields.primary-key ${isPrimaryKey}`;
}
