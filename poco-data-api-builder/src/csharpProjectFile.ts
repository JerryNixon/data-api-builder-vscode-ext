import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function createProjectFile(context: vscode.ExtensionContext, genCsFolder: string): Promise<void> {
  copyTemplateFile(context, genCsFolder, 'Sample.csproj');
  copyTemplateFile(context, genCsFolder, 'Sample.sln');
}

function copyTemplateFile(context: vscode.ExtensionContext, targetFolder: string, fileName: string): void {
  const sourcePath = path.join(context.extensionPath, 'resources', fileName);
  const targetPath = path.join(targetFolder, fileName);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
  } else {
    vscode.window.showWarningMessage(`${fileName} template file not found.`);
  }
}
