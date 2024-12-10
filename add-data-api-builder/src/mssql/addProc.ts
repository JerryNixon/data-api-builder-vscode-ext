import * as vscode from 'vscode';
import { openConnection, getProcedureMetadata } from './querySql';
import { runCommand } from '../runTerminal';
import { validateConfigPath, isProcedureInConfig } from '../readConfig'; 

/**
 * Parses the stored procedure script to extract default parameter values.
 * @param script - The full T-SQL script of the stored procedure.
 * @param paramInfo - The comma-separated list of parameters.
 * @returns An object mapping parameter names to their default values or null if there's a mismatch.
 */
function parseParamDefaults(script: string, paramInfo: string): { [key: string]: string | number | boolean | null } | null {
  if (!paramInfo.trim()) {
    return {};
  }

  // Extract parameter names without converting to lowercase
  const params = paramInfo.split(',').map(p => p.trim().replace('@', ''));

  // Initialize defaults with all parameters set to null
  const defaults: { [key: string]: string | number | boolean | null } = {};
  for (const param of params) {
    defaults[param] = null;
  }

  // Build dynamic regex to match exact parameter names with optional default values
  const paramRegex = new RegExp(`(@\\w+)\\s+([\\w\\(\\)]+)\\s*=\\s*('[^']*'|\\d+)`, 'g');

  let match: RegExpExecArray | null;

  while ((match = paramRegex.exec(script)) !== null) {
    const paramName = match[1].replace('@', '');
    let paramValue: string | number | boolean | null = match[3];

    if (/^\d+$/.test(paramValue)) {
      paramValue = Number(paramValue);
    } else if (/^(true|false)$/i.test(paramValue)) {
      paramValue = paramValue.toLowerCase() === 'true';
    } else {
      paramValue = paramValue.replace(/'/g, '');
    }

    // Update the defaults dictionary with the found value
    if (paramName in defaults) {
      defaults[paramName] = paramValue;
    }
  }

  return defaults;
}

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

  // Filter out procedures already in the config
  const filteredMetadata = [];
  for (const proc of metadata) {
    const existsInConfig = await isProcedureInConfig(configPath, proc.name);
    if (!existsInConfig) {
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

  let successCount = 0;
  let failedProcedures: string[] = [];

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
        const params = proc.paramInfo || '';
        const script = proc.script || '';

        if (!script) {
          vscode.window.showErrorMessage(`Cannot parse parameters for encrypted or invalid procedure: ${entityName}`);
          failedProcedures.push(entityName);
          continue;
        }

        const paramDefaults = parseParamDefaults(script, params);
        if (!paramDefaults) {
          vscode.window.showErrorMessage(`Failed to parse parameters for: ${entityName}. The declared parameters do not match the parsed parameters.`);
          failedProcedures.push(entityName);
          continue;
        }

        const paramDictEntries = Object.entries(paramDefaults)
          .filter(([_, value]) => value !== null) // Only include parameters with default values
          .map(([key, value]) => `${key}:${value}`);

        const paramDict = paramDictEntries.join(',');

        // Determine REST method based on the presence of parameters
        const restMethod = paramDictEntries.length === 0 ? 'GET, POST' : 'POST';

        try {
          progress.report({ message: `Adding stored procedure: ${entityName}` });

          const addCommand = `dab add ${entityName} -c "${configPath}" --source ${source} --source.type "stored-procedure" ${
            paramDict ? `--source.params "${paramDict}"` : ''
          } --permissions "anonymous:*" --rest "${entityName}" --rest.methods "${restMethod}"`;

          runCommand(addCommand);

          if (proc.colInfo) {
            const mappings = proc.colInfo
              .split(',')
              .map((column) => `${column.trim()}:${column.trim()}`)
              .join(',');

            progress.report({ message: `Updating stored procedure: ${entityName}` });
            const updateCommand = `dab update ${entityName} -c "${configPath}" --map "${mappings}"`;
            runCommand(updateCommand);
          } else {
            vscode.window.showWarningMessage(`No result columns found for stored procedure: ${entityName}. Skipping update.`);
          }

          successCount++;
        } catch (error) {
          vscode.window.showErrorMessage(`Error processing stored procedure ${entityName}: ${error}`);
          failedProcedures.push(entityName);
        }
      }
    }
  );

  if (successCount > 0) {
    vscode.window.showInformationMessage(`Successfully added and updated ${successCount} stored procedure(s).`);
  }

  if (failedProcedures.length > 0) {
    vscode.window.showErrorMessage(`Failed to process the following procedures: ${failedProcedures.join(', ')}`);
  }
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

  if (selected) {
    return selected.map((item) => item.value);
  }

  return undefined;
}
