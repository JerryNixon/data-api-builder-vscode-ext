import * as vscode from 'vscode';
import * as path from 'path';
import { openConnection, getProcedureMetadata } from './querySql';
import { runCommand } from '../runTerminal';
import { validateConfigPath, isProcedureInConfig } from '../readConfig';

export async function addProc(configPath: string, connectionString: string) {
  if (!validateConfigPath(configPath)) return;

  const metadata = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Connecting to the database...',
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ message: 'Connecting to the database...' });
        const connectionPool = await openConnection(connectionString);
        if (!connectionPool) throw new Error('Failed to connect to the database.');
        progress.report({ message: 'Fetching list of procedures...' });
        const fetchedMetadata = await getProcedureMetadata(connectionPool);
        await connectionPool.close();
        return fetchedMetadata;
      } catch (error) {
        vscode.window.showErrorMessage(`Error fetching procedure metadata: ${error}`);
        return null;
      }
    }
  );

  if (!metadata) {
    vscode.window.showErrorMessage('Failed to retrieve stored procedures metadata.');
    return;
  }

  if (metadata.length === 0) {
    vscode.window.showInformationMessage('No user-defined stored procedures found.');
    return;
  }

  const filteredMetadata = await Promise.all(
    metadata.filter(async (proc) => !(await isProcedureInConfig(configPath, proc.name)))
  );

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

async function chooseProcedures(metadata: { name: string; paramInfo: string; colInfo: string; script: string }[]): Promise<{ name: string; paramInfo: string; colInfo: string; script: string }[] | undefined> {
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
        const entityName = proc.name.split('.').pop() || proc.name;
        const source = proc.name;
        const paramInfo = sanitizeParams(proc.paramInfo || '');
        const restMethod = paramInfo ? 'POST' : 'GET, POST';

        try {
          progress.report({ message: `Adding stored procedure: ${entityName}` });
          const addCommand = buildAddCommand(entityName, configFile, source, paramInfo, restMethod);
          await runCommand(addCommand, { cwd: configDir });

          if (proc.colInfo) {
            progress.report({ message: `Updating stored procedure: ${entityName}` });
            const updateCommand = buildUpdateCommand(entityName, configFile, proc.colInfo);
            await runCommand(updateCommand, { cwd: configDir });
          } else {
            vscode.window.showWarningMessage(`No result columns found for stored procedure: ${entityName}. Skipping update.`);
          }

          successCount++;
        } catch (error) {
          const errorMessage = (error as Error).message || 'Unknown error occurred';
          vscode.window.showErrorMessage(`Error processing stored procedure ${entityName}: ${errorMessage}`);
          failedProcedures.push(entityName);
        }
      }
    }
  );

  if (failedProcedures.length > 0) {
    vscode.window.showErrorMessage(`Failed to process the following procedures: ${failedProcedures.join(', ')}`);
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
  return `dab add ${entityName} -c "${configFile}" --source ${source} --source.type "stored-procedure" ${paramInfo ? `--source.params "${paramInfo}"` : ''} --permissions "anonymous:*" --rest "${entityName}" --rest.methods "${restMethod}"`;
}

function buildUpdateCommand(entityName: string, configFile: string, colInfo: string): string {
  const mappings = colInfo
    .split(',')
    .map((column) => `${column.trim()}:${column.trim()}`)
    .join(',');

  return `dab update ${entityName} -c "${configFile}" --map "${mappings}"`;
}
