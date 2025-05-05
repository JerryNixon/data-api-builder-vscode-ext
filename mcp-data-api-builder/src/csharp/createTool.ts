import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition, DbColumn, DbParameter } from '../types';
import { toPascalCase, lowerFirst, sanitizeIdentifier } from '../helpers';
import { getClassName, shouldGenerateFor } from '../helpers';

export async function generateMcpToolClasses(
  entities: EntityDefinition[],
  selectedAliases: string[],
  configPath: string
): Promise<void> {
  const baseDir = path.dirname(configPath);
  const toolsFolder = path.join(baseDir, 'Mcp', 'Mcp.Server', 'Tools');
  fs.mkdirSync(toolsFolder, { recursive: true });

  const procMethods: string[] = [];

  for (const entity of entities) {
    if (!shouldGenerateFor(entity, selectedAliases)) continue;

    const modelType = getClassName(entity);
    const className = modelType + 'Tool';
    const tableMethods: string[] = [];

    const columns = entity.dbMetadata?.columns ?? [];
    const parameters = entity.dbMetadata?.parameters ?? [];
    const summary = summarizeEntityMetadata(columns, parameters);

    if (entity.source.type === 'stored-procedure') {
      procMethods.push(generateExecuteEntity(modelType, summary));
      continue;
    }

    tableMethods.push(generateGetEntity(modelType, summary));
    tableMethods.push(generateCreateEntity(modelType, summary));
    tableMethods.push(generateUpdateEntity(modelType, summary));
    tableMethods.push(generateDeleteEntity(modelType, summary));

    const entityNames = new Set(
      entities.map(e => e.source?.normalizedObjectName?.toLowerCase()).filter(Boolean)
    );

    const navigation = (entity.relationships || [])
      .filter(r => r.cardinality !== 'many-to-many' && entityNames.has(r.targetEntity.toLowerCase()));

    for (const rel of navigation) {
      const relName = toPascalCase(rel.targetEntity);
      tableMethods.push(`[McpServerTool]
    [Description("Retrieves related ${rel.targetEntity} entries for the given ${modelType} entity. Useful for navigating one-to-many or one-to-one relationships.")]
    public static IEnumerable<${relName}> Get${relName}s(${modelType} parent) => throw new NotImplementedException();`);
    }

    const content = `using Mcp;
using Mcp.Models;
using System.ComponentModel;
using ModelContextProtocol.Server;
using Microsoft.DataApiBuilder.Rest.Options;

namespace Mcp.Tools;

[McpServerToolType]
public static class ${className}
{
${tableMethods.join('\n\n')}
}`;

    const filePath = path.join(toolsFolder, `${className}.cs`);
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
  }

  if (procMethods.length > 0) {
    const procContent = `using Mcp;
using Mcp.Models;
using System.ComponentModel;
using ModelContextProtocol.Server;
using Microsoft.DataApiBuilder.Rest.Options;

namespace Mcp.Tools;

[McpServerToolType]
public static class ProcTool
{
${procMethods.join('\n\n')}
}`;

    const procFilePath = path.join(toolsFolder, 'ProcTool.cs');
    fs.writeFileSync(procFilePath, procContent.trim(), 'utf-8');
  }
}

function withDescriptions(paramString: string): string {
  return paramString
    .split(',')
    .map(p => {
      const [type, name] = p.trim().split(' ');
      return `    [Description(\"The ${name} field\")] ${type} ${name}`;
    })
    .join(',\n');
}

function generateGetEntity(model: string, summary: EntityMetadataSummary): string {
  return `    [McpServerTool]
    [Description("""
    Gets a list of ${model} entities.
    Input: filter: An expression to filter the result set.
      Filter supports operators: eq, ne, gt, lt, ge, le, and/or, and parenthesis.
      Filter example: \"${summary.filterExamples}\"
    Output: ${summary.keys}, ${summary.nonKeys}
    Keys: ${summary.keys}
    """)]
    public static ${model}[] Get${model}(string? filter = null)
    {
      var options = new TableOptions
      {
        Filter = filter
      };
      var repository = ServiceLocator.${model}Repository;
      var response = repository.GetAsync(options).GetAwaiter().GetResult();
      return response.Result ?? [];
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
    Input: ${summary.nonKeys}
    Output: ${summary.keys}, ${summary.nonKeys}
    Keys: ${summary.keys}
    """)]
    public static ${model} Create${model}(
${withDescriptions(summary.nonKeysAsNetParams)}
    )
    {
      var item = new ${model}
      {
${assignments}
      };
      var repository = ServiceLocator.${model}Repository;
      var response = repository.PostAsync(item).GetAwaiter().GetResult();
      return response.Result ?? null!;
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
    Input: ${summary.keys}, ${summary.nonKeys}
    Output: ${summary.keys}, ${summary.nonKeys}
    Keys: ${summary.keys}
    """)]
    public static ${model} Update${model}(
${withDescriptions(paramList)}
    )
    {
      var item = new ${model}
      {
${assignments}
      };
      var repository = ServiceLocator.${model}Repository;
      var response = repository.PatchAsync(item).GetAwaiter().GetResult();
      return response.Result ?? null!;
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
    Input: ${summary.keys}
    Output: true | false
    Keys: ${summary.keys}
    """)]
    public static bool Delete${model}(
${withDescriptions(summary.keysAsNetParams)}
    )
    {
      var item = new ${model}
      {
${assignments}
      };
      var repository = ServiceLocator.${model}Repository;
      var response = repository.DeleteAsync(item).GetAwaiter().GetResult();
      return response.Success;
    }`;
}

