import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  const initDabCommand = vscode.commands.registerCommand('dabExtension.initDab', async (uri: vscode.Uri) => {
    const folderPath = uri.fsPath;

    try {
      // Step 0: Prompt for Initialization Type
      const initType = await vscode.window.showQuickPick(
        [
          { label: 'Standard Initialization (dab-config.json)', value: 'dab-config.json' },
          { label: 'Static Web Apps (swa-db-connections/staticwebapp.database.config.json)', value: 'swa-db-connections/staticwebapp.database.config.json' }
        ].map(option => option.label),
        { placeHolder: 'Select the initialization type' }
      );

      if (!initType) {
        vscode.window.showErrorMessage('Initialization type selection was cancelled.');
        return;
      }

      const initConfig = {
        path: initType.includes('Static Web Apps')
          ? path.join(folderPath, 'swa-db-connections', 'staticwebapp.database.config.json')
          : path.join(folderPath, 'dab-config.json'),
        folder: initType.includes('Static Web Apps')
          ? path.join(folderPath, 'swa-db-connections')
          : folderPath
      };

      // Step 1: Handle configuration file
      const configResult = await handleDabConfig(initConfig.folder, initConfig.path);
      if (!configResult.success) {
        vscode.window.showInformationMessage(configResult.message || 'Configuration file handling failed.');
        return; // Stop the process
      }

      // Step 2: Select database type
      const dbType = await selectDatabaseType();
      if (!dbType) {
        vscode.window.showErrorMessage('Database type selection was cancelled or invalid.');
        return;
      }

      // Step 3: Get connection string
      const connectionString = await getConnectionString();
      if (!connectionString) {
        vscode.window.showErrorMessage('Connection string input was cancelled or invalid.');
        return;
      }

      // Determine the appropriate folder for .env and .gitignore
      const envFolder = initType.includes('Static Web Apps')
        ? path.join(folderPath, 'swa-db-connections')
        : folderPath;

      // Step 4: Write the `.env` file
      try {
        writeEnvFile(envFolder, connectionString);
      } catch (error) {
        vscode.window.showWarningMessage('Failed to write .env file. Continuing...');
      }

      // Step 5: Update `.gitignore`
      try {
        updateGitIgnore(envFolder);
      } catch (error) {
        vscode.window.showWarningMessage('Failed to update .gitignore. Continuing...');
      }

      // Step 6: Create or update `.config/dotnet-tools.json`
      try {
        updateDotnetToolsConfig(folderPath);
      } catch (error) {
        // Allow continuation if this fails
      }

      // Step 7: Ensure `dataapibuilder` is installed and run `dab init` command
      try {
        const isInstalled = checkDataApiBuilderInstallation();
        if (!isInstalled) {
          vscode.window.showInformationMessage('Installing Microsoft Data API Builder...');
          installDataApiBuilder();
        }

        runDabInit(initConfig.folder, dbType, connectionString, initConfig.path);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to ensure Data API Builder is installed or to run dab init: ${(error as Error).message}`);
        return;
      }

      // Step 8: Open configuration file
      try {
        await openDabConfig(initConfig.path);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to open configuration file: ${(error as Error).message}`);
        return;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Unknown error occurred during initialization: ${(error as Error).message}`);
    }
  });

  context.subscriptions.push(initDabCommand);
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

async function selectDatabaseType(): Promise<string | undefined> {
  const dbTypeOptions = [
    { label: '--database-type mssql (SQL Server)', value: 'mssql' },
    { label: '--database-type cosmosdb_nosql (Azure Cosmos DB)', value: 'cosmosdb_nosql' },
    { label: '--database-type postgresql (PostgreSQL)', value: 'postgresql' },
    { label: '--database-type mysql (MySQL)', value: 'mysql' },
  ];

  const dbTypeSelection = await vscode.window.showQuickPick(
    dbTypeOptions.map(option => option.label),
    { placeHolder: 'Select your database type' }
  );

  return dbTypeOptions.find(option => option.label === dbTypeSelection)?.value;
}

async function getConnectionString(): Promise<string | undefined> {
  const input = await vscode.window.showInputBox({ prompt: 'Enter your connection string' });
  if (!input) {
    return undefined;
  }
  return input.replace(/;User=/, ';User Id=');
}

function writeEnvFile(folderPath: string, connectionString: string): void {
  const envFilePath = path.join(folderPath, '.env');
  let envContent = '';

  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf-8');

    if (envContent.includes('my-connection-string=')) {
      envContent = envContent.replace(/my-connection-string=.*/, `my-connection-string=${connectionString}`);
    } else {
      envContent += `\nmy-connection-string=${connectionString}`;
    }

    if (envContent.includes('ASPNETCORE_URLS=')) {
      envContent = envContent.replace(/ASPNETCORE_URLS=.*/, `ASPNETCORE_URLS="http://localhost:5000;https://localhost:5001"`);
    } else {
      envContent += `\nASPNETCORE_URLS="http://localhost:5000;https://localhost:5001"`;
    }
  } else {
    envContent = `my-connection-string=${connectionString}\nASPNETCORE_URLS="http://localhost:5000;https://localhost:5001"`;
  }

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  fs.writeFileSync(envFilePath, envContent.trim() + '\n');
}

function updateGitIgnore(folderPath: string): void {
  const gitignorePath = path.join(folderPath, '.gitignore');
  let gitignoreContent = '';

  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignoreContent.includes('.env')) {
      gitignoreContent += `\n.env`;
      fs.writeFileSync(gitignorePath, gitignoreContent.trim() + '\n');
    }
  } else {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    fs.writeFileSync(gitignorePath, '.env\n');
  }
}

function runDabInit(folderPath: string, dbType: string, connectionString: string, configPath: string): void {
  const terminal = vscode.window.createTerminal('DAB Init');
  terminal.show();
  terminal.sendText(`cd "${folderPath}"`);
  terminal.sendText(`dab init --database-type ${dbType} --connection-string "@env('my-connection-string')" --host-mode development -c "${configPath}"`);
}

async function openDabConfig(configPath: string): Promise<void> {
  const maxRetries = 10;
  const retryInterval = 500;
  let retries = 0;

  while (!fs.existsSync(configPath) && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, retryInterval));
    retries++;
  }

  if (fs.existsSync(configPath)) {
    const document = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(document);
    vscode.window.showInformationMessage('Data API Builder initialized and configuration file opened successfully!');
  } else {
    vscode.window.showErrorMessage('Failed to open configuration file: File was not created.');
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
    return; // Leave it alone if already exists
  }

  configContent.tools['microsoft.dataapibuilder'] = {
    version: '1.3.19',
    commands: ['dab'],
    rollForward: true,
  };

  fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2) + '\n');
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
  require('child_process').execSync('dotnet tool install microsoft.dataapibuilder', {
    stdio: 'inherit',
  });
}

export function deactivate() { }
