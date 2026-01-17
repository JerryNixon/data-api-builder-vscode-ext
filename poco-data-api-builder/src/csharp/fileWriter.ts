import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface WriteResult {
  success: boolean;
  path: string;
  error?: string;
}

function copyFolderRecursive(sourcePath: string, targetPath: string): WriteResult[] {
  const results: WriteResult[] = [];

  if (!fs.existsSync(sourcePath)) {
    return [{
      success: false,
      path: sourcePath,
      error: `Source folder not found: ${sourcePath}`
    }];
  }

  fs.mkdirSync(targetPath, { recursive: true });

  const files = fs.readdirSync(sourcePath);
  for (const file of files) {
    const sourceFile = path.join(sourcePath, file);
    const targetFile = path.join(targetPath, file);

    try {
      if (fs.statSync(sourceFile).isDirectory()) {
        results.push(...copyFolderRecursive(sourceFile, targetFile));
      } else {
        fs.copyFileSync(sourceFile, targetFile);
        results.push({ success: true, path: targetFile });
      }
    } catch (error) {
      results.push({
        success: false,
        path: targetFile,
        error: `Failed to copy: ${error}`
      });
    }
  }

  return results;
}

function copyFile(sourcePath: string, targetPath: string): WriteResult {
  try {
    const targetDir = path.dirname(targetPath);
    fs.mkdirSync(targetDir, { recursive: true });

    if (!fs.existsSync(sourcePath)) {
      return {
        success: false,
        path: targetPath,
        error: `Source file not found: ${sourcePath}`
      };
    }

    fs.copyFileSync(sourcePath, targetPath);
    return { success: true, path: targetPath };
  } catch (error) {
    return {
      success: false,
      path: targetPath,
      error: `Failed to copy: ${error}`
    };
  }
}

export function writeFile(filePath: string, content: string): WriteResult {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, path: filePath };
  } catch (error) {
    return {
      success: false,
      path: filePath,
      error: `Failed to write: ${error}`
    };
  }
}

export async function setupProjectStructure(
  context: vscode.ExtensionContext,
  genFolder: string,
  configFileName: string
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  const extensionPath = context.extensionPath;
  const csharpResources = path.join(extensionPath, 'resources', 'csharp');

  // Create folder structure
  const modelsFolder = path.join(genFolder, 'Models');
  const reposFolder = path.join(genFolder, 'Repositories');
  const restFolder = path.join(reposFolder, 'Rest');
  const clientFolder = path.join(genFolder, 'Client');
  const webFolder = path.join(genFolder, 'Web');
  const wwwrootFolder = path.join(webFolder, 'wwwroot');

  fs.mkdirSync(modelsFolder, { recursive: true });
  fs.mkdirSync(restFolder, { recursive: true });
  fs.mkdirSync(clientFolder, { recursive: true });
  fs.mkdirSync(wwwrootFolder, { recursive: true });

  // Copy Rest folder (static files)
  results.push(...copyFolderRecursive(path.join(csharpResources, 'Rest'), restFolder));

  // Copy project files
  results.push(copyFile(path.join(csharpResources, 'Models.csproj'), path.join(modelsFolder, 'Models.csproj')));
  results.push(copyFile(path.join(csharpResources, 'Repositories.csproj'), path.join(reposFolder, 'Repositories.csproj')));
  results.push(copyFile(path.join(csharpResources, 'Client.csproj'), path.join(clientFolder, 'Client.csproj')));
  results.push(copyFile(path.join(csharpResources, 'Web.csproj'), path.join(webFolder, 'Web.csproj')));

  // Copy GlobalUsings files
  results.push(copyFile(path.join(csharpResources, 'Models.GlobalUsings.cs'), path.join(modelsFolder, 'GlobalUsings.cs')));
  results.push(copyFile(path.join(csharpResources, 'Repositories.GlobalUsings.cs'), path.join(reposFolder, 'GlobalUsings.cs')));

  // Copy Web static files (wwwroot)
  const webWwwrootSource = path.join(csharpResources, 'Web', 'wwwroot');
  if (fs.existsSync(webWwwrootSource)) {
    results.push(...copyFolderRecursive(webWwwrootSource, wwwrootFolder));
  }

  // Copy .vscode folder (launch.json, settings.json, tasks.json) to parent of Gen folder
  const vscodeSource = path.join(csharpResources, '.vscode');
  if (fs.existsSync(vscodeSource)) {
    const vscodeTarget = path.join(genFolder, '..', '.vscode');
    results.push(...copyFolderRecursive(vscodeSource, vscodeTarget));
  }

  return results;
}
