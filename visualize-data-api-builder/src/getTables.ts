import * as fs from 'fs';

interface Config {
    entities: Record<string, EntityDefinition>;
}

interface EntityDefinition {
    source: {
        object: string;
        type: string;
        'key-fields': string[];
    };
    relationships?: Record<string, RelationshipDefinition>;
}

interface RelationshipDefinition {
    cardinality: string;
    'target.entity': string;
    'source.fields': string[];
    'target.fields': string[];
    'linking.object'?: string;
    'linking.source.fields'?: string[];
    'linking.target.fields'?: string[];
}

interface TableEntity {
    name: string;
    source: string;
    keyFields: string[];
    relationships: Record<string, Relationship>;
    idColumns?: string[]; // Add inferred Id columns
}

interface Relationship {
    name: string;
    cardinality: string;
    targetEntity: string;
    sourceFields: string[];
    targetFields: string[];
    linkingObject?: string;
    linkingSourceFields?: string[];
    linkingTargetFields?: string[];
    cardinalityType: string; // Add CardinalityType
}

export function getTables(configPath: string): TableEntity[] {
    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);

    if (!config.entities) {
        throw new Error(`Invalid configuration: "entities" section not found.`);
    }

    const tables: TableEntity[] = [];

    for (const [entityName, entityDefinition] of Object.entries(config.entities)) {
        if (entityDefinition.source?.type === 'table') {
            const relationships: Record<string, Relationship> = {};
            const inferredIdColumns = new Set<string>();

            // Infer Id columns from relationships
            if (entityDefinition.relationships) {
                for (const [relName, relDef] of Object.entries(entityDefinition.relationships)) {
                    // Determine CardinalityType
                    let cardinalityType = 'N:N'; // Default to many-to-many
                    let relationSymbol = '}o--o{'; // Default symbol for many-to-many

                    // If no linking.object is present, it's not N:N
                    if (!relDef['linking.object']) {
                        if (
                            relDef['source.fields'].length === 1 &&
                            entityDefinition.source['key-fields']?.includes(relDef['source.fields'][0])
                        ) {
                            cardinalityType = '1:N'; // Source field is a primary key
                            relationSymbol = '||--o{';
                        } else if (
                            relDef['target.fields'].length === 1 &&
                            config.entities[relDef['target.entity']].source['key-fields']?.includes(
                                relDef['target.fields'][0]
                            )
                        ) {
                            cardinalityType = 'N:1'; // Target field is a primary key
                            relationSymbol = '}o--||';
                        } else if (
                            relDef['source.fields'][0].toLowerCase().includes(entityName.toLowerCase()) ||
                            relDef['target.fields'][0].toLowerCase().includes(entityName.toLowerCase())
                        ) {
                            // Infer based on naming convention
                            if (relDef.cardinality === 'many') {
                                cardinalityType = 'N:1'; // Assume foreign key
                                relationSymbol = '}o--||';
                            } else {
                                cardinalityType = '1:N'; // Assume source is primary
                                relationSymbol = '||--o{';
                            }
                        }
                    }

                    relationships[relName] = {
                        name: relName,
                        cardinality: relDef.cardinality,
                        targetEntity: relDef['target.entity'],
                        sourceFields: relDef['source.fields'] || [],
                        targetFields: relDef['target.fields'] || [],
                        linkingObject: relDef['linking.object'],
                        linkingSourceFields: relDef['linking.source.fields'] || [],
                        linkingTargetFields: relDef['linking.target.fields'] || [],
                        cardinalityType // Include the CardinalityType
                    };

                    // Infer Id columns from source and target fields
                    relDef['source.fields']?.forEach(field => inferredIdColumns.add(field));
                }
            }

            tables.push({
                name: entityName,
                source: entityDefinition.source.object,
                keyFields: entityDefinition.source['key-fields'] || [], // Still consider explicit key-fields if present
                relationships: relationships,
                idColumns: Array.from(inferredIdColumns)
            });
        }
    }

    return tables;
}

export type { TableEntity, Relationship };
