import * as vscode from 'vscode';
import { getTables } from './getTables';
import { getProcs } from './getProcs';
import { getViews } from './getViews';
import { generateSummary } from './summary';
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
      // Extract tables, procedures, and views from the configuration
      const tables = getTables(uri.fsPath);
      const procedures = getProcs(uri.fsPath);
      const views = getViews(uri.fsPath);

      // Get the file name without the path
      const fileName = path.basename(uri.fsPath);

      // Generate the Mermaid diagram with tables, procedures, and views
      const mermaidContent = `
## ${fileName}
<p>&nbsp;</p>

\`\`\`mermaid
${generateMermaidDiagram(tables, procedures, views)}
\`\`\`
      `.trim();

      // Generate the summary of tables, views, and stored procedures
      const summaryContent = generateSummary(uri.fsPath);

      // Combine the Mermaid diagram and the summary
      const fullContent = `${mermaidContent}\n\n${summaryContent}`;

      // Determine the output path for the diagram with the same name as the selected file
      const outputDir = path.dirname(uri.fsPath);
      const fileNameWithoutExt = path.basename(uri.fsPath, path.extname(uri.fsPath));
      const outputFilePath = path.join(outputDir, `${fileNameWithoutExt}.md`);

      // Write the combined content to a Markdown file
      fs.writeFileSync(outputFilePath, fullContent);

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
