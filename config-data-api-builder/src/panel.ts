import * as vscode from 'vscode';
import * as path from 'path';

let panelMap: Map<string, vscode.WebviewPanel> = new Map();

export function getPanel(
  context: vscode.ExtensionContext,
  panelId: string,
  title: string,
  resourcePath: string
): vscode.WebviewPanel {
  if (panelMap.has(panelId)) {
    const existingPanel = panelMap.get(panelId)!;
    existingPanel.reveal(vscode.ViewColumn.One);
    return existingPanel;
  }

  const newPanel = vscode.window.createWebviewPanel(
    panelId,
    title,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(resourcePath)],
    }
  );

  newPanel.onDidDispose(
    () => {
      panelMap.delete(panelId);
    },
    undefined,
    context.subscriptions
  );

  panelMap.set(panelId, newPanel);
  return newPanel;
}
