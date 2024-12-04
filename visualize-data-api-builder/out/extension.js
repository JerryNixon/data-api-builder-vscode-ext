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
const generateMermaidDiagram_1 = require("./generateMermaidDiagram");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function activate(context) {
    const visualizeDabCommand = vscode.commands.registerCommand('dabVisualize.visualizeDab', async (uri) => {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage('No file selected for visualization.');
            return;
        }
        try {
            // Extract tables and relationships from the configuration
            const tables = (0, getTables_1.getTables)(uri.fsPath);
            // Generate the Mermaid diagram
            const mermaidContent = `
\`\`\`mermaid
${(0, generateMermaidDiagram_1.generateMermaidDiagram)(tables)}
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to visualize DAB: ${error.message}`);
        }
    });
    context.subscriptions.push(visualizeDabCommand);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map