import * as vscode from 'vscode';
import { getTables } from './getTables';
import { generateMermaidDiagram } from './generateMermaidDiagram';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  const visualizeDabCommand = vscode.commands.registerCommand('dabExtension.visualizeDab', async (uri: vscode.Uri) => {
    if (!uri || !uri.fsPath) {
      vscode.window.showErrorMessage('No file selected for visualization.');
      return;
    }

    try {
      // Extract tables and relationships from the configuration
      const tables = getTables(uri.fsPath);

      // Generate the Mermaid diagram
      const mermaidContent = `
\`\`\`mermaid
${generateMermaidDiagram(tables)}
\`\`\`
      `.trim();

      // Determine the output path for the diagram
      const outputDir = path.dirname(uri.fsPath);
      const outputFilePath = path.join(outputDir, 'dab-diagram.md');

      // Write the diagram to a Markdown file
      fs.writeFileSync(outputFilePath, mermaidContent);

      // Open the file in VS Code
      const doc = await vscode.workspace.openTextDocument(outputFilePath);
      await vscode.window.showTextDocument(doc);

      // Preview the diagram
      await vscode.commands.executeCommand('markdown.showPreview', doc.uri);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to visualize DAB: ${(error as Error).message}`);
    }
  });

  context.subscriptions.push(visualizeDabCommand);
}

export function deactivate() {}
