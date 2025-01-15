// src/readConfig.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface EntityRest {
    enabled: boolean;
    path: string;
    methods?: string[]; // Optional property to capture proc REST methods
}

interface EntitySource {
    object: string; // Database object name
    type: 'table' | 'view' | 'stored-procedure';
    'key-fields'?: string[];
    parameters?: Record<string, string>; // Proc parameters dictionary
}

export interface EntityDefinition {
    restPath: string;
    source: EntitySource;
    mappings?: Record<string, string>;
    type?: 'table' | 'view' | 'stored-procedure';
    rest?: EntityRest; // entities.entity.rest
    runtimeRestPath?: string; // runtime.rest.path
}

/**
 * Validates the configuration file path.
 * @param configPath - The path to the configuration file.
 * @returns True if valid, false otherwise.
 */
export function validateConfigPath(configPath: string): boolean {
    if (!fs.existsSync(configPath)) {
        vscode.window.showErrorMessage(`Configuration file not found at path: ${configPath}`);
        return false;
    }
    return true;
}

/**
 * Reads and parses the configuration file.
 * @param configPath - The path to the configuration file.
 * @returns The parsed configuration object or null if an error occurs.
 */
export function readConfig(configPath: string): Record<string, unknown> | null {
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configContent);
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
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
            const match = line.match(new RegExp(`^${envVarName}\s*=\s*"?(.+?)"?\s*$`));
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
 * Retrieves the connection string from the configuration file.
 * @param configPath - The path to the configuration file.
 * @returns The connection string as a string, or an empty string if not found or if LocalDB is detected.
 */
export async function getConnectionString(configPath: string): Promise<string> {
    try {
        const config = readConfig(configPath);
        if (!config) {
            return '';
        }

        let connectionString = (config['data-source'] as any)?.['connection-string'] || '';

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

        if (connectionString.toLowerCase().includes('(localdb)')) {
            vscode.window.showErrorMessage('The connection string is using LocalDB, which is not supported in JavaScript.');
            return '';
        }

        return connectionString;
    } catch (error) {
        vscode.window.showErrorMessage(`Error retrieving connection string: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return '';
    }
}

/**
 * Retrieves the entities from the configuration file.
 * @param configPath - The path to the configuration file.
 * @returns A record of entities with strong types, including source, mappings, type, and runtime rest path.
 */
export function getEntities(configPath: string): Record<string, EntityDefinition> {
    try {
        const config = readConfig(configPath);

        // Validate the presence and structure of entities
        if (config?.entities && typeof config.entities === 'object') {
            const runtimeRestPath = (config['runtime'] as any)?.['rest']?.['path'] || '';
            const entities: Record<string, EntityDefinition> = {};

            for (const [key, value] of Object.entries(config.entities)) {
                if (typeof value === 'object' && value !== null) {
                    const entity = value as EntityDefinition;

                    // Add type directly from source
                    entity.type = entity.source?.type;

                    // Include rest.path
                    entity.restPath = (value as any)?.rest?.path || '';

                    // Include runtime.rest.path
                    entity.runtimeRestPath = runtimeRestPath;

                    // Include parameters for stored-procedures
                    if (entity.type === 'stored-procedure') {
                        entity.source.parameters = (value as any)?.source?.parameters || {};
                    }

                    entities[key] = entity;
                }
            }

            return entities;
        }

        vscode.window.showWarningMessage(`No valid entities found in the configuration at ${configPath}`);
        return {};
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error retrieving entities from configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return {};
    }
}