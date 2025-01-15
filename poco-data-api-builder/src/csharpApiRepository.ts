import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { EntityDefinition } from './readConfig';
import { getTableKeysTypes, getViewKeyTypes, getProcParameterTypes } from './mssql/querySql';

export async function createApiCs(
  pool: any,
  genCsFolder: string,
  entities: Record<string, EntityDefinition>,
  selectedEntities: vscode.QuickPickItem[]
): Promise<void> {
  const apiFolderPath = path.join(genCsFolder, 'Api');
  fs.mkdirSync(apiFolderPath, { recursive: true });

  for (const selected of selectedEntities) {
    const entity = entities[selected.label];
    let repositoryCode = '';

    switch (entity.source.type) {
      case 'table':
        repositoryCode = await createTableRepository(pool, entity, selected.label);
        break;
      case 'view':
        repositoryCode = await createViewRepository(pool, entity, selected.label);
        break;
      case 'stored-procedure':
        repositoryCode = await createProcRepository(pool, entity, selected.label);
        break;
      default:
        vscode.window.showWarningMessage(`Unsupported entity type: ${entity.source.type}`);
        continue;
    }

    const filePath = path.join(apiFolderPath, `${selected.label}Repository.cs`);
    fs.writeFileSync(filePath, repositoryCode.trim());
  }
}

/**
 * Creates a repository for a table.
 */
async function createTableRepository(pool: any, entity: EntityDefinition, className: string): Promise<string> {
  const keyTypes = await getTableKeysTypes(pool, entity.source.object);
  const mappings = entity.mappings || {};

  const methodParams = Object.entries(keyTypes)
    .map(([key, type]) => `${type.replace(/\?$/, '')} ${key.charAt(0).toLowerCase()}${key.slice(1)}`)
    .join(', ');

  const queryFilters = Object.keys(keyTypes)
    .map((key) => {
      const alias = mappings[key] || key; // Use alias if available
      const paramName = `${key.charAt(0).toLowerCase()}${key.slice(1)}`;
      return `${alias} eq \${${paramName}}`;
    })
    .join(' and ');

  return `
namespace Api;

using Api.Logic.Abstractions;
using Api.Logic.Options;
using Api.Models;

public class ${className}Repository : ApiTableViewRepository<${className}>
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
}
`;
}

/**
 * Creates a repository for a view.
 */
async function createViewRepository(pool: any, entity: EntityDefinition, className: string): Promise<string> {
  if (!entity.source['key-fields']) {
    throw new Error(`Key fields must be provided for views: ${entity.source.object}`);
  }
  const keyTypes = await getViewKeyTypes(pool, entity.source.object, entity.source['key-fields']);
  const mappings = entity.mappings || {};

  const methodParams = Object.entries(keyTypes)
    .map(([key, type]) => `${type} ${key.charAt(0).toLowerCase()}${key.slice(1)}`)
    .join(', ');

  const queryFilters = Object.keys(keyTypes)
    .map((key) => {
      const alias = mappings[key] || key; // Use alias if available
      const paramName = `${key.charAt(0).toLowerCase()}${key.slice(1)}`;
      return `${alias} eq \${${paramName}}`;
    })
    .join(' and ');

  return `
namespace Api;

using Api.Logic.Abstractions;
using Api.Logic.Options;
using Api.Models;

public class ${className}Repository : ApiTableViewRepository<${className}>
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
}
`;
}

/**
 * Creates a repository for a stored procedure.
 */
async function createProcRepository(pool: any, entity: EntityDefinition, className: string): Promise<string> {
  const procParameters = await getProcParameterTypes(pool, entity.source.object);
  const methodParams = Object.entries(procParameters)
    .map(([param, type]) => `${type} ${param.charAt(0).toLowerCase()}${param.slice(1)}`)
    .join(', ');
  const parametersAssignment = Object.keys(procParameters)
    .map((param) => `{ "${param}", ${param.charAt(0).toLowerCase()}${param.slice(1)}.ToString() }`)
    .join(',\n                ');

  return `
namespace Api;

using Api.Logic.Abstractions;
using Api.Logic.Options;
using Api.Models;

public class ${className}Repository(Uri baseUri) 
    : ApiProcedureRepository<${className}>(baseUri)
{
    public async Task<${className}[]> ExecAsync(${methodParams})
    {
        var options = new ApiProcedureOptions
        {
            Method = ApiProcedureOptions.ApiMethod.GET,
            Parameters = new()
            {
                ${parametersAssignment}
            }
        };

        return await ExecuteProcedureAsync(options);
    }
}
`;
}