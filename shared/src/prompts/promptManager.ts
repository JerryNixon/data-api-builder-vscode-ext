import * as vscode from 'vscode';
import type { EnvEntry } from '../types';
import { getConnections, addConnection } from '../config';

/**
 * Result of the simplified init configuration prompt flow
 * Only connection string is prompted for - all other settings use defaults
 */
export interface PromptResult {
    connection: EnvEntry | undefined;
}

/**
 * Prompts user to select or enter a connection string.
 * If connections exist in .env, shows a picker. Otherwise asks for new connection.
 * 
 * @param folderPath - Path to the folder containing .env file
 * @returns Selected or newly created EnvEntry, or undefined if cancelled
 */
export async function askForConnection(folderPath: string): Promise<EnvEntry | undefined> {
    const existingConnections = getConnections(folderPath);

    if (existingConnections.length === 0) {
        const input = await vscode.window.showInputBox({ 
            prompt: 'Enter a new MSSQL connection string',
            placeHolder: 'Server=localhost;Database=mydb;...'
        });
        return input ? addConnection(folderPath, input) : undefined;
    }

    const options: Array<{ label: string; description: string; entry?: EnvEntry }> = 
        existingConnections.map(e => ({
            label: `$(database) ${e.display || e.name}`,
            description: `(from .env) ${e.name}`,
            entry: e
        }));

    options.unshift({ 
        label: '$(plus) Enter new connection string', 
        description: '', 
        entry: undefined 
    });

    const picked = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select a connection string from .env or enter a new one'
    });

    if (!picked) {
        return undefined;
    }
    
    if (picked.entry) {
        return picked.entry;
    }

    const input = await vscode.window.showInputBox({ 
        prompt: 'Enter a new MSSQL connection string',
        placeHolder: 'Server=localhost;Database=mydb;...'
    });
    
    return input ? addConnection(folderPath, input) : undefined;
}

