import * as vscode from 'vscode';
import * as path from 'path';
import { validateConfigPath } from 'dab-vscode-shared';

export function activate(context: vscode.ExtensionContext) {
  const installMcpServerCommand = vscode.commands.registerCommand(
    'dabExtension.installMcpServer',
    async (uri: vscode.Uri) => {
      const configFilePath = uri.fsPath;
      
      if (!validateConfigPath(configFilePath)) {
        vscode.window.showErrorMessage('❌ Invalid DAB configuration file.');
        return;
      }
      
      const folderPath = path.dirname(configFilePath);
      const fileName = path.basename(configFilePath);
      
      // Generate server name from folder name
      const folderName = path.basename(folderPath);
      const serverName = folderName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
        .replace(/-+/g, '-')           // Replace multiple hyphens with single hyphen
        + '-mcp';
      
      // Get workspace folder for relative path
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      let configPath: string;
      
      if (workspaceFolder) {
        // Use workspace-relative path with ${workspaceFolder} variable
        const relativePath = path.relative(workspaceFolder.uri.fsPath, configFilePath);
        configPath = `\${workspaceFolder}/${relativePath.replace(/\\/g, '/')}`;
      } else {
        // Fall back to absolute path if not in a workspace
        configPath = configFilePath;
      }
      
      // Build MCP install payload for vscode:mcp/install URI.
      // The install URI expects a single server definition object with a top-level `name` field,
      // not the full mcp.json shape ({ servers: { ... }, inputs: [...] }).
      // See https://code.visualstudio.com/api/extension-guides/ai/mcp#create-an-mcp-installation-url
      const mcpInstallPayload = {
        name: serverName,
        type: 'stdio',
        command: 'dab',
        args: ['start', '--mcp-stdio', 'role:anonymous', '--LogLevel', 'none', '--config', configPath]
      };
      
      try {
        // Create vscode:mcp/install URL with encoded JSON
        const configJson = JSON.stringify(mcpInstallPayload);
        const encodedConfig = encodeURIComponent(configJson);
        const installUrl = `vscode:mcp/install?${encodedConfig}`;
        
        // Launch the URL to trigger VS Code's MCP install handler
        await vscode.env.openExternal(vscode.Uri.parse(installUrl));
      } catch (error) {
        vscode.window.showErrorMessage(
          `❌ Failed to install MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  context.subscriptions.push(installMcpServerCommand);
}

export function deactivate() {}
