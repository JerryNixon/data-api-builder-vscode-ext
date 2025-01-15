import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function createApiLogicCs(context: vscode.ExtensionContext, genCsFolder: string): Promise<void> {
  const sourceApiPath = path.join(context.extensionPath, 'resources', 'Api');
  const targetApiPath = path.join(genCsFolder, 'Api');

  try {
    // Check if the source directory exists
    if (!fs.existsSync(sourceApiPath)) {
      vscode.window.showWarningMessage('Api folder template not found.');
      return;
    }

    // Copy folder recursively
    await copyFolder(sourceApiPath, targetApiPath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to copy Api folder: ${errorMessage}`);
  }
}

// Helper function to copy a folder recursively
async function copyFolder(source: string, target: string): Promise<void> {
  await fs.promises.mkdir(target, { recursive: true });

  const entries = await fs.promises.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyFolder(sourcePath, targetPath); // Recursive copy for subdirectories
    } else {
      await fs.promises.copyFile(sourcePath, targetPath);
    }
  }
}
