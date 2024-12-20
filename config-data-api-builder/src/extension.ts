import * as vscode from 'vscode';
import { showDataSourceEditor } from './datasource';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    'dabExtension.editDataSource',
    (uri: vscode.Uri) => {
      showDataSourceEditor(context, uri);
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
