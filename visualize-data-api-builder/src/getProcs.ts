import * as fs from 'fs';

interface Config {
    entities: Record<string, EntityDefinition>;
}

interface EntityDefinition {
    source: {
        object: string; // The schema-qualified name (e.g., "dbo.SampleProcedure")
        type: string;
        parameters?: Array<{
            name: string;
            required?: boolean;
            default?: string;
        }>;
    };
    fields?: Array<{
        name: string;
        alias?: string;
    }>;
}

/**
 * Represents a stored procedure with its schema-qualified source name and cleansed entity name.
 */
export interface StoredProcedureEntity {
    name: string;       // The cleansed entity name
    sourceName: string; // The schema-qualified source name
    parameters: Array<{ name: string; required: boolean; default?: string }>;
    fields: Array<{ name: string }>;
}

/**
 * Extracts stored procedure entities from the DAB configuration file.
 * 
 * NOTE: This function reads from CONFIG files, not database metadata.
 * It is different from shared-database's getProcs() which queries actual database procedures.
 * 
 * @param configPath - The path to the configuration file.
 * @returns An array of StoredProcedureEntity objects from the config.
 */
export function getProcs(configPath: string): StoredProcedureEntity[] {
    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);

    if (!config.entities) {
        throw new Error(`Invalid configuration: "entities" section not found.`);
    }

    const procedures: StoredProcedureEntity[] = [];

    for (const [entityName, entityDefinition] of Object.entries(config.entities)) {
        if (entityDefinition.source?.type === 'stored-procedure') {
            const parameters = (entityDefinition.source.parameters || []).map(p => ({
                name: p.name,
                required: p.required || false,
                default: p.default
            }));
            
            const fields = (entityDefinition.fields || []).map(f => ({
                name: f.name
            }));
            
            procedures.push({
                name: entityName,
                sourceName: entityDefinition.source.object,
                parameters: parameters,
                fields: fields
            });
        }
    }

    return procedures;
}
