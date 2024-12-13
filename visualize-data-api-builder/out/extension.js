"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const getTables_1 = require("./getTables");
const getProcs_1 = require("./getProcs");
const getViews_1 = require("./getViews");
const summary_1 = require("./summary");
const generateMermaidDiagram_1 = require("./generateMermaidDiagram");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function activate(context) {
    const visualizeDabCommand = vscode.commands.registerCommand('dabExtension.visualizeDab', async (uri) => {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage('No file selected for visualization.');
            return;
        }
        try {
            // Extract tables, procedures, and views from the configuration
            const tables = (0, getTables_1.getTables)(uri.fsPath);
            const procedures = (0, getProcs_1.getProcs)(uri.fsPath);
            const views = (0, getViews_1.getViews)(uri.fsPath);
            // Get the file name without the path
            const fileName = path.basename(uri.fsPath);
            // Generate the Mermaid diagram with tables, procedures, and views
            const mermaidContent = `
## ${fileName}
<p>&nbsp;</p>

\`\`\`mermaid
${(0, generateMermaidDiagram_1.generateMermaidDiagram)(tables, procedures, views)}
\`\`\`
      `.trim();
            // Generate the summary of tables, views, and stored procedures
            const summaryContent = (0, summary_1.generateSummary)(uri.fsPath);
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to visualize DAB: ${error.message}`);
        }
    });
    context.subscriptions.push(visualizeDabCommand);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map