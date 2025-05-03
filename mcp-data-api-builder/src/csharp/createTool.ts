import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition, DbColumn, DbParameter } from '../types';
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

    const columns = entity.dbMetadata?.columns ?? [];
    const parameters = entity.dbMetadata?.parameters ?? [];
    const summary = summarizeEntityMetadata(columns, parameters);

    methods.push(generateGetEntity(modelType, summary));
    methods.push(generateCreateEntity(modelType, summary));
    methods.push(generateUpdateEntity(modelType, summary));
    methods.push(generateDeleteEntity(modelType, summary));

    if (entity.source.type === 'stored-procedure') {
      methods.push(generateExecuteEntity(modelType, summary));
    }

    const entityNames = new Set(
      entities.map(e => e.source?.normalizedObjectName?.toLowerCase()).filter(Boolean)
    );

    const navigation = (entity.relationships || [])
      .filter(r => r.cardinality !== 'many-to-many' && entityNames.has(r.targetEntity.toLowerCase()));

    for (const rel of navigation) {
      const relName = toPascalCase(rel.targetEntity);
      methods.push(`[McpServerTool]
    [Description("Retrieves related ${rel.targetEntity} entries for the given ${modelType} entity. Useful for navigating one-to-many or one-to-one relationships.")]
    public static IEnumerable<${relName}> Get${relName}s(${modelType} parent) => throw new NotImplementedException();`);
    }

    const content = `#nullable enable

using System.ComponentModel;
using ModelContextProtocol.Server;
using Mcp.Models;
using Microsoft.DataApiBuilder.Rest.Abstractions;
using System.Threading.Tasks;
using Microsoft.DataApiBuilder.Rest.Options;

[McpServerToolType]
public static class ${className}
{
    private static readonly string BASE_URL = "http://localhost:5000/api${entity.rest?.path}";
    private static readonly TableRepository<Actor> repository = new(new(BASE_URL));

${methods.join('\n\n')}
}`;

    const filePath = path.join(toolsFolder, `${className}.g.cs`);
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
  }
}

function generateGetEntity(model: string, summary: EntityMetadataSummary): string {
  return `    [McpServerTool]
    [Description("""
    Fetches an array of ${model} records.
    Keys: ${summary.keys}
    Returns: ${summary.keys}, ${summary.nonKeys}
    Parameter: filter: An expression to filter the result set.
      Filter supports operators: eq, ne, gt, lt, ge, le, and/or, and parenthesis.
      Filter example: "${summary.filterExamples}"
    """)]
    public static ${model}[] Get${model}(string? filter = null)
    {
      var options = new TableOptions
      {
        Filter = filter
      };
      return repository.GetAsync(options).GetAwaiter().GetResult().Result ?? [];
    }`;
}

function generateCreateEntity(model: string, summary: EntityMetadataSummary): string {
  const assignments = summary.nonKeysAsNetParams
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const [type, name] = p.split(' ');
      return `        ${toPascalCase(name)} = ${name}`;
    })
    .join(',\n');

  return `    [McpServerTool]
    [Description("""
    Creates a new ${model} using the supplied input.
    Parameters: ${summary.nonKeys}
    Returns: ${summary.keys}, ${summary.nonKeys}
    """)]
    public static ${model} Create${model}(${summary.nonKeysAsNetParams})
    {
      var item = new ${model}
      {
${assignments}
      };
      return repository.PostAsync(item).GetAwaiter().GetResult().Result ?? null!;
    }`;
}

function generateUpdateEntity(model: string, summary: EntityMetadataSummary): string {
  const paramList = [summary.keysAsNetParams, summary.nonKeysAsNetParams].filter(Boolean).join(', ');
  const assignments = [summary.keysAsNetParams, summary.nonKeysAsNetParams]
    .join(',')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const [type, name] = p.split(' ');
      return `        ${toPascalCase(name)} = ${name}`;
    })
    .join(',\n');

  return `    [McpServerTool]
    [Description("""
    Updates an existing ${model} entity.
    Parameters: ${summary.keys}, ${summary.nonKeys}
    Returns: ${summary.keys}, ${summary.nonKeys}
    """)]
    public static ${model} Update${model}(${paramList})
    {
      var item = new ${model}
      {
${assignments}
      };
      return repository.PatchAsync(item).GetAwaiter().GetResult().Result ?? null!;
    }`;
}

function generateDeleteEntity(model: string, summary: EntityMetadataSummary): string {
  const assignments = [summary.keysAsNetParams]
    .join(',')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const [type, name] = p.split(' ');
      return `        ${toPascalCase(name)} = ${name}`;
    })
    .join(',\n');

  return `    [McpServerTool]
    [Description("""
    Deletes the ${model} using the primary key fields.
    Parameters: ${summary.keys}
    Returns: true | false
    """)]
    public static bool Delete${model}(${summary.keysAsNetParams}) 
    {
      var item = new ${model}
      {
${assignments}
      };
      return repository.DeleteAsync(item).GetAwaiter().GetResult().Success;
    }`;
}

function generateExecuteEntity(model: string, summary: EntityMetadataSummary): string {
  return `    [McpServerTool]
    [Description("""
    Executes the stored procedure ${model}.
    Returns: ${summary.keys}, ${summary.nonKeys}
    Parameters: ${summary.parameters || 'None'}
    """)]
    public static IEnumerable<${model}> Execute${model}(${summary.parametersAsNetParams}) => throw new NotImplementedException();`;
}

export interface EntityMetadataSummary {
  keys: string;
  nonKeys: string;
  filterExamples: string;
  parameters?: string;
  keysAsNetParams: string;
  nonKeysAsNetParams: string;
  parametersAsNetParams: string;
}

export function summarizeEntityMetadata(columns: DbColumn[] = [], parameters: DbParameter[] = []): EntityMetadataSummary {
  const keys = columns
    .filter(c => c.isKey)
    .map(c => `${c.alias} (${c.netType})`)
    .join(', ');

  const nonKeys = columns
    .filter(c => !c.isKey && c.alias)
    .map(c => `${c.alias} (${c.netType})`)
    .join(', ');

  const filterExamples = columns
    .filter(c => !c.isKey && c.alias)
    .map(c => {
      switch (c.netType) {
        case 'string':
          return `${c.alias} eq 'value'`;
        case 'int':
        case 'long':
        case 'float':
        case 'double':
        case 'decimal':
          return `${c.alias} eq 123`;
        case 'bool':
          return `${c.alias} eq true`;
        case 'DateTime':
          return `${c.alias} eq 2024-01-01T00:00:00Z`;
        default:
          return `${c.alias} eq <value>`;
      }
    })
    .join(' and ');

  const parameterList = parameters
    .map(p => `${p.name} (${p.netType})`)
    .join(', ');

  const keysAsNetParams = columns
    .filter(c => c.isKey)
    .map(c => `${c.netType} ${lowerFirst(c.alias)}`)
    .join(', ');

  const nonKeysAsNetParams = columns
    .filter(c => !c.isKey && c.alias)
    .map(c => `${c.netType} ${lowerFirst(c.alias)}`)
    .join(', ');

  const parametersAsNetParams = parameters
    .map(p => `${p.netType} ${lowerFirst(p.name)}`)
    .join(', ');

  return {
    keys,
    nonKeys,
    filterExamples,
    parameters: parameterList,
    keysAsNetParams,
    nonKeysAsNetParams,
    parametersAsNetParams
  };
}
