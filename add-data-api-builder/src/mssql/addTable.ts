import * as sql from 'mssql';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { openConnection, getTableMetadata } from './querySql';
import { runCommand } from '../runTerminal';

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

  await processTables(selectedTables, validTables, configPath);
}

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

async function chooseTables(metadata: { schemaName: string; tableName: string }[]): Promise<string[] | undefined> {
  const tableOptions = metadata.map(row => `${row.schemaName}.${row.tableName}`);

  return await vscode.window.showQuickPick(tableOptions, {
    canPickMany: true,
    placeHolder: 'Select tables to add',
  });
}

async function processTables(
  selectedTables: string[],
  validTables: { schemaName: string; tableName: string; primaryKeys: string; allColumns: string }[],
  configPath: string
) {
  const configDir = path.dirname(configPath);
  const configFile = path.basename(configPath);

  for (const table of selectedTables) {
    const [schema, tableName] = table.split('.');
    const entityName = tableName;
    const source = `${schema}.${tableName}`;
    const tableMetadata = validTables.find(t => `${t.schemaName}.${t.tableName}` === table);

    if (tableMetadata) {
      const addCommand = buildAddCommand(entityName, configFile, source, tableMetadata.primaryKeys);
      await runCommand(addCommand, { cwd: configDir });

      const updateCommand = buildUpdateCommand(entityName, configFile, tableMetadata.allColumns);
      await runCommand(updateCommand, { cwd: configDir });
    }
  }

  vscode.window.showInformationMessage(`Added and updated tables: ${selectedTables.join(', ')}`);
}

function buildAddCommand(entityName: string, configFile: string, source: string, primaryKeys: string): string {
  return `dab add ${entityName} -c "${configFile}" --source ${source} --source.key-fields "${primaryKeys}" --rest "${entityName}" --permissions "anonymous:*"`;
}

function buildUpdateCommand(entityName: string, configFile: string, allColumns: string): string {
  const mappings = allColumns.split(',').map(column => `${column}:${column}`).join(',');
  return `dab update ${entityName} -c "${configFile}" --map "${mappings}"`;
}
