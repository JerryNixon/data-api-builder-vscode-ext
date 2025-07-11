import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { EntityDefinition } from './readConfig';
import { getProcParameterTypes } from './mssql/querySql';

export async function createRepository(
  pool: any,
  genCsFolder: string,
  entities: Record<string, EntityDefinition>,
  selectedEntities: vscode.QuickPickItem[]
): Promise<void> {
  const apiFolderPath = path.join(genCsFolder, 'Library', 'Repositories');
  fs.mkdirSync(apiFolderPath, { recursive: true });

  const procedureMethods: string[] = [];

  for (const selected of selectedEntities) {
    const entity = entities[selected.label];

    if (!entity?.source?.type) continue;

    switch (entity.source.type) {
      case 'table':
      case 'view': {
        const code = createTableRepository(selected.label);
        const filePath = path.join(apiFolderPath, `${selected.label}Repository.cs`);
        fs.writeFileSync(filePath, code.trim());
        break;
      }
      case 'stored-procedure': {
        const method = await createProcedureMethod(pool, entity, selected.label);
        procedureMethods.push(method);
        break;
      }
      default:
        vscode.window.showWarningMessage(`Unsupported entity type: ${entity.source.type}`);
        break;
    }
  }

  if (procedureMethods.length > 0) {
    const filePath = path.join(apiFolderPath, `ProcedureRepository.cs`);
    const fullCode = wrapProcedureRepository(procedureMethods);
    fs.writeFileSync(filePath, fullCode.trim());
  }
}

/**
 * Creates a repository class for a table or view.
 */
function createTableRepository(entityName: string): string {
  const className = `${entityName}Repository`;
  const modelName = entityName;

  return `using Library.Models;
using Microsoft.DataApiBuilder.Rest;
using Microsoft.DataApiBuilder.Rest.Options;

namespace Library.Repositories;

public class ${className} : TableRepository<${modelName}>
{
    public ${className}(Uri entityUri, HttpClient? http = null) : base(new($"{entityUri.ToString().Trim('/')}/${modelName}"), http)
    {
        // empty
    }

    public Task<DabResponse<${modelName}, ${modelName}[]>> ReadAsync(GetOptions? getOptions = null, CancellationToken? cancellationToken = null)
    {
        return GetAsync(getOptions, cancellationToken);
    }

    public Task<DabResponse<${modelName}, ${modelName}[]>> ReadAsync(DabResponse<${modelName}, ${modelName}[]> previousResponse, GetOptions? getOptions = null, CancellationToken? cancellationToken = null)
    {
        return GetNextAsync(previousResponse, getOptions, cancellationToken);
    }

    public Task<DabResponse<${modelName}, ${modelName}>> CreateAsync(${modelName} item, PostOptions? postOptions = null, CancellationToken? cancellationToken = null)
    {
        return PostAsync(item, postOptions, cancellationToken);
    }

    public Task<DabResponse<${modelName}, ${modelName}>> UpdateAsync(${modelName} item, PutOptions? updateOptions = null, CancellationToken? cancellationToken = null)
    {
        return PutAsync(item, updateOptions, cancellationToken);
    }

    public Task<DabResponse<${modelName}, ${modelName}>> UpsertAsync(${modelName} item, PatchOptions? patchOptions = null, CancellationToken? cancellationToken = null)
    {
        return PatchAsync(item, patchOptions, cancellationToken);
    }

    public new Task<DabResponse> DeleteAsync(${modelName} item, DeleteOptions? deleteOptions = null, CancellationToken? cancellationToken = null)
    {
        return base.DeleteAsync(item, deleteOptions, cancellationToken);
    }
}`;
}

/**
 * Creates a method for a stored procedure inside ProcedureRepository.
 */
async function createProcedureMethod(pool: any, entity: EntityDefinition, procName: string): Promise<string> {
  const parameters = await getProcParameterTypes(pool, entity.source.object);

  const methodName = `Execute${procName}Async`;
  const args = Object.entries(parameters)
    .map(([p, t]) => `${t} ${p}`)
    .join(', ');

  const paramAssignments = Object.keys(parameters)
    .map(p => `["${p}"] = ${p}.ToString()`)
    .join(',\n                ');

  const className = `${procName}`;
  const httpMethod = entity.rest?.methods?.[0]?.toUpperCase() === 'GET' ? 'ExecuteHttpMethod.GET' : 'ExecuteHttpMethod.POST';

  return `
    public Task<DabResponse<${className}, ${className}[]>> ${methodName}(${args}, CancellationToken? cancellationToken = null, HttpClient? http = null)
    {
        var options = new ExecuteOptions
        {
            Method = ${httpMethod},
            Parameters = new()
            {
                ${paramAssignments}
            }
        };
        var httpClient = http ?? new();
        var uri = new Uri(baseUri.ToString().Trim('/') + '/' + nameof(${className}));
        var repository = new ProcedureRepository<${className}>(uri, http);
        return repository.ExecuteAsync(options, cancellationToken);
    }`;
}

/**
 * Wraps all stored procedure methods into a single ProcedureRepository class.
 */
function wrapProcedureRepository(methods: string[]): string {
  return `using Library.Models;
using Microsoft.DataApiBuilder.Rest;
using Microsoft.DataApiBuilder.Rest.Options;

namespace Library.Repositories;

public class ProcedureRepository(Uri baseUri)
{${methods.join('\n\n')}
}
`;
}
