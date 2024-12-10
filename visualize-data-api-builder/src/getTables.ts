import * as fs from 'fs';

interface Config {
  entities: Record<string, EntityDefinition>;
}

interface EntityDefinition {
  source: {
    object: string;
    type: string;
    'key-fields'?: string[];
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
  idColumns?: string[];
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
  cardinalityType: string;
}

/**
 * Extracts tables from the configuration file.
 * @param configPath - The path to the configuration file.
 * @returns An array of TableEntity objects.
 */
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

      // Process relationships for tables
      if (entityDefinition.relationships) {
        for (const [relName, relDef] of Object.entries(entityDefinition.relationships)) {
          relationships[relName] = {
            name: relName,
            cardinality: relDef.cardinality,
            targetEntity: relDef['target.entity'],
            sourceFields: relDef['source.fields'] || [],
            targetFields: relDef['target.fields'] || [],
            linkingObject: relDef['linking.object'],
            linkingSourceFields: relDef['linking.source.fields'] || [],
            linkingTargetFields: relDef['linking.target.fields'] || [],
            cardinalityType: 'N:N', // Default cardinality
          };

          relDef['source.fields']?.forEach(field => inferredIdColumns.add(field));
        }
      }

      tables.push({
        name: entityName,
        source: entityDefinition.source.object,
        keyFields: entityDefinition.source['key-fields'] || [],
        relationships: relationships,
        idColumns: Array.from(inferredIdColumns),
      });
    }
  }

  return tables;
}

export type { TableEntity, Relationship };
