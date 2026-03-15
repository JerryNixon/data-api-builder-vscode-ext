import * as vscode from 'vscode';
import * as path from 'path';
import { validateConfigPath } from 'dab-vscode-shared';
import { isDockerInstalled, isDockerRunning, dockerUp, dockerDown } from './docker';

function ensureDocker(): boolean {
  if (!isDockerInstalled()) {
    vscode.window.showErrorMessage('Docker CLI is not installed.');
    return false;
  }
  if (!isDockerRunning()) {
    vscode.window.showErrorMessage('Docker is not running. Please start Docker Desktop and try again.');
    return false;
  }
  return true;
}

export function activate(context: vscode.ExtensionContext) {
  const dockerUpCommand = vscode.commands.registerCommand(
    'dabExtension.dockerUp',
    async (uri: vscode.Uri) => {
      const configFilePath = uri.fsPath;

      if (!validateConfigPath(configFilePath)) {
        vscode.window.showErrorMessage('❌ Invalid DAB configuration file.');
        return;
      }

      if (!ensureDocker()) {
        return;
      }

      const folderPath = path.dirname(configFilePath);
      const fileName = path.basename(configFilePath);

      await dockerUp(folderPath, fileName);
    }
  );

  const dockerDownCommand = vscode.commands.registerCommand(
    'dabExtension.dockerDown',
    async (uri: vscode.Uri) => {
      const configFilePath = uri.fsPath;

      if (!validateConfigPath(configFilePath)) {
        vscode.window.showErrorMessage('❌ Invalid DAB configuration file.');
        return;
      }

      if (!ensureDocker()) {
        return;
      }

      const folderPath = path.dirname(configFilePath);
      const fileName = path.basename(configFilePath);

      await dockerDown(folderPath, fileName);
    }
  );

  context.subscriptions.push(dockerUpCommand, dockerDownCommand);
}

export function deactivate() {}
