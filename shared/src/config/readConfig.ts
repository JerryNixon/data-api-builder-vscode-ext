import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { DabConfig } from '../types';
import { extractEnvVarName } from './utils';

/**
 * Validates that a configuration file exists at the given path
 * 
 * @param configPath - Path to the DAB configuration file
 * @returns true if file exists, false otherwise
 */
export function validateConfigPath(configPath: string): boolean {
    if (!fs.existsSync(configPath)) {
        vscode.window.showErrorMessage(`Configuration file not found at path: ${configPath}`);
        return false;
    }
    return true;
}

/**
 * Reads and parses a DAB configuration file
 * 
 * @param configPath - Path to the DAB configuration file
 * @returns Parsed configuration object or null if reading/parsing fails
 */
export function readConfig(configPath: string): DabConfig | null {
    try {
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content) as DabConfig;
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error reading configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return null;
    }
}

/**
 * Retrieves the connection string from a DAB configuration file.
 * Resolves @env() references by checking .env file and process environment.
 * 
 * @param configPath - Path to the DAB configuration file
 * @returns Connection string or empty string if not found
 * 
 * @example
 * ```typescript
 * const connStr = await getConnectionString('./dab-config.json');
 * // Returns actual connection string, resolving @env('VAR_NAME') if needed
 * ```
 */
export async function getConnectionString(configPath: string): Promise<string> {
    try {
        const config = readConfig(configPath);
        if (!config) {
            return '';
        }

        let connectionString = config['data-source']?.['connection-string'] || '';

        if (connectionString.startsWith('@env(')) {
            const envVarName = extractEnvVarName(connectionString);
            if (!envVarName) {
                vscode.window.showErrorMessage('The connection string in the config file is empty.');
                return '';
            }

            connectionString = 
                readConnectionStringFromEnvFile(configPath, envVarName) || 
                readConnectionStringFromEnvironment(envVarName);
        }

        if (!connectionString) {
            vscode.window.showErrorMessage('The connection string could not be found.');
            return '';
        }

        if (isLocalDbConnection(connectionString)) {
            vscode.window.showErrorMessage(
                'LocalDB connections are not supported. Please use a standard SQL Server connection.'
            );
            return '';
        }

        return connectionString;
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error retrieving connection string: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return '';
    }
}

/**
 * Gets a map of database object names to their entity aliases
 * 
 * @param configPath - Path to the DAB configuration file
 * @returns Map of object names (lowercase) to entity aliases
 */
export async function getConfiguredEntities(configPath: string): Promise<Map<string, string>> {
    const aliasMap = new Map<string, string>();

    if (!fs.existsSync(configPath)) {
        return aliasMap;
    }

    try {
        const config = readConfig(configPath);
        if (!config) {
            return aliasMap;
        }

        for (const [alias, definition] of Object.entries(config.entities || {})) {
            if (definition.source?.type === 'table' && definition.source?.object) {
                aliasMap.set(definition.source.object.toLowerCase(), alias);
            }
        }
    } catch {}

    return aliasMap;
}

/**
 * Reads the database type from the configuration file
 * 
 * @param configPath - Path to the DAB configuration file
 * @returns Database type (e.g., 'mssql', 'postgresql') or empty string
 */
export async function readDatabaseType(configPath: string): Promise<string> {
    try {
        const config = readConfig(configPath);
        return config?.['data-source']?.['database-type'] || '';
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error reading database type: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return '';
    }
}

// Export utility function for external use
export { extractEnvVarName } from './utils';

// Private helper functions

function readConnectionStringFromEnvFile(configPath: string, envVarName: string): string {
    const envFilePath = path.join(path.dirname(configPath), '.env');
    if (!fs.existsSync(envFilePath)) {
        return '';
    }

    try {
        const envContent = fs.readFileSync(envFilePath, 'utf8');
        const envLines = envContent.split('\n');

        for (const line of envLines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }
            
            // Match: VAR_NAME="value" or VAR_NAME=value
            const quotedMatch = trimmedLine.match(new RegExp(`^${envVarName}\\s*=\\s*"(.+)"\\s*$`));
            if (quotedMatch) {
                return quotedMatch[1];
            }
            
            // Match unquoted value
            const unquotedMatch = trimmedLine.match(new RegExp(`^${envVarName}\\s*=\\s*(.+?)\\s*$`));
            if (unquotedMatch) {
                return unquotedMatch[1];
            }
        }

        return '';
    } catch {
        return '';
    }
}

function readConnectionStringFromEnvironment(envVarName: string): string {
    return process.env[envVarName] || '';
}

function isLocalDbConnection(connectionString: string): boolean {
    return connectionString.toLowerCase().includes('(localdb)');
}
