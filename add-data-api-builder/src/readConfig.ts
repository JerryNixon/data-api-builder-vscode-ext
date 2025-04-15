import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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
 * Gets a set of defined many-to-many relationships using linking objects.
 * Format: `${source}->${target}->${linkingObject}`
 */
export async function getExistingManyToManyRelationships(configPath: string): Promise<Set<string>> {
    const fs = require('fs');
    const result = new Set<string>();

    if (!fs.existsSync(configPath)) { return result; }

    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        const entities = config.entities || {};

        for (const [entityName, definition] of Object.entries<any>(entities)) {
            const relationships = definition.relationships || {};
            for (const relName in relationships) {
                const rel = relationships[relName];
                if (rel.cardinality === "many" && rel["linking.object"]) {
                    const key = `${entityName}->${rel["target.entity"]}->${rel["linking.object"]}`;
                    result.add(key.toLowerCase());
                }
            }
        }

        return result;
    } catch {
        return result;
    }
}

/**
 * Retrieves a map of fully-qualified table object names (e.g. "dbo.actor")
 * to their configured entity aliases in the DAB configuration file.
 * Only includes entities of type "table".
 * @param configPath - Path to the DAB configuration file.
 * @returns A map where keys are "schema.table" and values are the alias (entity name).
 */
export async function getTableAliasMap(configPath: string): Promise<Map<string, string>> {
    const aliasMap = new Map<string, string>();

    if (!fs.existsSync(configPath)) { return aliasMap; }

    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        const entities = config.entities || {};

        for (const [alias, definition] of Object.entries<any>(entities)) {
            if (definition.source?.type === "table" && definition.source?.object) {
                const object = definition.source.object.toLowerCase(); // e.g., "dbo.actor"
                aliasMap.set(object, alias); // map "dbo.actor" → "Actor"
            }
        }

        return aliasMap;
    } catch {
        return aliasMap;
    }
}

/**
 * Retrieves the list of entities that are already defined in the DAB configuration file.
 * @param configPath The path to the DAB configuration file.
 * @returns A list of entities in the format "schema.table".
 */
export async function getExistingEntities(configPath: string): Promise<string[]> {
    const fs = require('fs');
    
    if (!fs.existsSync(configPath)) {
        return [];
    }

    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        if (!config || !config.entities) {
            return [];
        }

        return Object.keys(config.entities).map(entity => {
            const schema = config.entities[entity].source.schema || 'dbo';
            return `${schema}.${config.entities[entity].source.object}`;
        });
    } catch (error) {
        console.error('Error reading DAB configuration:', error);
        return [];
    }
}

/**
 * Checks if a stored procedure already exists in the configuration file.
 * @param configPath - The path to the configuration file.
 * @param procedureName - The name of the stored procedure (e.g., 'dbo.SampleProcedure').
 * @returns True if the stored procedure exists, false otherwise.
 */
export async function isProcedureInConfig(configPath: string, procedureName: string): Promise<boolean> {
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);

        const entities = config['entities'] || {};
        return Object.values(entities).some(
            (entity: any) => entity.source?.object === procedureName
        );
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Error reading configuration file: ${error.message}`);
        } else {
            vscode.window.showErrorMessage(`An unknown error occurred.`);
        }
        return false;
    }
}

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
