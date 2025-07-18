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

    let result: PromptResult;
    try {
      // PROMPTS FIRST
      result = await ask(folder);

      if (!result.connection) {
        vscode.window.showErrorMessage('No connection string selected.');
        return;
      }
    } catch (err) {
      vscode.window.showErrorMessage((err as Error).message);
      return;
    }

    // OPERATIONS AFTER
    const { connection, enableCache } = result;

    try {
      run(buildInitCommand(folder, configPath, connection.name, result));
      run(buildConfigCommand(folder, configPath, 'runtime.rest.request-body-strict', 'false'));

      if (enableCache) {
        run(buildConfigCommand(folder, configPath, 'runtime.cache.enabled', 'true'));
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      await openFile(configPath);

      // call DAB Add/Table command
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

function buildInitCommand(folder: string, configPath: string, envKey: string, result: PromptResult): string {
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
  return `cd "${folder}" && ${args.join(' ')}`;
}

function buildConfigCommand(folder: string, configPath: string, setting: string, value: string): string {
  return `cd "${folder}" && dab configure --${setting} ${value} -c "${path.basename(configPath)}"`;
}

export function deactivate() {}
