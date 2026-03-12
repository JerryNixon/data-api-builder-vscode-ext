// src/readConfig.ts
import * as vscode from 'vscode';
import { readConfig as readConfigShared } from 'dab-vscode-shared';

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

interface EntityField {
    name: string;
    alias?: string;
    description?: string;
    'primary-key'?: boolean;
}

interface EntityRelationship {
    'target.entity': string;
    cardinality?: 'one' | 'many';
    'source.fields'?: string[];
    'target.fields'?: string[];
    'linking.object'?: string;
    'linking.source.fields'?: string[];
    'linking.target.fields'?: string[];
}

export interface EntityDefinition {
    restPath: string;
    source: EntitySource;
    fields?: EntityField[];
    mappings?: Record<string, string>;
    type?: 'table' | 'view' | 'stored-procedure';
    rest?: EntityRest; // entities.entity.rest
    runtimeRestPath?: string; // runtime.rest.path
    relationships?: Record<string, EntityRelationship>;
}

/**
 * Retrieves the entities from the configuration file.
 * @param configPath - The path to the configuration file.
 * @returns A record of entities with strong types, including source, mappings, type, and runtime rest path.
 */
export function getEntities(configPath: string): Record<string, EntityDefinition> {
    try {
        const config = readConfigShared(configPath);

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