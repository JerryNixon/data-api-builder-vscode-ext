import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  const initDabCommand = vscode.commands.registerCommand('dabExtension.initDab', async (uri: vscode.Uri) => {
    const folderPath = uri.fsPath;

    // Step 1: Check for existing `dab-config.json`
    const configPath = path.join(folderPath, 'dab-config.json');
    if (fs.existsSync(configPath)) {
      const overwriteOptions = [
        { label: 'Yes (Overwrite existing dab-config.json)', value: 'Yes' },
        { label: 'No (Keep existing dab-config.json)', value: 'No' },
      ];

      const overwriteSelection = await vscode.window.showQuickPick(
        overwriteOptions.map(option => option.label),
        { placeHolder: 'dab-config.json exists. Overwrite it?' }
      );

      const overwrite = overwriteOptions.find(option => option.label === overwriteSelection)?.value;
      if (overwrite !== 'Yes') return;

      fs.unlinkSync(configPath);
    }

    // Step 2: Prompt for database type
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

    if (!dbTypeSelection) return;

    // Extract the corresponding key
    const dbType = dbTypeOptions.find(option => option.label === dbTypeSelection)?.value;
    if (!dbType) return;

    // Step 3: Prompt for connection string
    const connectionString = await vscode.window.showInputBox({ prompt: 'Enter your connection string' });
    if (!connectionString) return;

    // Step 4: Write the `.env` file
    const envFilePath = path.join(folderPath, '.env');
    let envContent = '';
    if (fs.existsSync(envFilePath)) {
      envContent = fs.readFileSync(envFilePath, 'utf-8');
      if (envContent.includes('my-connection-string=')) {
        envContent = envContent.replace(/my-connection-string=.*/, `my-connection-string=${connectionString}`);
      } else {
        envContent += `\nmy-connection-string=${connectionString}`;
      }
    } else {
      envContent = `my-connection-string=${connectionString}`;
    }
    fs.writeFileSync(envFilePath, envContent.trim() + '\n');

    // Step 5: Update `.gitignore` to include `.env`
    const gitignorePath = path.join(folderPath, '.gitignore');
    let gitignoreContent = '';
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignoreContent.includes('.env')) {
        gitignoreContent += `\n.env`;
        fs.writeFileSync(gitignorePath, gitignoreContent.trim() + '\n');
      }
    } else {
      fs.writeFileSync(gitignorePath, '.env\n');
    }

    // Step 6: Run the `dab init` command in the terminal
    const terminal = vscode.window.createTerminal('DAB Init');
    terminal.show();
    terminal.sendText(`cd "${folderPath}"`);
    terminal.sendText(`dab init --database-type ${dbType} --connection-string "@env('my-connection-string')" --host-mode development`);

    // Step 7: Wait for the `dab-config.json` to be created and open it
    try {
      const maxRetries = 10; // Number of times to check if the file exists
      const retryInterval = 500; // Time (in ms) between retries
      let retries = 0;

      while (!fs.existsSync(configPath) && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryInterval)); // Wait
        retries++;
      }

      if (fs.existsSync(configPath)) {
        const document = await vscode.workspace.openTextDocument(configPath); // Open the file
        await vscode.window.showTextDocument(document); // Show it in the editor
        vscode.window.showInformationMessage('Data API Builder initialized and dab-config.json opened successfully!');
      } else {
        vscode.window.showErrorMessage('Failed to open dab-config.json: File was not created.');
      }
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Failed to open dab-config.json: ${error.message}`);
      } else {
        vscode.window.showErrorMessage('Failed to open dab-config.json due to an unknown error.');
      }
    }

  });

  context.subscriptions.push(initDabCommand);
}

export function deactivate() { }
