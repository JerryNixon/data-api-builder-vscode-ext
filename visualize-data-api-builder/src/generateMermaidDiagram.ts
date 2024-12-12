import { TableEntity } from './getTables';
import { StoredProcedureEntity } from './getProcs';
import { ViewEntity } from './getViews';

/**
 * Generates a Mermaid state diagram representing tables, views, and procedures.
 * @param tables - An array of TableEntity objects representing tables.
 * @param procedures - An array of strings representing stored procedure names.
 * @param views - An array of strings representing view names.
 * @returns A string containing the Mermaid diagram.
 */
export function generateMermaidDiagram(tables: TableEntity[], procedures: StoredProcedureEntity[], views: ViewEntity[]): string {
  const lines: string[] = [];

  lines.push('stateDiagram-v2');
  lines.push('direction TB');
  
  lines.push(''); // Add a blank line for clarity

  // Add class definitions for styles
  lines.push('  classDef empty fill:none,stroke:none');
  lines.push('  classDef table stroke:blue;');
  lines.push('  classDef view stroke:red;');
  lines.push('  classDef proc stroke:black;');
  lines.push('  classDef phantom stroke:gray,stroke-dasharray:5 5;');

  lines.push(''); // Add a blank line for clarity

  lines.push('  class NoTables empty');
  lines.push('  class NoViews empty');
  lines.push('  class NoProcs empty');
  lines.push(''); // Add a blank line for clarity

  // Modular methods
  writeTables(lines, tables);
  writeViews(lines, views);
  writeProcs(lines, procedures);

  return lines.join('\n');
}

/**
 * Sanitizes entity names by removing "dbo." and replacing dots with underscores.
 * @param entityName - The entity name to sanitize.
 * @returns The sanitized entity name.
 */
function sanitizeEntityName(entityName: string): string {
  return (entityName.startsWith('dbo.') ? entityName.replace('dbo.', '') : entityName)
  .replace(/\./g, '_')
  .replace(/[\[\]]/g, '');
}

/**
 * Writes table definitions and their classifications to the lines array.
 * @param lines - The array to append Mermaid diagram lines to.
 * @param tables - An array of TableEntity objects representing tables.
 */
function writeTables(lines: string[], tables: TableEntity[]): void {
  const phantomEntities: Set<string> = new Set();
  const tablesGroup: string[] = [];
  const noRelationshipTables: string[] = [];

  // Identify phantom entities and group tables
  for (const table of tables) {
    for (const relationship of Object.values(table.relationships)) {
      const { linkingObject } = relationship;
      if (linkingObject) {
        const sanitizedLinkingObject = sanitizeEntityName(linkingObject);
        if (!tables.some(t => sanitizeEntityName(t.name) === sanitizedLinkingObject)) {
          phantomEntities.add(sanitizedLinkingObject);
        }
      }
    }

    const sanitizedTableName = sanitizeEntityName(table.name);
    tablesGroup.push(sanitizedTableName);

    if (Object.keys(table.relationships).length === 0) {
      noRelationshipTables.push(sanitizedTableName);
    }
  }

  phantomEntities.forEach(phantom => tablesGroup.push(phantom));

  // Add table classifications
  tablesGroup.forEach(table => lines.push(`  class ${table} table`));
  phantomEntities.forEach(phantom => lines.push(`  class ${phantom} phantom`));

  // Add composite state for tables
  lines.push('  state Tables {');
  if (tablesGroup.length === 0) {
    lines.push('    NoTables');
  } else {
    noRelationshipTables.forEach(table => lines.push(`    ${table}`)); // Standalone tables
    writeRelationships(lines, tables, phantomEntities);
  }
  lines.push('  }');
}

/**
 * Writes table relationships to the lines array.
 * @param lines - The array to append Mermaid diagram lines to.
 * @param tables - An array of TableEntity objects representing tables.
 * @param phantomEntities - A set of phantom entities representing linking objects.
 */
function writeRelationships(lines: string[], tables: TableEntity[], phantomEntities: Set<string>): void {
  const addedRelationships = new Set<string>();

  for (const table of tables) {
    const sanitizedTableName = sanitizeEntityName(table.name);

    for (const relationship of Object.values(table.relationships)) {
      const { targetEntity, linkingObject } = relationship;

      let sanitizedTargetEntity = sanitizeEntityName(targetEntity);
      let sanitizedLinkingObject: string | undefined;

      if (linkingObject) {
        sanitizedLinkingObject = sanitizeEntityName(linkingObject);

        if (phantomEntities.has(sanitizedLinkingObject)) {
          const linkToTargetKey = `${sanitizedLinkingObject} --> ${sanitizedTargetEntity}`;
          if (!addedRelationships.has(linkToTargetKey)) {
            addedRelationships.add(linkToTargetKey);
            lines.push(`    ${sanitizedLinkingObject} --> ${sanitizedTargetEntity}`);
          }
        } else {
          const sourceToLinkKey = `${sanitizedTableName} --> ${sanitizedLinkingObject}`;
          if (!addedRelationships.has(sourceToLinkKey)) {
            addedRelationships.add(sourceToLinkKey);
            lines.push(`    ${sanitizedTableName} --> ${sanitizedLinkingObject}`);
          }
        }
      } else {
        const sourceToTargetKey = `${sanitizedTableName} --> ${sanitizedTargetEntity}`;
        if (!addedRelationships.has(sourceToTargetKey)) {
          addedRelationships.add(sourceToTargetKey);
          lines.push(`    ${sanitizedTableName} --> ${sanitizedTargetEntity}`);
        }
      }
    }
  }
}

/**
 * Writes view definitions to the lines array.
 * @param lines - The array to append Mermaid diagram lines to.
 * @param views - An array of strings representing view names.
 */
function writeViews(lines: string[], views: ViewEntity[]): void {
  views.forEach(view => lines.push(`  class ${sanitizeEntityName(view.name)} view`));
  lines.push('  state Views {');
  if (views.length === 0) {
    lines.push('    NoViews');
  } else {
    views.forEach(view => lines.push(`    ${sanitizeEntityName(view.name)}`));
  }
  lines.push('  }');
}

/**
 * Writes stored procedure definitions to the lines array.
 * @param lines - The array to append Mermaid diagram lines to.
 * @param procedures - An array of StoredProcedure objects representing stored procedures.
 */
function writeProcs(lines: string[], procedures: StoredProcedureEntity[]): void {
  procedures.forEach(procedure => {
    const sanitizedProcName = sanitizeEntityName(procedure.name);
    lines.push(`  class ${sanitizedProcName} proc`);
  });

  lines.push('  state Procedures {');
  if (procedures.length === 0) {
    lines.push('    NoProcs');
  } else {
    procedures.forEach(procedure => {
      const sanitizedProcName = sanitizeEntityName(procedure.name);
      lines.push(`    ${sanitizedProcName}`);
    });
  }
  lines.push('  }');
}
