// src/promptManager.ts
import * as vscode from 'vscode';
import { EnvEntry, getConnections, addConnection } from './envManager';

export interface PromptResult {
    connection: EnvEntry | undefined;
    enableRest: boolean;
    enableGraphQL: boolean;
    enableCache: boolean;
    hostMode: 'development' | 'production';
    security: 'StaticWebApps' | 'Simulated';
}

// Ask the user for all necessary init options
export async function ask(folderPath: string): Promise<PromptResult> {
    const connection = await selectConnection(folderPath);
    if (!connection) {
        return {
            connection: undefined,
            enableRest: true,
            enableGraphQL: true,
            enableCache: true,
            hostMode: 'development',
            security: 'StaticWebApps'
        };
    }

    const enableRest = await askBoolean(
        'REST',
        'Enable REST endpoints',
        true
    );

    const enableGraphQL = await askBoolean(
        'GraphQL',
        'Enable GraphQL endpoints',
        true
    );

    const enableCache = await askBoolean(
        'Cache',
        'Enable Level 1 cache',
        true
    );

    const hostMode = await askHostMode();
    const security = await askSecurityProvider();

    return {
        connection,
        enableRest,
        enableGraphQL,
        enableCache,
        hostMode,
        security
    };
}

// Internal

async function selectConnection(folderPath: string): Promise<EnvEntry | undefined> {
    const existing = getConnections(folderPath);
    const options: { label: string; description: string; entry?: EnvEntry }[] = existing.map(e => ({
        label: `$(database) ${e.display || e.name}`,
        description: `(from .env) ${e.name}`,
        entry: e
    }));

    options.unshift({ label: '$(plus) Enter new connection string', description: '', entry: undefined });

    const picked = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select a connection string from .env or enter a new one'
    });

    if (!picked) { return undefined; }
    if (picked.entry) { return picked.entry; }

    const input = await vscode.window.showInputBox({ prompt: 'Enter a new MSSQL connection string' });
    if (!input) { return undefined; }

    return addConnection(folderPath, input);
}

async function askBoolean(label: string, description: string, defaultValue: boolean): Promise<boolean> {
    const pick = await vscode.window.showQuickPick(
        [
            { label: 'Yes', description, value: true },
            { label: 'No', description: '', value: false }
        ],
        { placeHolder: label }
    );
    return pick?.value ?? defaultValue;
}

async function askHostMode(): Promise<'production' | 'development'> {
    const pick = await vscode.window.showQuickPick(
        [
            {
                label: 'Development',
                description: 'Enable Swagger and Nitro (Banana Cake Pop)',
                value: 'development'
            },
            {
                label: 'Production',
                description: '',
                value: 'production'
            }
        ],
        { placeHolder: 'Host mode' }
    );
    return (pick?.value ?? 'development') as 'production' | 'development';
}

async function askSecurityProvider(): Promise<'StaticWebApps' | 'Simulated'> {
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
        { placeHolder: 'Security Provider' }
    );
    return (pick?.value ?? 'StaticWebApps') as 'StaticWebApps' | 'Simulated';
}
