"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTables = getTables;
const fs = __importStar(require("fs"));
function getTables(configPath) {
    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    if (!config.entities) {
        throw new Error(`Invalid configuration: "entities" section not found.`);
    }
    const tables = [];
    for (const [entityName, entityDefinition] of Object.entries(config.entities)) {
        if (entityDefinition.source?.type === 'table') {
            const relationships = {};
            const inferredIdColumns = new Set();
            // Infer Id columns from relationships
            if (entityDefinition.relationships) {
                for (const [relName, relDef] of Object.entries(entityDefinition.relationships)) {
                    // Determine CardinalityType
                    let cardinalityType = 'N:N'; // Default to many-to-many
                    let relationSymbol = '}o--o{'; // Default symbol for many-to-many
                    // If no linking.object is present, it's not N:N
                    if (!relDef['linking.object']) {
                        if (relDef['source.fields'].length === 1 &&
                            entityDefinition.source['key-fields']?.includes(relDef['source.fields'][0])) {
                            cardinalityType = '1:N'; // Source field is a primary key
                            relationSymbol = '||--o{';
                        }
                        else if (relDef['target.fields'].length === 1 &&
                            config.entities[relDef['target.entity']].source['key-fields']?.includes(relDef['target.fields'][0])) {
                            cardinalityType = 'N:1'; // Target field is a primary key
                            relationSymbol = '}o--||';
                        }
                        else if (relDef['source.fields'][0].toLowerCase().includes(entityName.toLowerCase()) ||
                            relDef['target.fields'][0].toLowerCase().includes(entityName.toLowerCase())) {
                            // Infer based on naming convention
                            if (relDef.cardinality === 'many') {
                                cardinalityType = 'N:1'; // Assume foreign key
                                relationSymbol = '}o--||';
                            }
                            else {
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
//# sourceMappingURL=getTables.js.map