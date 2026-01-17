import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { validateConfigPath } from 'dab-vscode-shared';

let outputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('DAB Validation');
  
  const validateDabCommand = vscode.commands.registerCommand('dabExtension.validateDab', async (uri: vscode.Uri) => {
    const configFilePath = uri.fsPath;
    
    if (!validateConfigPath(configFilePath)) {
      vscode.window.showErrorMessage('❌ Invalid DAB configuration file.');
      return;
    }

    const folderPath = path.dirname(configFilePath);
    const fileName = path.basename(configFilePath);

    outputChannel!.clear();
    outputChannel!.show(true);

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Validating ${fileName}...`,
      cancellable: false
    }, async () => {
      try {
        const result = await validateConfig(folderPath, fileName);
        
        if (result.success) {
          outputChannel!.appendLine('');
          outputChannel!.appendLine(`✅ Status: VALID`);
          vscode.window.showInformationMessage(`✅ ${fileName} is valid!`);
        } else {
          outputChannel!.appendLine('');
          outputChannel!.appendLine(`❌ Status: INVALID`);
          vscode.window.showErrorMessage(`❌ Validation failed for ${fileName}`);
        }
      } catch (error) {
        outputChannel!.appendLine('');
        outputChannel!.appendLine(`❌ Status: ERROR`);
        outputChannel!.appendLine(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        vscode.window.showErrorMessage(
          `❌ Error validating configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  });

  context.subscriptions.push(validateDabCommand, outputChannel);
}

interface ValidationResult {
  success: boolean;
  output: string;
}

async function validateConfig(cwd: string, configFile: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const command = `dab validate -c "${configFile}"`;
    
    cp.exec(command, { cwd }, (error, stdout, stderr) => {
      const output = stdout + stderr;
      
      // Show the full output
      outputChannel!.appendLine(output);

      // Check for success indicators
      const success = !error && (
        output.includes('is valid') ||
        output.includes('Successfully') ||
        output.includes('Validation succeeded') ||
        (!output.includes('Error') && !output.includes('Failed'))
      );

      resolve({ success, output });
    });
  });
}

export function deactivate() {
  outputChannel?.dispose();
}
