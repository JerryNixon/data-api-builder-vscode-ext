import * as fs from 'fs';
import * as vscode from 'vscode';
import { readConfig } from 'dab-vscode-shared';
import { showErrorMessageWithTimeout } from './utils/messageTimeout';

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

export async function getExistingManyToManyRelationships(configPath: string): Promise<Set<string>> {
    const result = new Set<string>();

    if (!fs.existsSync(configPath)) {
        return result;
    }

    try {
        const config = readConfig(configPath);
        if (!config) {
            return result;
        }
        
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

    if (!fs.existsSync(configPath)) {
        return result;
    }

    try {
        const config = readConfig(configPath);
        if (!config) {
            return result;
        }
        
        for (const [name, def] of Object.entries<any>(config.entities || {})) {
            const relationships = def.relationships || {};
            const relList: Relationship[] = [];

            for (const rel of Object.values<any>(relationships)) {
                relList.push({
                    cardinality: rel.cardinality,
                    target: rel["target.entity"],
                    sourceFields: rel["source.fields"] || [],
                    targetFields: rel["target.fields"] || []
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

    if (!fs.existsSync(configPath)) {
        return aliasMap;
    }

    try {
        const config = readConfig(configPath);
        if (!config) {
            return aliasMap;
        }
        
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
        if (!config) {
            return false;
        }
        
        const entities = config['entities'] || {};

        return Object.values(entities).some((entity: any) => entity.source?.object === procedureName);
    } catch (error) {
        await showErrorMessageWithTimeout(error instanceof Error ? `Error reading configuration file: ${error.message}` : 'An unknown error occurred.');
        return false;
    }
}

export async function readDatabaseType(configPath: string): Promise<string> {
    try {
        const config = readConfig(configPath);
        if (!config) {
            return '';
        }
        
        return config['data-source']?.['database-type'] || '';
    } catch (error) {
        await showErrorMessageWithTimeout(error instanceof Error ? `Error reading configuration file: ${error.message}` : 'An unknown error occurred.');
        return '';
    }
}