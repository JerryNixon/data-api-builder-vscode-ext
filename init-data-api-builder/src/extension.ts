// src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { run } from './terminalManager';
import { ask, PromptResult } from './promptManager';

export function activate(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand('dabExtension.initDab', async (uri: vscode.Uri) => {
    const folder = uri.fsPath;
    const configPath = resolveConfigPath(folder);

    try {
      const result: PromptResult = await ask(folder);
      const { connection, enableCache } = result;

      if (!connection) {
        vscode.window.showErrorMessage('No connection string selected.');
        return;
      }

      run(buildInitCommand(folder, configPath, connection.name, result));

      if (enableCache) {
        run(`cd "${folder}" && dab configure --runtime.cache.enabled true`);
      }

      await openFile(configPath);
    } catch (err) {
      vscode.window.showErrorMessage((err as Error).message);
    }
  });

  context.subscriptions.push(cmd);
}

// Generate unique config path
function resolveConfigPath(folderPath: string): string {
  const base = 'dab-config';
  const ext = '.json';
  let candidate = path.join(folderPath, `${base}${ext}`);
  let i = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(folderPath, `${base}-${i}${ext}`);
    i++;
  }
  return candidate;
}

// Open config file after init
async function openFile(filePath: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

// Build the dab init command
function buildInitCommand(folder: string, configPath: string, envKey: string, result: PromptResult): string {
  const args = [
    `dab init`,
    `--database-type mssql`,
    `--connection-string "@env('${envKey}')"`,
    `--host-mode ${result.hostMode}`,
    `--rest.enabled ${result.enableRest}`,
    `--graphql.enabled ${result.enableGraphQL}`,
    `--auth.provider ${result.security}`,
    `-c "${configPath}"`
  ];
  return `cd "${folder}" && ${args.join(' ')}`;
}

export function deactivate() {}
