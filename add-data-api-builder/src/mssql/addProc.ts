import * as vscode from 'vscode';
import { openConnection, getProcedureMetadata } from './querySql';
import { runCommand } from '../runTerminal';
import { validateConfigPath, isProcedureInConfig } from '../readConfig';

/**
 * Adds stored procedures to the configuration by presenting a list of user-defined procedures to select from
 * and runs the `dab add` and `dab update` CLI commands.
 * @param configPath - The path to the configuration file.
 * @param connectionString - The SQL Server connection string.
 */
export async function addProc(configPath: string, connectionString: string) {
  if (!validateConfigPath(configPath)) {
    return;
  }

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
        if (!connectionPool) {
          throw new Error('Failed to connect to the database.');
        }

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

/**
 * Presents a list of stored procedures to the user and allows multiple selections.
 * @param metadata - The metadata of stored procedures containing name, paramInfo, and colInfo.
 * @returns An array of selected stored procedures.
 */
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

/**
 * Processes the stored procedures and executes the add and update commands.
 * @param selectedProcs - The selected procedures metadata.
 * @param configPath - The configuration file path.
 */
async function processProcedures(selectedProcs: any[], configPath: string) {
  let successCount = 0;
  const failedProcedures: string[] = [];

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

          const addCommand = buildAddCommand(entityName, configPath, source, paramInfo, restMethod);
          runCommand(addCommand);

          if (proc.colInfo) {
            progress.report({ message: `Updating stored procedure: ${entityName}` });
            const updateCommand = buildUpdateCommand(entityName, configPath, proc.colInfo);
            runCommand(updateCommand);
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

/**
 * Removes "@" & " " from parameter strings.
 * @param paramInfo - The comma-separated list of parameters.
 * @returns A sanitized parameter string.
 */
function sanitizeParams(paramInfo: string): string {
  return paramInfo.replace(/@/g, '').replace(/\s+/g, '');
}

/**
 * Builds the CLI command for adding a stored procedure.
 * @param entityName - The name of the entity.
 * @param configPath - The configuration file path.
 * @param source - The source procedure name.
 * @param paramInfo - The sanitized parameter info.
 * @param restMethod - The HTTP methods.
 * @returns The constructed CLI command string.
 */
function buildAddCommand(
  entityName: string,
  configPath: string,
  source: string,
  paramInfo: string,
  restMethod: string
): string {
  return `dab add ${entityName} -c "${configPath}" --source ${source} --source.type "stored-procedure" ${paramInfo ? `--source.params "${paramInfo}"` : ''} --permissions "anonymous:*" --rest "${entityName}" --rest.methods "${restMethod}"`;
}

/**
 * Builds the CLI command for updating a stored procedure.
 * @param entityName - The name of the entity.
 * @param configPath - The configuration file path.
 * @param colInfo - Column information.
 * @returns The constructed CLI command string.
 */
function buildUpdateCommand(entityName: string, configPath: string, colInfo: string): string {
  const mappings = colInfo
    .split(',')
    .map((column) => `${column.trim()}:${column.trim()}`)
    .join(',');

  return `dab update ${entityName} -c "${configPath}" --map "${mappings}"`;
}