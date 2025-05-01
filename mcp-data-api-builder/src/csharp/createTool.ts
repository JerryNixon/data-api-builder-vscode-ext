import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition } from '../types';
import { toPascalCase, lowerFirst } from '../helpers';

export async function generateMcpToolClasses(
  entities: EntityDefinition[],
  selectedAliases: string[],
  configPath: string
): Promise<void> {
  const baseDir = path.dirname(configPath);
  const toolsFolder = path.join(baseDir, 'Mcp', 'Mcp.Server', 'Tools');
  fs.mkdirSync(toolsFolder, { recursive: true });

  for (const entity of entities) {
    const normalizedName = entity.source?.normalizedObjectName?.toLowerCase() || '';
    const alias = selectedAliases.find(a => normalizedName.includes(a.toLowerCase())) || 'Unknown';

    const className = toPascalCase(alias) + 'Tool';
    const modelType = toPascalCase(alias);
    const methods: string[] = [];

    methods.push(generateGetEntity(modelType, entity));
    methods.push(generateCreateEntity(modelType));
    methods.push(generateUpdateEntity(modelType));
    methods.push(generateDeleteEntity(modelType, entity));

    if (entity.source.type === 'stored-procedure') {
      methods.push(generateExecuteEntity(modelType, entity));
    }

    const navigation = (entity.relationships || []).filter(r => r.cardinality !== 'many-to-many');
    for (const rel of navigation) {
      const relName = toPascalCase(rel.targetEntity);
      methods.push(`    [McpServerTool(
        Name = nameof(Get${relName}s),
        Title = "Get related ${relName}s",
        ReadOnly = true, // this method reads data
        Idempotent = true, // calling it repeatedly yields same result
        Destructive = false, // does not mutate data
        OpenWorld = false)] // internal scope only
    [Description("Retrieves related ${rel.targetEntity} entries for the given ${modelType} entity. Useful for navigating one-to-many or one-to-one relationships.")]
    public static IEnumerable<${relName}> Get${relName}s(${modelType} parent) => throw new NotImplementedException();`);
    }

    const content = `using System.ComponentModel;
using ModelContextProtocol.Server;
using Shared.Models;

[McpServerToolType]
public static class ${className}
{
${methods.join('\n\n')}
}`;

    const filePath = path.join(toolsFolder, `${className}.g.cs`);
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
  }
}

function generateTool(verb: string, model: string, entity: EntityDefinition): string {
  switch (verb) {
    case 'Get': return generateGetEntity(model, entity);
    case 'Create': return generateCreateEntity(model);
    case 'Update': return generateUpdateEntity(model);
    case 'Delete': return generateDeleteEntity(model, entity);
    case 'Execute': return generateExecuteEntity(model, entity);
    default: return '';
  }
}

function generateGetEntity(model: string, entity: EntityDefinition): string {
  const keys = entity.dbMetadata?.columns?.filter(c => c.isKey) || [];
  const paramList = keys.map(k => `${k.netType} ${lowerFirst(k.alias)}`).join(', ');
  return `    [McpServerTool(
        Name = nameof(Get${model}),
        Title = "Get ${model} by primary key",
        ReadOnly = true, // only reads data
        Idempotent = true, // always returns the same result
        Destructive = false, // no mutation
        OpenWorld = false)] // scoped to internal storage
    [Description("Fetches a single ${model} by its primary keys. Uses the REST API to query the entity by unique identifiers defined in Data API Builder.")]
    public static ${model}? Get${model}(${paramList}) => throw new NotImplementedException();`;
}

function generateCreateEntity(model: string): string {
  return `    [McpServerTool(
        Name = nameof(Create${model}),
        Title = "Create a new ${model}",
        ReadOnly = false, // modifies state
        Idempotent = false, // creates new instance
        Destructive = false, // not a destructive delete
        OpenWorld = false)] // internal logic only
    [Description("Creates a new ${model} using the supplied input. Sends a POST to the REST endpoint configured in Data API Builder.")]
    public static ${model} Create${model}(${model} input) => throw new NotImplementedException();`;
}

function generateUpdateEntity(model: string): string {
  return `    [McpServerTool(
        Name = nameof(Update${model}),
        Title = "Update existing ${model}",
        ReadOnly = false, // modifies data
        Idempotent = true, // repeatable effect
        Destructive = false, // no deletion
        OpenWorld = false)] // internal service only
    [Description("Updates the specified ${model} entity by sending a PATCH to the REST endpoint. Relies on the schema mappings and key fields in the configuration.")]
    public static ${model} Update${model}(${model} input) => throw new NotImplementedException();`;
}

function generateDeleteEntity(model: string, entity: EntityDefinition): string {
  const keys = entity.dbMetadata?.columns?.filter(c => c.isKey) || [];
  const paramList = keys.map(k => `${k.netType} ${lowerFirst(k.alias)}`).join(', ');
  return `    [McpServerTool(
        Name = nameof(Delete${model}),
        Title = "Delete ${model} by key",
        ReadOnly = false, // mutates storage
        Idempotent = true, // multiple calls = same result
        Destructive = true, // removes data
        OpenWorld = false)] // restricted scope
    [Description("Deletes the ${model} using the primary key fields. Sends a DELETE call to the REST endpoint defined in Data API Builder.")]
    public static bool Delete${model}(${paramList}) => throw new NotImplementedException();`;
}

function generateExecuteEntity(model: string, entity: EntityDefinition): string {
  const params = (entity.dbMetadata?.parameters || []).map(p => `${p.netType} ${lowerFirst(p.name)}`).join(', ');
  return `    [McpServerTool(
        Name = nameof(Execute${model}),
        Title = "Execute ${model} stored procedure",
        ReadOnly = false, // stored procedures may modify state
        Idempotent = false, // behavior not guaranteed repeatable
        Destructive = true, // may cause data side effects
        OpenWorld = false)] // backend-only scope
    [Description("Executes the stored procedure ${model} with the given parameters. The behavior of the procedure is determined by backend logic, and its effects are considered non-idempotent and potentially state-altering.")]
    public static IEnumerable<${model}> Execute${model}(${params}) => throw new NotImplementedException();`;
}
