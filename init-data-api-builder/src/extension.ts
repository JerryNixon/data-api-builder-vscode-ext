import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { run } from './terminalManager';
import { ask, PromptResult } from './promptManager';

export function activate(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand('dabExtension.initDab', async (uri: vscode.Uri) => {
    const folder = uri.fsPath;
    const configPath = resolveConfigPath(folder);

    let result: PromptResult;
    try {
      result = await ask(folder);
      if (!result.connection) {
        vscode.window.showErrorMessage('No connection string selected.');
        return;
      }
    } catch (err) {
      vscode.window.showErrorMessage((err as Error).message);
      return;
    }

    const { connection, enableCache } = result;

    try {
      run(buildInitCommand(configPath, connection.name, result), { cwd: folder });
      run(buildConfigCommand(configPath, 'runtime.rest.request-body-strict', 'false'), { cwd: folder });

      if (enableCache) {
        run(buildConfigCommand(configPath, 'runtime.cache.enabled', 'true'), { cwd: folder });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      await openFile(configPath);

      const uri = vscode.Uri.file(configPath);
      await vscode.commands.executeCommand('dabExtension.addTable', uri);
    } catch (err) {
      vscode.window.showErrorMessage((err as Error).message);
    }
  });

  context.subscriptions.push(cmd);
}

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

async function openFile(filePath: string): Promise<void> {
  await waitForFile(filePath, 3000);
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

async function waitForFile(filePath: string, timeout: number): Promise<void> {
  const interval = 100;
  const maxAttempts = timeout / interval;
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (fs.existsSync(filePath)) {
        clearInterval(timer);
        resolve();
      } else if (++attempts > maxAttempts) {
        clearInterval(timer);
        reject(new Error(`File not found: ${filePath}`));
      }
    }, interval);
  });
}

function buildInitCommand(configPath: string, envKey: string, result: PromptResult): string {
  const args = [
    `dab init`,
    `--database-type mssql`,
    `--connection-string "@env('${envKey}')"`,

    `--host-mode ${result.hostMode}`,
    `--rest.enabled ${result.enableRest}`,
    `--graphql.enabled ${result.enableGraphQL}`,
    `--auth.provider ${result.security}`,
    `-c "${path.basename(configPath)}"`
  ];
  return args.join(' ');
}

function buildConfigCommand(configPath: string, setting: string, value: string): string {
  return `dab configure --${setting} ${value} -c "${path.basename(configPath)}"`;
}

export function deactivate() {}
