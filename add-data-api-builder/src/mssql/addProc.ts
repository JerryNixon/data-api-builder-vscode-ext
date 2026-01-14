import * as vscode from 'vscode';
import * as path from 'path';
import { openConnection, getProcedureMetadata } from './querySql';
import { runCommand } from 'dab-vscode-shared';
import { validateConfigPath } from 'dab-vscode-shared';
import { isProcedureInConfig } from '../readConfig';
import { showErrorMessageWithTimeout } from '../utils/messageTimeout';

export async function addProc(configPath: string, connectionString: string) {
  if (!validateConfigPath(configPath)) {
    return;
  }

  const metadata = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Fetching stored procedures from database...',
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ message: 'Connecting to database...' });
        const connectionPool = await openConnection(connectionString);
        if (!connectionPool) {
          throw new Error('Failed to connect to the database.');
        }
        progress.report({ message: 'Retrieving stored procedure metadata...' });
        const fetchedMetadata = await getProcedureMetadata(connectionPool);
        await connectionPool.close();
        return fetchedMetadata;
      } catch (error) {
        await showErrorMessageWithTimeout(`Error fetching procedure metadata: ${error}`);
        return null;
      }
    }
  );

  // If null/undefined, connection failed (error already shown)
  if (!metadata) {
    return;
  }

  // If empty array, connection succeeded but no procedures found
  if (metadata.length === 0) {
    vscode.window.showInformationMessage('No user-defined stored procedures found.');
    return;
  }

  // Filter out procedures that are already in the config
  const filteredMetadata: typeof metadata = [];
  for (const proc of metadata) {
    const isInConfig = await isProcedureInConfig(configPath, proc.name);
    if (!isInConfig) {
      filteredMetadata.push(proc);
    }
  }

  if (filteredMetadata.length === 0) {
    vscode.window.showInformationMessage('All stored procedures are already in the configuration.');
    return;
  }

  const selectedProcs = await chooseProcedures(filteredMetadata);
  if (!selectedProcs || selectedProcs.length === 0) {
    vscode.window.showInformationMessage('No stored procedures selected.');
    return;
  }

  await processProcedures(selectedProcs, configPath);
}

async function chooseProcedures(metadata: { name: string; paramInfo: string; colInfo: string; script: string; parameters: Array<{name: string; type: string}> }[]): Promise<{ name: string; paramInfo: string; colInfo: string; script: string; parameters: Array<{name: string; type: string}> }[] | undefined> {
  const procOptions = metadata.map((row) => ({
    label: row.name,
    description: `Params: ${row.paramInfo || 'None'}`,
    detail: `Columns: ${row.colInfo || 'None'}`,
    value: row,
  }));

  const selected = await vscode.window.showQuickPick(procOptions, {
    canPickMany: true,
    placeHolder: 'Select one or more stored procedures to add',
  });

  return selected?.map((item) => item.value);
}

async function processProcedures(selectedProcs: any[], configPath: string) {
  let successCount = 0;
  const failedProcedures: string[] = [];

  const configDir = path.dirname(configPath);
  const configFile = path.basename(configPath);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Updating configuration...',
      cancellable: false,
    },
    async (progress) => {
      for (const proc of selectedProcs) {
        // Strip brackets from entity name
        const entityName = (proc.name.split('.').pop() || proc.name).replace(/[\[\]]/g, '');
        const source = proc.name;
        const paramInfo = sanitizeParams(proc.paramInfo || '');
        const restMethod = 'GET';

        try {
          progress.report({ message: `Adding stored procedure: ${entityName}` });
          const addCommand = buildAddCommand(entityName, configFile, source, paramInfo, restMethod);
          await runCommand(addCommand, { cwd: configDir });

          // Add parameter descriptions
          if (proc.parameters && proc.parameters.length > 0) {
            for (const param of proc.parameters) {
              progress.report({ message: `Adding description for parameter: ${param.name}` });
              const paramDescCommand = buildParameterDescriptionCommand(entityName, configFile, param.name, param.type);
              await runCommand(paramDescCommand, { cwd: configDir });
            }
          }

          // Add field descriptions for result columns
          if (proc.colInfo) {
            const columns = proc.colInfo.split(',');
            for (const column of columns) {
              const columnName = column.trim();
              if (columnName) {
                progress.report({ message: `Adding description for field: ${columnName}` });
                const fieldDescCommand = buildFieldDescriptionCommand(entityName, configFile, columnName);
                await runCommand(fieldDescCommand, { cwd: configDir });
              }
            }
          }

          successCount++;
        } catch (error) {
          const errorMessage = (error as Error).message || 'Unknown error occurred';
          await showErrorMessageWithTimeout(`Error processing stored procedure ${entityName}: ${errorMessage}`);
          failedProcedures.push(entityName);
        }
      }
    }
  );

  if (failedProcedures.length > 0) {
    await showErrorMessageWithTimeout(`Failed to process the following procedures: ${failedProcedures.join(', ')}`);
  }
}

function sanitizeParams(paramInfo: string): string {
  return paramInfo.replace(/@/g, '').replace(/\s+/g, '');
}

function buildAddCommand(
  entityName: string,
  configFile: string,
  source: string,
  paramInfo: string,
  restMethod: string
): string {
  // DAB CLI automatically introspects stored procedure parameters, so we don't pass --source.params
  // Only pass REST methods based on whether procedure has parameters (POST for params, GET/POST for parameterless)
  return `dab add ${entityName} -c "${configFile}" --source ${source} --source.type "stored-procedure" --permissions "anonymous:*" --rest "${entityName}" --rest.methods "${restMethod}"`;
}

function buildUpdateCommand(entityName: string, configFile: string, colInfo: string): string {
  const mappings = colInfo
    .split(',')
    .map((column) => `${column.trim()}:${column.trim()}`)
    .join(',');

  return `dab update ${entityName} -c "${configFile}" --map "${mappings}"`;
}

function buildParameterDescriptionCommand(entityName: string, configFile: string, paramName: string, paramType: string): string {
  const description = `${paramName} (${paramType})`;
  return `dab update ${entityName} -c "${configFile}" --parameters.name "${paramName}" --parameters.description "${description}"`;
}

function buildFieldDescriptionCommand(entityName: string, configFile: string, fieldName: string): string {
  return `dab update ${entityName} -c "${configFile}" --fields.name "${fieldName}" --fields.description "${fieldName} result column"`;
}
