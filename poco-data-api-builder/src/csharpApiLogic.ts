import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function createApiLogicCs(context: vscode.ExtensionContext, genCsFolder: string): Promise<void> {
  const logicFilePath = path.join(genCsFolder, 'Api.Logic.cs');
  const sourceLogicPath = path.join(context.extensionPath, 'resources', 'api.logic.cs');

  if (fs.existsSync(sourceLogicPath)) {
    fs.copyFileSync(sourceLogicPath, logicFilePath);
  } else {
    vscode.window.showWarningMessage('Logic.cs template file not found.');
  }
}