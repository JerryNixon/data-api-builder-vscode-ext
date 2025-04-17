import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface Relationship {
    cardinality: string;
    target: string;
    sourceFields: string[];
    targetFields: string[];
}

export interface EntityConfig {
    name: string;
    relationships?: Relationship[];
}

export function validateConfigPath(configPath: string): boolean {
    if (!fs.existsSync(configPath)) {
        vscode.window.showErrorMessage(`Configuration file not found at path: ${configPath}`);
        return false;
    }
    return true;
}

export async function getConfiguredEntities(configPath: string): Promise<Map<string, string>> {
    const aliasMap = new Map<string, string>();

    if (!fs.existsSync(configPath)) return aliasMap;

    try {
        const config = readConfig(configPath);
        for (const [alias, definition] of Object.entries<any>(config.entities || {})) {
            if (definition.source?.type === "table" && definition.source?.object) {
                aliasMap.set(definition.source.object.toLowerCase(), alias);
            }
        }
    } catch {}

    return aliasMap;
}

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
        vscode.window.showErrorMessage(error instanceof Error ? `Error retrieving connection string: ${error.message}` : 'An unknown error occurred.');
        return '';
    }
}

export async function getExistingEntities(configPath: string): Promise<string[]> {
    if (!fs.existsSync(configPath)) return [];

    try {
        const config = readConfig(configPath);
        return Object.keys(config.entities || {}).map(entity => {
            const schema = config.entities[entity].source.schema || 'dbo';
            return `${schema}.${config.entities[entity].source.object}`;
        });
    } catch (error) {
        console.error('Error reading DAB configuration:', error);
        return [];
    }
}

export async function getExistingManyToManyRelationships(configPath: string): Promise<Set<string>> {
    const result = new Set<string>();

    if (!fs.existsSync(configPath)) return result;

    try {
        const config = readConfig(configPath);
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
    } catch {}

    return result;
}

export async function getExistingRelationships(configPath: string): Promise<EntityConfig[]> {
    const result: EntityConfig[] = [];

    if (!fs.existsSync(configPath)) return result;

    try {
        const config = readConfig(configPath);
        for (const [name, def] of Object.entries<any>(config.entities || {})) {
            const relationships = def.relationships || {};
            const relList: Relationship[] = [];

            for (const rel of Object.values<any>(relationships)) {
                relList.push({
                    cardinality: rel.cardinality,
                    target: rel["target.entity"],
                    sourceFields: rel["relationship.fields"]?.split(':')[0].split(','),
                    targetFields: rel["relationship.fields"]?.split(':')[1].split(',')
                });
            }

            result.push({ name, relationships: relList });
        }
    } catch {}

    return result;
}

export async function getExistingOneToManyRelationships(configPath: string): Promise<EntityConfig[]> {
    const all = await getExistingRelationships(configPath);
    return all.filter(entity =>
        entity.relationships?.some(rel => rel.cardinality === 'one')
    );
}

export async function getTableAliasMap(configPath: string): Promise<Map<string, string>> {
    const aliasMap = new Map<string, string>();

    if (!fs.existsSync(configPath)) return aliasMap;

    try {
        const config = readConfig(configPath);
        for (const [alias, definition] of Object.entries<any>(config.entities || {})) {
            if (definition.source?.type === "table" && definition.source?.object) {
                const object = definition.source.object.toLowerCase();
                aliasMap.set(object, alias);
            }
        }
    } catch {}

    return aliasMap;
}

export async function isProcedureInConfig(configPath: string, procedureName: string): Promise<boolean> {
    try {
        const config = readConfig(configPath);
        const entities = config['entities'] || {};

        return Object.values(entities).some((entity: any) => entity.source?.object === procedureName);
    } catch (error) {
        vscode.window.showErrorMessage(error instanceof Error ? `Error reading configuration file: ${error.message}` : 'An unknown error occurred.');
        return false;
    }
}

export async function readDatabaseType(configPath: string): Promise<string> {
    try {
        const config = readConfig(configPath);
        return config['data-source']?.['database-type'] || '';
    } catch (error) {
        vscode.window.showErrorMessage(error instanceof Error ? `Error reading configuration file: ${error.message}` : 'An unknown error occurred.');
        return '';
    }
}

function readConfig(configPath: string): any {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
}

function extractEnvVarName(connectionString: string): string {
    const envVarMatch = connectionString.match(/@env\('(.+?)'\)/);
    return envVarMatch ? envVarMatch[1] : '';
}

function isLocalDbConnection(connectionString: string): boolean {
    return connectionString.toLowerCase().includes('(localdb)');
}

function readConnectionStringInConfig(configPath: string): string {
    try {
        const config = readConfig(configPath);
        return config['data-source']?.['connection-string'] || '';
    } catch {
        return '';
    }
}

function readConnectionStringInEnvFile(configPath: string, envVarName: string): string {
    const envFilePath = path.join(path.dirname(configPath), '.env');
    if (!fs.existsSync(envFilePath)) return '';

    try {
        const envContent = fs.readFileSync(envFilePath, 'utf8');
        const envLines = envContent.split('\n');

        for (const line of envLines) {
            const match = line.match(new RegExp(`^${envVarName}\s*=\s*"?(.+?)"?\s*$`));
            if (match) return match[1];
        }

        return '';
    } catch {
        return '';
    }
}

function readConnectionStringInEnvironment(envVarName: string): string {
    return process.env[envVarName] || '';
}
