import * as fs from 'fs';

interface Config {
    entities: Record<string, EntityDefinition>;
}

interface EntityDefinition {
    source: {
        object: string; // The schema-qualified name (e.g., "dbo.SampleProcedure")
        type: string;
    };
}

/**
 * Represents a stored procedure with its schema-qualified source name and cleansed entity name.
 */
export interface StoredProcedureEntity {
    name: string;       // The cleansed entity name
    sourceName: string; // The schema-qualified source name
}

/**
 * Extracts stored procedures from the configuration file.
 * @param configPath - The path to the configuration file.
 * @returns An array of stored procedure objects.
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
            procedures.push({
                name: entityName,
                sourceName: entityDefinition.source.object,
            });
        }
    }

    return procedures;
}
