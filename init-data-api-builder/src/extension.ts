import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { runCommand, askForConnection } from 'dab-vscode-shared';
import { buildConfigCommand, buildInitCommand, resolveConfigPath, waitForFile } from './utils';

export function activate(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand('dabExtension.initDab', async (uri?: vscode.Uri) => {
    // Determine the target folder
    let folder: string;
    
    if (uri) {
      // Invoked from context menu - validate it's a directory
      folder = uri.fsPath;
      try {
        const stat = fs.statSync(folder);
        if (!stat.isDirectory()) {
          // If it's a file, use its parent directory
          folder = path.dirname(folder);
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Invalid path: ${folder}`);
        return;
      }
    } else {
      // Invoked from Command Palette - prompt for folder selection
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
        return;
      }
      
      if (folders.length === 1) {
        folder = folders[0].uri.fsPath;
      } else {
        const selected = await vscode.window.showWorkspaceFolderPick({
          placeHolder: 'Select a folder to initialize DAB configuration'
        });
        if (!selected) {
          return; // User cancelled
        }
        folder = selected.uri.fsPath;
      }
    }
    
    const configPath = resolveConfigPath(folder);

    let connection;
    try {
      connection = await askForConnection(folder);
      if (!connection) {
        vscode.window.showErrorMessage('No connection string selected.');
        return;
      }
    } catch (err) {
      vscode.window.showErrorMessage((err as Error).message);
      return;
    }

    try {
      // Create DAB config with all features enabled, development mode, standard security
      runCommand(buildInitCommand(configPath, connection.name, folder), { cwd: folder });
      runCommand(buildConfigCommand(configPath, 'runtime.rest.request-body-strict', 'false', folder), { cwd: folder });
      runCommand(buildConfigCommand(configPath, 'runtime.cache.enabled', 'true', folder), { cwd: folder });
      runCommand(buildConfigCommand(configPath, 'runtime.rest.enabled', 'true', folder), { cwd: folder });
      runCommand(buildConfigCommand(configPath, 'runtime.graphql.enabled', 'true', folder), { cwd: folder });
      runCommand(buildConfigCommand(configPath, 'runtime.mcp.enabled', 'true', folder), { cwd: folder });
      runCommand(buildConfigCommand(configPath, 'runtime.host.mode', 'development', folder), { cwd: folder });
      runCommand(buildConfigCommand(configPath, 'runtime.host.cors.origins', '"*"', folder), { cwd: folder });

      await new Promise(resolve => setTimeout(resolve, 2000));
      await openFile(configPath);

      // Show success message
      vscode.window.showInformationMessage(
        'DAB configuration created successfully! You can now add tables using the DAB CLI or other DAB extensions.'
      );
    } catch (err) {
      vscode.window.showErrorMessage((err as Error).message);
    }
  });

  context.subscriptions.push(cmd);
}

async function openFile(filePath: string): Promise<void> {
  await waitForFile(filePath, 3000);
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

export function deactivate() {}
