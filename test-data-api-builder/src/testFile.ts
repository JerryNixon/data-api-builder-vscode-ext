import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export function validateConfig(configPath: string): { dbType: string, connectionString: string } | null {

    // Step 1: Read dab-config.json
    if (!fs.existsSync(configPath)) {
        vscode.window.showErrorMessage(`Configuration file not found at ${configPath}`);
        return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    let connectionString = config["data-source"]?.["connection-string"] ?? null;
    const dbType = config["data-source"]?.["database-type"] ?? null;

    if (!dbType) {
        vscode.window.showErrorMessage('Database type not specified in dab-config.json.');
        return null;
    }

    // Step 2: Resolve environment variable if needed
    if (connectionString && connectionString.startsWith('@env')) {
        const envFilePath = path.join(path.dirname(configPath), '.env');
        if (!fs.existsSync(envFilePath)) {
            vscode.window.showErrorMessage('.env file not found.');
            return null;
        }

        dotenv.config({ path: envFilePath });
        const envVarName = connectionString.match(/@env\('(.*)'\)/)?.[1];
        connectionString = process.env[envVarName] ?? null;

        if (!connectionString) {
            vscode.window.showErrorMessage(
                `Environment variable '${envVarName}' referenced in dab-config.json is not defined in .env.`
            );
            return null;
        }
    }

    // Step 3: Final validation of connection string
    if (!connectionString) {
        vscode.window.showErrorMessage(
            'Connection string is missing from both dab-config.json and .env. Please ensure it is defined.'
        );
        return null;
    }

    if (connectionString.trim() === '') {
        vscode.window.showErrorMessage('Connection string is empty. Please provide a valid connection string.');
        return null;
    }

    return { dbType, connectionString };

}
