import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { EntityDefinition, DbColumn, DbParameter } from '../types';
import { buildAliasMap } from '../helpers';

/**
 * Generates repository classes for MCP entities using metadata.
 * @param entities Enriched EntityDefinitions with dbMetadata.
 * @param selectedAliases User-selected aliases to filter for output.
 * @param configPath The path to the DAB config file.
 */
export async function generateMcpRepositories(
  entities: EntityDefinition[],
  selectedAliases: string[],
  configPath: string
): Promise<void> {
  const baseDir = path.dirname(configPath);
  const repoFolder = path.join(baseDir, 'Mcp', 'Mcp.Server', 'Api', 'Repositories');
  fs.mkdirSync(repoFolder, { recursive: true });

  for (const entity of entities) {
    const db = entity.dbMetadata;
    if (!db) { continue; }

    const className = selectedAliases.find(alias =>
      db.objectName.toLowerCase().includes(alias.toLowerCase())
    ) || db.objectName;

    const aliasMap = buildAliasMap(entity.mappings);
    let content = '';

    switch (db.type) {
      case 'table':
      case 'view':
        content = buildTableOrViewRepository(className, db.columns, aliasMap);
        break;
      case 'stored-procedure':
        content = buildProcedureRepository(className, db.parameters || []);
        break;
      default:
        vscode.window.showWarningMessage(`Unsupported entity type: ${db.type}`);
        continue;
    }

    const filePath = path.join(repoFolder, `${className}Repository.g.cs`);
    fs.writeFileSync(filePath, content.trim(), 'utf-8');
  }
}

/**
 * Builds repository class for a table or view entity.
 */
function buildTableOrViewRepository(
  className: string,
  columns: DbColumn[],
  aliasMap: Record<string, string>
): string {
  const keys = columns.filter(c => c.isKey);
  const methodParams = keys.map(c => `${c.netType} ${lowerFirst(c.alias)}`).join(', ');
  const queryFilters = keys
    .map(c => {
      const alias = aliasMap[c.name] || c.alias;
      return `${alias} eq \${${lowerFirst(c.alias)}}`;
    })
    .join(' and ');

  return `
namespace Api.Repositories;

using Api.Abstractions;
using Api.Options;
using Shared.Models;

public partial class ${className}Repository : ApiTableViewRepository<${className}>
{
    public ${className}Repository(Uri baseUri) : base(baseUri) { }

    public async Task<${className}?> GetAsync(${methodParams})
    {
        var options = new ApiTableOptions
        {
            Filter = $"${queryFilters}"
        };
        return (await GetAsync(options)).FirstOrDefault();
    }
}`;
}

/**
 * Builds repository class for a stored procedure entity.
 */
function buildProcedureRepository(className: string, parameters: DbParameter[]): string {
  const methodParams = parameters
    .map(p => `${p.netType} ${lowerFirst(p.name)}`)
    .join(', ');

  const paramAssignments = parameters
    .map(p => `{ "${p.name}", ${lowerFirst(p.name)}.ToString() }`)
    .join(',\n                ');

  return `
namespace Api.Repositories;

using Api.Abstractions;
using Api.Options;
using Shared.Models;

public partial class ${className}Repository(Uri baseUri) 
    : ApiProcedureRepository<${className}>(baseUri)
{
    public async Task<${className}[]> ExecAsync(${methodParams})
    {
        var options = new ApiProcedureOptions
        {
            Method = ApiProcedureOptions.ApiMethod.GET,
            Parameters = new()
            {
                ${paramAssignments}
            }
        };

        return await ExecuteProcedureAsync(options);
    }
}`;
}

/**
 * Lowercases the first character of a name.
 */
function lowerFirst(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}
