import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('dabExtension.editDataSource', async (uri: vscode.Uri) => {
    const configPath = uri.fsPath;

    if (!fs.existsSync(configPath)) {
      vscode.window.showErrorMessage('Configuration file not found.');
      return;
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    const panel = vscode.window.createWebviewPanel(
      'dabConfigEditor',
      'Edit DAB Data Source',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    let html = getWebviewContent(config['data-source']);

    panel.webview.html = html;

    panel.webview.onDidReceiveMessage(message => {
      if (message.command === 'save') {
        config['data-source'] = message.dataSource;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        vscode.window.showInformationMessage('DAB configuration saved.');
      }
    });
  });

  context.subscriptions.push(disposable);
}

/**
 * Generates the HTML content for the webview by injecting data source values.
 * @param dataSource - The data source object to populate in the HTML.
 * @returns The populated HTML string.
 */
function getWebviewContent(dataSource: any): string {
  const htmlPath = path.join(__dirname, '.', 'resources', 'data-source.html');
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Template file not found: ${htmlPath}`);
  }
  
  let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  // Replace placeholders with actual values
  htmlContent = htmlContent
    .replace('{{databaseType}}', dataSource['database-type'] || '')
    .replace('{{connectionString}}', dataSource['connection-string'] || '')
    .replace('{{options}}', JSON.stringify(dataSource.options || {}, null, 2));

  return htmlContent;
}

export function deactivate() {}
