"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMermaidDiagram = generateMermaidDiagram;
/**
 * Generates a Mermaid state diagram representing tables, views, and procedures.
 * @param tables - An array of TableEntity objects representing tables.
 * @param procedures - An array of StoredProcedureEntity objects representing stored procedures.
 * @param views - An array of ViewEntity objects representing views.
 * @returns A string containing the Mermaid diagram.
 */
function generateMermaidDiagram(tables, procedures, views) {
    const lines = [];
    lines.push('stateDiagram-v2');
    lines.push('direction LR');
    lines.push('');
    // Style definitions
    lines.push('  classDef empty fill:none,stroke:none');
    lines.push('  classDef table stroke:black;');
    lines.push('  classDef view stroke:black;');
    lines.push('  classDef proc stroke:black;');
    lines.push('  classDef phantom stroke:gray,stroke-dasharray:5 5;');
    lines.push('');
    // Add empty class nodes only if tables is empty
    if (tables.length === 0)
        lines.push('  class NoTables empty');
    lines.push('');
    writeTables(lines, tables);
    writeViews(lines, views);
    writeProcs(lines, procedures);
    return lines.join('\n');
}
function sanitizeEntityName(entityName) {
    return (entityName.startsWith('dbo.') ? entityName.replace('dbo.', '') : entityName)
        .replace(/\./g, '_')
        .replace(/[\[\]]/g, '');
}
function writeTables(lines, tables) {
    const phantomEntities = new Set();
    const tablesGroup = [];
    const noRelationshipTables = [];
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
    tablesGroup.forEach(table => lines.push(`  class ${table} table`));
    phantomEntities.forEach(phantom => lines.push(`  class ${phantom} phantom`));
    lines.push('  state Tables {');
    if (tablesGroup.length === 0) {
        lines.push('    NoTables');
    }
    else {
        noRelationshipTables.forEach(table => lines.push(`    ${table}`));
        writeRelationships(lines, tables, phantomEntities);
    }
    lines.push('  }');
}
function writeRelationships(lines, tables, phantomEntities) {
    const addedRelationships = new Set();
    for (const table of tables) {
        const sanitizedTableName = sanitizeEntityName(table.name);
        for (const relationship of Object.values(table.relationships)) {
            const { targetEntity, linkingObject } = relationship;
            const sanitizedTargetEntity = sanitizeEntityName(targetEntity);
            let sanitizedLinkingObject;
            if (linkingObject) {
                sanitizedLinkingObject = sanitizeEntityName(linkingObject);
                if (phantomEntities.has(sanitizedLinkingObject)) {
                    const linkToTargetKey = `${sanitizedLinkingObject} --> ${sanitizedTargetEntity}`;
                    if (!addedRelationships.has(linkToTargetKey)) {
                        addedRelationships.add(linkToTargetKey);
                        lines.push(`    ${sanitizedLinkingObject} --> ${sanitizedTargetEntity}`);
                    }
                }
                else {
                    const sourceToLinkKey = `${sanitizedTableName} --> ${sanitizedLinkingObject}`;
                    if (!addedRelationships.has(sourceToLinkKey)) {
                        addedRelationships.add(sourceToLinkKey);
                        lines.push(`    ${sanitizedTableName} --> ${sanitizedLinkingObject}`);
                    }
                }
            }
            else {
                const sourceToTargetKey = `${sanitizedTableName} --> ${sanitizedTargetEntity}`;
                if (!addedRelationships.has(sourceToTargetKey)) {
                    addedRelationships.add(sourceToTargetKey);
                    lines.push(`    ${sanitizedTableName} --> ${sanitizedTargetEntity}`);
                }
            }
        }
    }
}
function writeViews(lines, views) {
    if (views.length > 0) {
        views.forEach(view => lines.push(`  class ${sanitizeEntityName(view.name)} view`));
        lines.push('  state Views {');
        views.forEach(view => lines.push(`    ${sanitizeEntityName(view.name)}`));
        lines.push('  }');
    }
}
function writeProcs(lines, procedures) {
    if (procedures.length > 0) {
        procedures.forEach(procedure => {
            const sanitizedProcName = sanitizeEntityName(procedure.name);
            lines.push(`  class ${sanitizedProcName} proc`);
        });
        lines.push('  state Procedures {');
        procedures.forEach(procedure => {
            const sanitizedProcName = sanitizeEntityName(procedure.name);
            lines.push(`    ${sanitizedProcName}`);
        });
        lines.push('  }');
    }
}
//# sourceMappingURL=generateMermaidDiagram.js.map