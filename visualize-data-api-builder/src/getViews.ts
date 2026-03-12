import * as fs from 'fs';

interface Config {
    entities: Record<string, EntityDefinition>;
}

interface EntityDefinition {
    source: {
        object: string; // The schema-qualified name (e.g., "dbo.SampleView")
        type: string;
    };
    fields?: Array<{
        name: string;
        alias?: string;
    }>;
}

/**
 * Represents a view with its schema-qualified source name and cleansed entity name.
 */
export interface ViewEntity {
    name: string;       // The cleansed entity name
    sourceName: string; // The schema-qualified source name
    fields: Array<{ name: string }>;
}

/**
 * Extracts view entities from the DAB configuration file.
 * 
 * NOTE: This function reads from CONFIG files, not database metadata.
 * It is different from shared-database's getViews() which queries actual database views.
 * 
 * @param configPath - The path to the configuration file.
 * @returns An array of ViewEntity objects from the config.
 */
export function getViews(configPath: string): ViewEntity[] {
    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);

    if (!config.entities) {
        throw new Error(`Invalid configuration: "entities" section not found.`);
    }

    const views: ViewEntity[] = [];

    for (const [entityName, entityDefinition] of Object.entries(config.entities)) {
        if (entityDefinition.source?.type === 'view') {
            const fields = (entityDefinition.fields || []).map(f => ({
                name: f.name
            }));
            
            views.push({
                name: entityName,
                sourceName: entityDefinition.source.object,
                fields: fields
            });
        }
    }

    return views;
}
