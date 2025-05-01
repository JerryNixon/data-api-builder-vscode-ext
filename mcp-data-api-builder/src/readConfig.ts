import * as fs from 'fs';
import * as path from 'path';
import {
    normalizeObjectName
} from './helpers';
import {
    EntityDefinition,
    EntitySource,
    FieldMapping,
    Relationship,
    RestInfo
} from './types';

/**
 * Validates that the config file exists at the given path.
 */
export function validateConfigPath(configPath: string): boolean {
    return fs.existsSync(configPath);
}

/**
 * Reads and parses the DAB config JSON file.
 */
export function readConfig(configPath: string): any | null {
    try {
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/**
 * Resolves the SQL connection string from config, .env, or process.env.
 */
export async function getConnectionString(configPath: string): Promise<string> {
    const config = readConfig(configPath);
    if (!config) return '';

    const connRaw = config['data-source']?.['connection-string'] || '';
    if (connRaw.startsWith('@env(')) {
        const varName = extractEnvVarName(connRaw);
        return readFromEnvFile(configPath, varName) || process.env[varName] || '';
    }

    return connRaw;
}

/**
 * Parses the config file and returns all valid entity definitions.
 */
export function getEntities(configPath: string): Record<string, EntityDefinition> {
    const config = readConfig(configPath);
    if (!config?.entities || typeof config.entities !== 'object') return {};

    const runtimeRestPath = config['runtime']?.['rest']?.['path'] || '/api';
    const result: Record<string, EntityDefinition> = {};

    for (const [alias, raw] of Object.entries<any>(config.entities)) {
        const entity = buildEntityDefinition(alias, raw, runtimeRestPath);
        if (entity) result[alias] = entity;
    }

    return result;
}

/**
 * Builds a single EntityDefinition from config with normalized structure.
 */
function buildEntityDefinition(alias: string, raw: any, runtimeRestPath: string): EntityDefinition | null {
    const source = raw?.source;
    if (!source?.type || !source?.object) return null;

    const normalized = normalizeObjectName(source.object);
    const keyFields: string[] = source['key-fields'] || [];
    const restPath = raw.rest?.path || alias;

    return {
        source: {
            object: source.object,
            type: source.type,
            'key-fields': keyFields,
            parameters: source.type === 'stored-procedure' ? source.parameters || {} : undefined,
            normalizedObjectName: normalized
        },
        restPath,
        runtimeRestPath,
        rest: {
            path: restPath,
            methods: raw.rest?.methods,
            enabled: raw.rest?.enabled
            // pathComplete will be added later after key discovery
        },
        mappings: parseFieldMappings(raw.mappings),
        relationships: parseRelationships(raw.relationships)
    };
}

/**
 * Converts a plain mapping object into an array of FieldMapping records.
 */
function parseFieldMappings(mappingsObj: Record<string, unknown> | undefined): FieldMapping[] | undefined {
    if (!mappingsObj || typeof mappingsObj !== 'object') return undefined;

    const result: FieldMapping[] = [];

    for (const [name, alias] of Object.entries(mappingsObj)) {
        if (typeof name === 'string' && typeof alias === 'string') {
            result.push({ name, alias });
        }
    }

    return result.length > 0 ? result : undefined;
}

/**
 * Normalizes raw relationship data into a typed Relationship[] array.
 */
function parseRelationships(rawRels: any): Relationship[] {
    if (!rawRels || typeof rawRels !== 'object') return [];

    return Object.values<any>(rawRels).map(rel => {
        const isManyToMany = !!rel['linking.object'];
        const cardinality = isManyToMany ? 'many-to-many' : rel['cardinality'];

        return {
            targetEntity: rel['target.entity'],
            sourceFields: rel['source.fields'] || [],
            targetFields: rel['target.fields'] || [],
            cardinality,
            linkingObject: rel['linking.object'],
            linkingSourceFields: rel['linking.source.fields'] || [],
            linkingTargetFields: rel['linking.target.fields'] || []
        };
    });
}

/**
 * Extracts a variable name from @env('VAR') syntax.
 */
function extractEnvVarName(text: string): string {
    const match = text.match(/@env\('(.+?)'\)/);
    return match?.[1] || '';
}

/**
 * Reads a value from .env or falls back to process.env.
 */
function readFromEnvFile(configPath: string, varName: string): string {
    const envPath = path.join(path.dirname(configPath), '.env');
    if (!fs.existsSync(envPath)) return process.env[varName] || '';

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const match = line.match(new RegExp(`^${varName}\\s*=\\s*"?(.+?)"?$`));
        if (match) return match[1];
    }

    return process.env[varName] || '';
}
  