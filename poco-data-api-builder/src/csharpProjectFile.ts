import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function createProjectFile(context: vscode.ExtensionContext, genCsFolder: string): Promise<void> {
  copyTemplateFile(context, path.join(genCsFolder, 'Library'), 'Library.csproj');
  copyTemplateFile(context, path.join(genCsFolder, 'Client'), 'Client.csproj');
  copyTemplateFile(context, genCsFolder, 'Gen.sln');
}


function copyTemplateFile(context: vscode.ExtensionContext, targetFolder: string, fileName: string): void {
  const sourcePath = path.join(context.extensionPath, 'resources', fileName);
  const targetPath = path.join(targetFolder, fileName);

  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
  } else {
    vscode.window.showWarningMessage(`${fileName} template file not found.`);
  }
}
