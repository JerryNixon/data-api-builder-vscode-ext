import { TableEntity } from './getTables';
import { StoredProcedureEntity } from './getProcs';
import { ViewEntity } from './getViews';

/**
 * Generates a Mermaid ER diagram representing tables, views, and procedures.
 * @param tables - An array of TableEntity objects representing tables.
 * @param procedures - An array of StoredProcedureEntity objects representing stored procedures.
 * @param views - An array of ViewEntity objects representing views.
 * @returns A string containing the Mermaid diagram.
 */
export function generateMermaidDiagram(tables: TableEntity[], procedures: StoredProcedureEntity[], views: ViewEntity[]): string {
  const lines: string[] = [];

  lines.push('erDiagram');
  lines.push('');

  // Add empty message if no entities
  if (tables.length === 0 && views.length === 0 && procedures.length === 0) {
    lines.push('  %% No entities found');
  }
  lines.push('');

  writeTables(lines, tables);
  writeViews(lines, views);
  writeProcs(lines, procedures);

  return lines.join('\n');
}

function sanitizeEntityName(entityName: string): string {
  return (entityName.startsWith('dbo.') ? entityName.replace('dbo.', '') : entityName)
    .replace(/\./g, '_')
    .replace(/[\[\]]/g, '');
}

function writeTables(lines: string[], tables: TableEntity[]): void {
  if (tables.length === 0) {
    return;
  }

  const addedRelationships = new Set<string>();

  // Define table entities with their fields
  for (const table of tables) {
    const sanitizedTableName = sanitizeEntityName(table.name);
    lines.push(`  "T:${sanitizedTableName}" {`);
    
    // Add all fields with PK/FK indicators
    if (table.fields && table.fields.length > 0) {
      table.fields.forEach(field => {
        const pkIndicator = field.isPrimaryKey ? ' PK' : '';
        lines.push(`    string ${field.name}${pkIndicator}`);
      });
    } else if (table.keyFields && table.keyFields.length > 0) {
      // Fallback to key fields if no detailed fields available
      table.keyFields.forEach(field => {
        lines.push(`    string ${field} PK`);
      });
    }
    
    lines.push(`  }`);
  }

  lines.push('');

  // Write relationships
  for (const table of tables) {
    const sanitizedTableName = sanitizeEntityName(table.name);

    for (const relationship of Object.values(table.relationships)) {
      const { targetEntity, linkingObject, cardinality } = relationship;
      const sanitizedTargetEntity = sanitizeEntityName(targetEntity);

      let relationshipKey: string;
      let relationshipLine: string;

      if (linkingObject) {
        // Many-to-many relationship (via linking table)
        // Draw direct relationship with different notation
        relationshipKey = [sanitizedTableName, sanitizedTargetEntity].sort().join('-->');
        
        if (!addedRelationships.has(relationshipKey)) {
          addedRelationships.add(relationshipKey);
          relationshipLine = `  "T:${sanitizedTableName}" }o--o{ "T:${sanitizedTargetEntity}" : "many-to-many"`;
          lines.push(relationshipLine);
        }
      } else {
        // Direct relationship (one-to-one or one-to-many)
        relationshipKey = `${sanitizedTableName}-->${sanitizedTargetEntity}`;
        
        if (!addedRelationships.has(relationshipKey)) {
          addedRelationships.add(relationshipKey);
          
          if (cardinality === 'one') {
            // Many-to-one relationship
            relationshipLine = `  "T:${sanitizedTableName}" }o--|| "T:${sanitizedTargetEntity}" : "belongs to"`;
          } else {
            // One-to-many relationship
            relationshipLine = `  "T:${sanitizedTableName}" ||--o{ "T:${sanitizedTargetEntity}" : "has many"`;
          }
          
          lines.push(relationshipLine);
        }
      }
    }
  }

  lines.push('');
}

function writeViews(lines: string[], views: ViewEntity[]): void {
  if (views.length > 0) {
    views.forEach(view => {
      const sanitizedViewName = sanitizeEntityName(view.name);
      lines.push(`  "V:${sanitizedViewName}" {`);
      
      // Add view fields
      if (view.fields && view.fields.length > 0) {
        view.fields.forEach(field => {
          lines.push(`    string ${field.name}`);
        });
      }
      
      lines.push(`  }`);
    });
    lines.push('');
  }
}

function writeProcs(lines: string[], procedures: StoredProcedureEntity[]): void {
  if (procedures.length > 0) {
    procedures.forEach(procedure => {
      const sanitizedProcName = sanitizeEntityName(procedure.name);
      lines.push(`  "P:${sanitizedProcName}" {`);
      
      // Add parameters first
      if (procedure.parameters && procedure.parameters.length > 0) {
        procedure.parameters.forEach(param => {
          const suffix = param.required ? '_req' : '_opt';
          lines.push(`    string ${param.name}${suffix} "in"`);
        });
      }
      
      // Add result fields (no label since "out" is reserved)
      if (procedure.fields && procedure.fields.length > 0) {
        procedure.fields.forEach(field => {
          lines.push(`    string ${field.name}`);
        });
      }
      
      lines.push(`  }`);
    });
    lines.push('');
  }
}
