import * as vscode from 'vscode';
import type { EnvEntry } from '../types';
import { getConnections, addConnection } from '../config';

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

/**
 * Prompts user with a yes/no question
 * 
 * @param label - Label for the quick pick
 * @param description - Description text
 * @param defaultValue - Default value if user cancels
 * @returns User's choice or default value
 */
export async function askBoolean(
    label: string, 
    description: string, 
    defaultValue: boolean
): Promise<boolean> {
    const pick = await vscode.window.showQuickPick(
        [
            { label: 'Yes', description, value: true },
            { label: 'No', description: '', value: false }
        ],
        { placeHolder: label }
    );
    
    return pick?.value ?? defaultValue;
}

/**
 * Prompts user to select host mode (development or production)
 * 
 * @returns Selected host mode
 */
export async function askHostMode(): Promise<'development' | 'production'> {
    const pick = await vscode.window.showQuickPick(
        [
            {
                label: 'Development',
                description: 'Enable Swagger and Nitro (Banana Cake Pop)',
                value: 'development'
            },
            {
                label: 'Production',
                description: 'Optimized for production use',
                value: 'production'
            }
        ],
        { placeHolder: 'Select host mode' }
    );
    
    return (pick?.value ?? 'development') as 'development' | 'production';
}

/**
 * Prompts user to select security provider
 * 
 * @returns Selected security provider
 */
export async function askSecurityProvider(): Promise<'StaticWebApps' | 'Simulated'> {
    const pick = await vscode.window.showQuickPick(
        [
            {
                label: 'Standard',
                description: 'JWT required for authenticated role',
                value: 'StaticWebApps'
            },
            {
                label: 'Simulated',
                description: 'Every call is treated as authenticated',
                value: 'Simulated'
            }
        ],
        { placeHolder: 'Select security provider' }
    );
    
    return (pick?.value ?? 'StaticWebApps') as 'StaticWebApps' | 'Simulated';
}
