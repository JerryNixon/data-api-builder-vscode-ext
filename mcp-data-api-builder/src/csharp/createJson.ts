import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export async function createMcpJson(dotnetProjectPath: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) { return; }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const mcpFolder = findMcpFolder(workspaceRoot);
    if (!mcpFolder) { return; }

    const rootFolder = path.dirname(mcpFolder);
    const vscodeFolder = path.join(rootFolder, '.vscode');
    const mcpJsonPath = path.join(vscodeFolder, 'mcp.json');

    if (!fs.existsSync(vscodeFolder)) { fs.mkdirSync(vscodeFolder); }

    const newEntry = {
        servers: {
            'my-mcp-server': {
                type: 'stdio',
                command: 'dotnet',
                args: [
                    'run',
                    '--project',
                    dotnetProjectPath
                ]
            }
        }
    };

    let updatedJson: any = newEntry;

    if (fs.existsSync(mcpJsonPath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
            if (typeof existing !== 'object' || Array.isArray(existing)) { throw new Error(); }

            updatedJson = {
                servers: {
                    ...existing.servers,
                    'my-mcp-server': newEntry.servers['my-mcp-server']
                }
            };
        } catch {
            // Invalid JSON; overwrite below
        }
    }

    fs.writeFileSync(mcpJsonPath, JSON.stringify(updatedJson, null, 4));
}

function findMcpFolder(startPath: string): string | null {
    const stack = [startPath];
    while (stack.length > 0) {
        const dir = stack.pop()!;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'Mcp') { return fullPath; }
                stack.push(fullPath);
            }
        }
    }
    return null;
}
