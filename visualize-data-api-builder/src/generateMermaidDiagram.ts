import { TableEntity } from './getTables';

export function generateMermaidDiagram(tables: TableEntity[]): string {
    const lines: string[] = [];

    lines.push('stateDiagram-v2');
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
    writeViews(lines, []);
    writeProcs(lines, []);

    return lines.join('\n');
}

function sanitizeEntityName(entityName: string): string {
    return (entityName.startsWith('dbo.') ? entityName.replace('dbo.', '') : entityName).replace(/\./g, '_');
}

function writeTables(lines: string[], tables: TableEntity[]): void {
    const addedRelationships = new Set<string>();
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
    lines.push('  }');
}

function writeViews(lines: string[], views: string[]): void {
    views.forEach(view => lines.push(`  class ${view} view`));
    lines.push('  state Views {');
    if (views.length === 0) {
        lines.push('    NoViews');
    } else {
        views.forEach(view => lines.push(`    ${view}`));
    }
    lines.push('  }');
}

function writeProcs(lines: string[], procedures: string[]): void {
    procedures.forEach(procedure => lines.push(`  class ${procedure} proc`));
    lines.push('  state Procedures {');
    if (procedures.length === 0) {
        lines.push('    NoProcs');
    } else {
        procedures.forEach(procedure => lines.push(`    ${procedure}`));
    }
    lines.push('  }');
}
