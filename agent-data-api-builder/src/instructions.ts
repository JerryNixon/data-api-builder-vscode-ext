import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Default agent instructions if no external files are found
 */
const DEFAULT_INSTRUCTIONS = `
# DAB Developer Agent

You are an expert in Data API Builder (DAB), helping developers create REST, GraphQL, and MCP APIs from databases.

## Core Capabilities
- Generate dab-config.json files
- Add tables, views, and stored procedures as entities
- Configure permissions and authentication
- Set up relationships between entities
- Enable MCP for AI tool integration
- Troubleshoot connection and configuration issues

## Best Practices
- Always use @env('VAR_NAME') for connection strings
- Use descriptive entity names that differ from source object names
- Apply least-privilege permissions
- Validate configuration before deployment
- Use development host mode for local testing
`;

/**
 * Get agent instructions from bundled markdown files or workspace
 */
export async function getAgentInstructions(context: vscode.ExtensionContext): Promise<string> {
  const instructions: string[] = [];

  // Try to load from extension resources
  const extensionPath = context.extensionPath;
  const agentPath = path.join(extensionPath, 'agents', 'dab-developer.md');
  
  if (fs.existsSync(agentPath)) {
    try {
      const mainInstructions = fs.readFileSync(agentPath, 'utf-8');
      instructions.push(mainInstructions);

      // Load sub-instructions
      const subDir = path.join(extensionPath, 'agents', 'dab-developer');
      if (fs.existsSync(subDir)) {
        const files = fs.readdirSync(subDir).filter(f => f.endsWith('.md')).sort();
        for (const file of files) {
          const content = fs.readFileSync(path.join(subDir, file), 'utf-8');
          instructions.push(`\n\n---\n\n# ${file.replace('.md', '')}\n\n${content}`);
        }
      }
    } catch (error) {
      console.error('Error loading agent instructions:', error);
    }
  }

  // Try to load from workspace
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && instructions.length === 0) {
    const workspacePath = workspaceFolders[0].uri.fsPath;
    const workspaceAgentPath = path.join(workspacePath, '.github', 'agents', 'dab-developer.md');
    
    if (fs.existsSync(workspaceAgentPath)) {
      try {
        const content = fs.readFileSync(workspaceAgentPath, 'utf-8');
        instructions.push(content);

        // Load sub-instructions from workspace
        const subDir = path.join(workspacePath, '.github', 'agents', 'dab-developer');
        if (fs.existsSync(subDir)) {
          const files = fs.readdirSync(subDir).filter(f => f.endsWith('.md')).sort();
          for (const file of files) {
            const content = fs.readFileSync(path.join(subDir, file), 'utf-8');
            instructions.push(`\n\n---\n\n# ${file.replace('.md', '')}\n\n${content}`);
          }
        }
      } catch (error) {
        console.error('Error loading workspace agent instructions:', error);
      }
    }
  }

  // Return loaded instructions or default
  return instructions.length > 0 ? instructions.join('\n') : DEFAULT_INSTRUCTIONS;
}

/**
 * Check if agent instructions exist in the workspace
 */
export function hasWorkspaceAgentInstructions(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) { return false; }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const agentPath = path.join(workspacePath, '.github', 'agents', 'dab-developer.md');
  
  return fs.existsSync(agentPath);
}

/**
 * Get the path to workspace agent instructions folder
 */
export function getWorkspaceAgentPath(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) { return undefined; }

  return path.join(workspaceFolders[0].uri.fsPath, '.github', 'agents');
}
