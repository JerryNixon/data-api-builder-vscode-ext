import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Reads the database type from the configuration file.
 * @param configPath - The path to the configuration file.
 * @returns The database type as a string, or an empty string if not found.
 */
export async function readDatabaseType(configPath: string): Promise<string> {
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);

        return config['data-source']?.['database-type'] || '';
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Error reading configuration file: ${error.message}`);
        } else {
            vscode.window.showErrorMessage(`An unknown error occurred.`);
        }
        return '';
    }
}

/**
 * Retrieves the connection string from the configuration file, .env file, or environment variables.
 * @param configPath - The path to the configuration file.
 * @returns The connection string as a string, or an empty string if not found or if LocalDB is detected.
 */
export async function getConnectionString(configPath: string): Promise<string> {
    try {
        let connectionString = readConnectionStringInConfig(configPath);

        if (connectionString.startsWith('@env(')) {
            const envVarName = extractEnvVarName(connectionString);
            if (!envVarName) {
                vscode.window.showErrorMessage('The connection string in the config file is empty.');
                return '';
            }

            connectionString = readConnectionStringInEnvFile(configPath, envVarName) || readConnectionStringInEnvironment(envVarName);
        }

        if (!connectionString) {
            vscode.window.showErrorMessage('The connection string could not be found in the environment.');
            return '';
        }

        if (isLocalDbConnection(connectionString)) {
            vscode.window.showErrorMessage('The connection string is using LocalDB, which is not supported in JavaScript.');
            return '';
        }

        return connectionString;
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Error retrieving connection string: ${error.message}`);
        } else {
            vscode.window.showErrorMessage('An unknown error occurred.');
        }
        return '';
    }
}

/**
 * Reads the connection string directly from the configuration file.
 * @param configPath - The path to the configuration file.
 * @returns The connection string or an empty string if not found.
 */
function readConnectionStringInConfig(configPath: string): string {
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        return config['data-source']?.['connection-string'] || '';
    } catch {
        return '';
    }
}

/**
 * Reads the connection string from the .env file.
 * @param configPath - The path to the configuration file.
 * @param envVarName - The name of the environment variable.
 * @returns The connection string or an empty string if not found.
 */
function readConnectionStringInEnvFile(configPath: string, envVarName: string): string {
    const envFilePath = path.join(path.dirname(configPath), '.env');
    if (!fs.existsSync(envFilePath)) {
        return '';
    }

    try {
        const envContent = fs.readFileSync(envFilePath, 'utf8');
        const envLines = envContent.split('\n');
        for (const line of envLines) {
            const match = line.match(new RegExp(`^${envVarName}\\s*=\\s*"?(.+?)"?\\s*$`));
            if (match) {
                return match[1];
            }
        }
        return '';
    } catch {
        return '';
    }
}

/**
 * Reads the connection string from environment variables.
 * @param envVarName - The name of the environment variable.
 * @returns The connection string or an empty string if not found.
 */
function readConnectionStringInEnvironment(envVarName: string): string {
    return process.env[envVarName] || '';
}

/**
 * Extracts the environment variable name from the @env() syntax.
 * @param connectionString - The connection string containing the @env syntax.
 * @returns The environment variable name or an empty string if not found.
 */
function extractEnvVarName(connectionString: string): string {
    const envVarMatch = connectionString.match(/@env\('(.+?)'\)/);
    return envVarMatch ? envVarMatch[1] : '';
}

/**
 * Checks if the connection string is attempting to use LocalDB.
 * @param connectionString - The connection string to check.
 * @returns True if the connection string contains LocalDB, false otherwise.
 */
function isLocalDbConnection(connectionString: string): boolean {
    return connectionString.toLowerCase().includes('(localdb)');
}