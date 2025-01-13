import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function createProjectFile(context: vscode.ExtensionContext, genCsFolder: string): Promise<void> {
  const targetPath = path.join(genCsFolder, 'GenCs.csproj');
  const sourcePath = path.join(context.extensionPath, 'resources', 'gencs.csproj');

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
  } else {
    vscode.window.showWarningMessage('gencs.csproj template file not found.');
  }
}