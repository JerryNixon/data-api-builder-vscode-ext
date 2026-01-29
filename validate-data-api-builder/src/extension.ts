import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { validateConfigPath } from 'dab-vscode-shared';

let outputChannel: vscode.LogOutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('DAB Validation', { log: true });
  
  const command = vscode.commands.registerCommand('dabExtension.validateDab', async (uri?: vscode.Uri) => {
    if (!uri) {
      vscode.window.showErrorMessage('No file selected.');
      return;
    }
    
    const configPath = uri.fsPath;
    
    if (!validateConfigPath(configPath)) {
      return;
    }

    const fileName = path.basename(configPath);
    const folderPath = path.dirname(configPath);
    
    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.info(`Validating: ${configPath}`);

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Validating ${fileName}...`,
      cancellable: false
    }, async () => {
      const dabCommand = `dab validate -c "${fileName}"`;
      
      cp.exec(dabCommand, { cwd: folderPath, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        const output = stdout + stderr;
        
        // Log each line
        for (const line of output.split(/\r?\n/)) {
          if (line.trim()) {
            outputChannel.info(line);
          }
        }

        // Check result
        const failed = error || output.toLowerCase().includes('config is invalid');
        
        if (failed) {
          outputChannel.error('Validation: FAILED');
          vscode.window.showErrorMessage(`Validation failed: ${fileName}`, 'View Output')
            .then(action => { if (action) { outputChannel.show(true); } });
        } else {
          outputChannel.info('Validation: PASSED');
          vscode.window.showInformationMessage(`${fileName} is valid!`);
        }
      });
    });
  });

  context.subscriptions.push(command, outputChannel);
}

export function deactivate(): void {
  outputChannel?.dispose();
}
