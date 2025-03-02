import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { runCommand } from './runTerminal';

export function activate(context: vscode.ExtensionContext) {
  const initDabCommand = vscode.commands.registerCommand('dabExtension.initDab', async (uri: vscode.Uri) => {
    const folderPath = uri.fsPath;

    try {
      const defaultPreferences = [
        { label: 'Store secrets in an .env file', picked: true },
        { label: 'Generates dotnet tool manifest file', picked: true },
        { label: 'This configuration will be used in a Static Web App', picked: false },
      ];

      const userSelections = await vscode.window.showQuickPick(defaultPreferences, {
        canPickMany: true,
        placeHolder: 'Select the features to enable for initialization',
      });

      if (!userSelections) {
        vscode.window.showErrorMessage('Initialization process was cancelled.');
        return;
      }

      const selectedPreferences = userSelections.map(selection => selection.label);

      const isStaticWebApp = selectedPreferences.includes('This configuration will be used in a Static Web App');

      const initConfig = {
        path: isStaticWebApp
          ? path.join(folderPath, 'swa-db-connections', 'staticwebapp.database.config.json')
          : path.join(folderPath, 'dab-config.json'),
        folder: isStaticWebApp
          ? path.join(folderPath, 'swa-db-connections')
          : folderPath,
      };

      const configResult = await handleDabConfig(initConfig.folder, initConfig.path);
      if (!configResult.success) {
        vscode.window.showInformationMessage(configResult.message || 'Configuration file handling failed.');
        return;
      }

      const dbType = await selectDatabaseType();
      if (!dbType) {
        vscode.window.showErrorMessage('Database type selection was cancelled or invalid.');
        return;
      }

      const connectionString = await getConnectionString();
      if (!connectionString) {
        vscode.window.showErrorMessage('Connection string input was cancelled or invalid.');
        return;
      }

      if (selectedPreferences.includes('Store secrets in an .env file')) {
        try {
          writeEnvFile(initConfig.folder, connectionString);
          updateGitIgnore(initConfig.folder);
        } catch (error) {
          vscode.window.showWarningMessage('Failed to write .env or .gitignore file. Continuing...');
        }
      }

      if (selectedPreferences.includes('Generates dotnet tool manifest file')) {
        try {
          updateDotnetToolsConfig(folderPath);
        } catch (error) {
          vscode.window.showWarningMessage('Failed to create dotnet tools manifest. Continuing...');
        }
      }

      try {
        const isInstalled = checkDataApiBuilderInstallation();
        if (!isInstalled) {
          vscode.window.showInformationMessage('Installing Microsoft Data API Builder...');
          installDataApiBuilder();
        }

        runDabInit(
          initConfig.folder,
          dbType,
          selectedPreferences.includes('Store secrets in an .env file')
            ? `@env('my-connection-string')`
            : connectionString,
          initConfig.path
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to ensure Data API Builder is installed or to run dab init: ${(error as Error).message}`);
        return;
      }

      try {
        await delay(2000);
        await openDabConfig(initConfig.path);
      } catch (error) {
        // ignore error
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Unknown error occurred during initialization: ${(error as Error).message}`);
    }
  });

  context.subscriptions.push(initDabCommand);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleDabConfig(folderPath: string, configPath: string): Promise<{ success: boolean; message?: string }> {
  if (fs.existsSync(configPath)) {
    const overwriteOptions = [
      { label: 'Yes (Overwrite existing configuration file)', value: 'Yes' },
      { label: 'No (Keep existing configuration file)', value: 'No' },
    ];

    const overwriteSelection = await vscode.window.showQuickPick(
      overwriteOptions.map(option => option.label),
      { placeHolder: 'Configuration file exists. Overwrite it?' }
    );

    const overwrite = overwriteOptions.find(option => option.label === overwriteSelection)?.value;

    if (overwrite === 'No') {
      return { success: false, message: 'User chose to keep the existing configuration file.' };
    }

    if (overwrite !== 'Yes') {
      return { success: false, message: 'Operation cancelled by the user.' };
    }

    fs.unlinkSync(configPath);
  }

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  return { success: true };
}

function writeEnvFile(folderPath: string, connectionString: string): void {
  const envFilePath = path.join(folderPath, '.env');
  let envContent = `my-connection-string=${connectionString}\nASPNETCORE_URLS="http://localhost:5000;https://localhost:5001"`;

  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf-8');
    if (!envContent.includes('my-connection-string=')) {
      envContent += `\nmy-connection-string=${connectionString}`;
    }
    if (!envContent.includes('ASPNETCORE_URLS=')) {
      envContent += `\nASPNETCORE_URLS="http://localhost:5000;https://localhost:5001"`;
    }
  }

  fs.writeFileSync(envFilePath, envContent.trim() + '\n');
}

function updateGitIgnore(folderPath: string): void {
  const gitignorePath = path.join(folderPath, '.gitignore');
  const gitignoreContent = '.env\n';

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, gitignoreContent);
  } else {
    let currentContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (!currentContent.includes('.env')) {
      currentContent += '\n.env';
      fs.writeFileSync(gitignorePath, currentContent.trim() + '\n');
    }
  }
}

function updateDotnetToolsConfig(folderPath: string): void {
  const configDir = path.join(folderPath, '.config');
  const configPath = path.join(configDir, 'dotnet-tools.json');

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let configContent: any = { version: 1, isRoot: true, tools: {} };

  if (fs.existsSync(configPath)) {
    configContent = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  if (configContent.tools && configContent.tools['microsoft.dataapibuilder']) {
    return;
  }

  configContent.tools['microsoft.dataapibuilder'] = {
    version: '1.3.19',
    commands: ['dab'],
    rollForward: true,
  };

  fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2) + '\n');
}

async function selectDatabaseType(): Promise<string | undefined> {
  return 'mssql';
}

async function getConnectionString(): Promise<string | undefined> {
  const input = await vscode.window.showInputBox({ prompt: 'Enter your MSSQL connection string' });
  return input ? input.replace(/;User=/, ';User Id=') : undefined;
}

function checkDataApiBuilderInstallation(): boolean {
  try {
    const result = require('child_process').execSync('dab --version', { stdio: 'pipe' }).toString();
    return result.includes('Microsoft.DataApiBuilder');
  } catch {
    return false;
  }
}

function installDataApiBuilder(): void {
  require('child_process').execSync('dotnet tool install microsoft.dataapibuilder', { stdio: 'inherit' });
}

function runDabInit(folderPath: string, dbType: string, connectionString: string, configPath: string): void {
  const command = `cd "${folderPath}" && dab init --database-type ${dbType} --connection-string "${connectionString}" --host-mode development -c "${configPath}"`;
  runCommand(command);
}

async function openDabConfig(configPath: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument(configPath);
  await vscode.window.showTextDocument(document);
}

export function deactivate() {}