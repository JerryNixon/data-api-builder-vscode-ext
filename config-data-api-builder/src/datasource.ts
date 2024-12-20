import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getPanel } from './panel';

export function showDataSourceEditor(context: vscode.ExtensionContext, uri: vscode.Uri) {
  const panel = getPanel(context, 'editDataSource', 'Edit DAB Data Source', path.join(context.extensionPath, 'resources'));

  // Load the HTML content from datasource.html
  const htmlPath = path.join(context.extensionPath, 'resources', 'datasource.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Set the panel's webview HTML content
  panel.webview.html = htmlContent;

  // Initial load
  loadDataSource(panel, uri);

  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case 'save':
          saveDataSource(uri, message.content);
          return;

        case 'load':
          loadDataSource(panel, uri);
          return;

        case 'reload':
          if (panel) {
            loadDataSource(panel, uri);
          } else {
            vscode.window.showErrorMessage('Panel is not available for reload.');
          }
          return;
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => {
    console.log('Panel was disposed');
  }, undefined, context.subscriptions);
}

function loadDataSource(panel: vscode.WebviewPanel, uri: vscode.Uri) {
  try {
    const configContent = fs.readFileSync(uri.fsPath, 'utf8');
    const config = JSON.parse(configContent);

    console.log('Full config:', config);
    console.log('data-source:', config['data-source']);
    console.log('runtime:', config['runtime']);

    const message = {
      command: 'load',
      config: config
    };

    panel.webview.postMessage(message);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to save the data-source and runtime config from the webview
function saveDataSource(uri: vscode.Uri, content: string) {
  try {
    const configContent = fs.readFileSync(uri.fsPath, 'utf8');
    const config = JSON.parse(configContent);
    const newData = JSON.parse(content);

    // Update the data-source and runtime sections
    config['data-source'] = newData['data-source'];
    config['runtime'] = newData['runtime'];

    // Write back the entire config
    fs.writeFileSync(uri.fsPath, JSON.stringify(config, null, 2), 'utf8');
    vscode.window.showInformationMessage('Data source and runtime configuration saved.');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