function generateExecuteEntity(model: string, summary: EntityMetadataSummary): string {
  const paramList = summary.parameterDescriptions
    .map(([netType, name, desc]) => `        [Description(\"${desc}\")] ${netType} ${name}`)
    .join(',\n');

  const paramAssignments = summary.parameterDictionaryEntries
    .map(([name, netType]) => {
      const formatter = netType === 'DateTime'
        ? `${lowerFirst(name)}.ToString(\"yyyy-MM-ddTHH:mm:ssZ\")`
        : `${lowerFirst(name)}.ToString()`;
      return `        options.Parameters.Add(\"${name}\", ${formatter});`;
    })
    .join('\n');

  return `    [McpServerTool]
    [Description("""
    Executes the stored procedure ${model}.
    Input: ${summary.parameters || 'None'}
    Output: ${summary.nonKeys}
    """)]
    public static IEnumerable<${model}> Execute${model}(
${paramList}
    )
    {
        var options = new ProcedureOptions();
${paramAssignments}

        var repository = ServiceLocator.${model}Repository;
        var response = repository.ExecuteProcedureAsync(options).GetAwaiter().GetResult();
        return response.Result ?? [];
    }`;
}

export interface EntityMetadataSummary {
  keys: string;
  nonKeys: string;
  filterExamples: string;
  parameters?: string;
  keysAsNetParams: string;
  nonKeysAsNetParams: string;
  parametersAsNetParams: string;
  parameterDictionaryEntries: [string, string][];
  parameterDescriptions: [string, string, string][];
}

export function summarizeEntityMetadata(columns: DbColumn[] = [], parameters: DbParameter[] = []): EntityMetadataSummary {
  const keys = columns.filter(c => c.isKey).map(c => `${c.alias} (${c.netType})`).join(', ');
  const nonKeys = columns.filter(c => !c.isKey && c.alias).map(c => `${c.alias} (${c.netType})`).join(', ');
  const filterExamples = columns.filter(c => !c.isKey && c.alias).map(c => {
    switch (c.netType) {
      case 'string': return `${c.alias} eq 'value'`;
      case 'int':
      case 'long':
      case 'float':
      case 'double':
      case 'decimal': return `${c.alias} eq 123`;
      case 'bool': return `${c.alias} eq true`;
      case 'DateTime': return `${c.alias} eq 2024-01-01T00:00:00Z`;
      default: return `${c.alias} eq <value>`;
    }
  }).join(' and ');

  const parameterList = parameters.map(p => `${p.name} (${p.netType})`).join(', ');
  const keysAsNetParams = columns.filter(c => c.isKey).map(c => `${c.netType} ${lowerFirst(sanitizeIdentifier(c.alias))}`).join(', ');
  const nonKeysAsNetParams = columns.filter(c => !c.isKey && c.alias).map(c => `${c.netType} ${lowerFirst(sanitizeIdentifier(c.alias))}`).join(', ');
  const parametersAsNetParams = parameters.map(p => `${p.netType} ${lowerFirst(sanitizeIdentifier(p.name))}`).join(', ');
  const parameterDictionaryEntries: [string, string][] = parameters.map(p => [sanitizeIdentifier(p.name), p.netType]);
  const parameterDescriptions: [string, string, string][] = parameters.map(p => [p.netType, lowerFirst(sanitizeIdentifier(p.name)), `The ${p.name} parameter`]);

  return {
    keys,
    nonKeys,
    filterExamples,
    parameters: parameterList,
    keysAsNetParams,
    nonKeysAsNetParams,
    parametersAsNetParams,
    parameterDictionaryEntries,
    parameterDescriptions
  };
}
