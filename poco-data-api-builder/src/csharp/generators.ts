import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition } from '../readConfig';

export interface ColumnMetadata {
  name: string;
  type: string;
  isKey: boolean;
  jsonName: string;
}

export interface EntityInfo {
  name: string;
  entityDef: EntityDefinition;
  columns: ColumnMetadata[];
  entityType: 'table' | 'view' | 'stored-procedure';
}

// C# reserved keywords that cannot be used as identifiers
const CSHARP_KEYWORDS = new Set([
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
  'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
  'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
  'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
  'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
  'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private',
  'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed',
  'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch',
  'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked',
  'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
  // Contextual keywords that should also be avoided
  'add', 'alias', 'ascending', 'async', 'await', 'by', 'descending', 'dynamic',
  'equals', 'from', 'get', 'global', 'group', 'into', 'join', 'let', 'nameof',
  'on', 'orderby', 'partial', 'remove', 'select', 'set', 'value', 'var',
  'when', 'where', 'yield'
]);

export function getCsharpPropertyName(name: string): string {
  // Remove invalid characters, keeping only letters, numbers, and underscores
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');

  // Handle empty result
  if (!sanitized) {
    sanitized = 'Property';
  }

  // If starts with a number, prefix with underscore
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  // PascalCase: capitalize first letter
  sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);

  // Handle C# reserved keywords by prefixing with @
  if (CSHARP_KEYWORDS.has(sanitized.toLowerCase())) {
    sanitized = '@' + sanitized;
  }

  return sanitized;
}

// Types that are already nullable (reference types or already have ?)
const ALREADY_NULLABLE_TYPES = new Set(['string?', 'byte[]', 'object']);

export function mapSqlTypeToCSharp(sqlType: string, isNullable: boolean = false): string {
  const typeMapping: { [key: string]: string } = {
    "varchar": "string",
    "nvarchar": "string",
    "char": "string",
    "nchar": "string",
    "text": "string",
    "ntext": "string",
    "xml": "string",
    "datetime": "DateTime",
    "smalldatetime": "DateTime",
    "datetime2": "DateTime",
    "datetimeoffset": "DateTimeOffset",
    "date": "DateTime",
    "time": "TimeSpan",
    "bit": "bool",
    "tinyint": "byte",
    "smallint": "short",
    "int": "int",
    "bigint": "long",
    "decimal": "decimal",
    "numeric": "decimal",
    "money": "decimal",
    "smallmoney": "decimal",
    "real": "float",
    "float": "double",
    "uniqueidentifier": "Guid",
    "varbinary": "byte[]",
    "binary": "byte[]",
    "image": "byte[]",
  };

  let csharpType = typeMapping[sqlType.toLowerCase()] || "object";

  // Add nullable marker for value types if column is nullable
  if (isNullable && !ALREADY_NULLABLE_TYPES.has(csharpType)) {
    // Reference types (string, byte[], object) use ?
    // Value types use ?
    csharpType += '?';
  } else if (csharpType === 'string' || csharpType === 'byte[]') {
    // Reference types are always nullable in C#, use ? for clarity
    csharpType += '?';
  }

  return csharpType;
}

export function generateModel(entityInfo: EntityInfo): string {
  const { name, columns, entityType } = entityInfo;

  const parameters = columns.map(col => {
    const attributes: string[] = [];
    if (col.isKey) {
      attributes.push('property: Key');
    }
    attributes.push(`property: JsonPropertyName("${col.jsonName}")`);
    return `[${attributes.join('][')}] ${col.type} ${col.name}`;
  });

  const isProc = entityType === 'stored-procedure';

  if (isProc) {
    return `namespace Models;

public record ${name}(
    ${parameters.join(',\n    ')}
);
`;
  }

  const nonKeyProps = columns.filter(c => !c.isKey).map(c => c.name);

  // Handle empty non-key properties - return this instead of empty anonymous object
  if (nonKeyProps.length === 0) {
    return `namespace Models;

public record ${name}(
    ${parameters.join(',\n    ')}
);
`;
  }

  const withoutKeysBody = nonKeyProps.join(',\n        ');

  return `namespace Models;

public record ${name}(
    ${parameters.join(',\n    ')}
)
{
    public object WithoutKeys() => new
    {
        ${withoutKeysBody}
    };
};
`;
}

export function generateTableRepository(entityName: string): string {
  return `namespace Repositories;

public sealed class ${entityName}Repository(string baseUrl, string apiPath, string? x_ms_api_role = null, HttpClient? httpClient = null)
#pragma warning disable CS9107
    : RepositoryBase<${entityName}>(baseUrl: baseUrl, apiPath: apiPath, entityPath: "${entityName}", x_ms_api_role: x_ms_api_role, httpClient: httpClient), ITableRepository<${entityName}>
#pragma warning restore CS9107
{
    public async Task<${entityName}> CreateAsync(${entityName} item)
    {
        var result = await CreateAsync(entity: item, cancellationToken: new());
        result.EnsureSuccessfulResult();
        return result.Results.Single();
    }

    public async Task<${entityName}[]> ReadAsync(int? first = null, string? select = null, string? filter = null, string? sort = null, string? nextPage = null)
    {
        var result = await ReadAsync(first: first, select: select, filter: filter, sort: sort, nextPage: nextPage, cancellationToken: new());
        result.EnsureSuccessfulResult();
        return result.Results;
    }

    public async Task<${entityName}> UpdateAsync(${entityName} item, string[]? fields = null)
    {
        var result = await UpdateAsync(entity: item, fields: fields, cancellationToken: new());
        result.EnsureSuccessfulResult();
        return result.Results.Single();
    }

    public async Task DeleteAsync(${entityName} item)
    {
        var result = await DeleteAsync(entity: item, cancellationToken: new());
        result.EnsureSuccessfulResult();
    }
}
`;
}

export function generateProcedureRepository(entityName: string, parameters: { name: string; type: string }[], httpMethods: string[]): string {
  // Determine the default HTTP method (first in list, or GET if none specified)
  const defaultMethod = httpMethods.length > 0 ? httpMethods[0].toUpperCase() : 'GET';
  const methodType = `HttpMethod.${defaultMethod.charAt(0).toUpperCase()}${defaultMethod.slice(1).toLowerCase()}`;

  const paramList = parameters.map(p => `${p.type} ${p.name}`).join(', ');
  const paramTuples = parameters.map(p => `("${p.name}", ${p.name})`).join(', ');

  // Generate convenience methods for each configured HTTP method
  const convenienceMethods = httpMethods.map(method => {
    const methodName = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
    const httpMethodType = `HttpMethod.${methodName}`;
    return `
    public Task<${entityName}[]> Execute${methodName}Async(${paramList.length > 0 ? paramList + ', ' : ''}CancellationToken cancellationToken = default)
    {
        return ExecuteAsync(${parameters.map(p => p.name).join(', ')}${parameters.length > 0 ? ', ' : ''}${httpMethodType}, cancellationToken);
    }`;
  }).join('\n');

  return `namespace Repositories;

public sealed class ${entityName}Repository(string baseUrl, string apiPath, string? x_ms_api_role = null, HttpClient? httpClient = null)
#pragma warning disable CS9107
    : RepositoryBase<${entityName}>(baseUrl: baseUrl, apiPath: apiPath, entityPath: "${entityName}", x_ms_api_role: x_ms_api_role, httpClient: httpClient), IProcedureRepository<${entityName}>
#pragma warning restore CS9107
{
    public async Task<${entityName}[]> ExecuteAsync(${paramList.length > 0 ? paramList + ', ' : ''}HttpMethod? method = null, CancellationToken cancellationToken = default)
    {
        var result = await ExecuteAsync(
            method: method ?? ${methodType},
            operation: "${entityName}",
            parameters: [${paramTuples}],
            cancellationToken: cancellationToken);
        result.EnsureSuccessfulResult();
        return result.Results;
    }

    public async Task<${entityName}[]> ExecuteAsync(HttpMethod method, params (string name, object? value)[] parameters)
    {
        var result = await base.ExecuteAsync(method, "${entityName}", parameters);
        result.EnsureSuccessfulResult();
        return result.Results;
    }
${convenienceMethods}
}
`;
}

export function generateRestRepository(tableViewEntities: string[], procEntities: string[]): string {
  const allEntities = [...tableViewEntities, ...procEntities];

  const properties = allEntities.map(e => {
    const isTableOrView = tableViewEntities.includes(e);
    const interfaceType = isTableOrView ? `ITableRepository<${e}>` : `IProcedureRepository<${e}>`;
    return `    public ${interfaceType} ${e}Repository { get; } = new ${e}Repository(baseUrl, apiPath, x_ms_api_role, HttpClient);`;
  });

  return `namespace Repositories;

public class RestRepository(string baseUrl, string apiPath = "api", string? x_ms_api_role = null)
{
    public static HttpClient HttpClient { get; set; } = new();

${properties.join('\n')}

    public Task<bool> IsAvailableAsync(int timeoutInSeconds = 30, HttpClient? httpClient = null)
    {
        return new Uri(baseUrl).IsAvailableAsync(timeoutInSeconds, httpClient);
    }
}
`;
}

export function generateProgramCs(tableViewEntities: string[], procEntities: string[], apiPath: string): string {
  const tableViewCalls = tableViewEntities.map(e => `    await PrintAsync(restRepository.${e}Repository);`);

  const procCalls = procEntities.map(e => `    // await PrintProcAsync(restRepository.${e}Repository);`);

  return `using Repositories;
using Repositories.Rest;

var baseUrl = new Uri("http://localhost:5000/").ToString();

var restRepository = new RestRepository(baseUrl: baseUrl, apiPath: "${apiPath}", x_ms_api_role: null);

// Wait for DAB to be available (with retry prompt)
while (!await restRepository.IsAvailableAsync())
{
    Console.WriteLine($"{baseUrl} is not available. Is DAB started?");
    Console.WriteLine("Press [R] to retry, or any other key to exit...");
    
    var key = Console.ReadKey(intercept: true);
    if (key.Key != ConsoleKey.R)
    {
        return;
    }
    Console.WriteLine("Retrying...");
}

Console.WriteLine($"Connected to {baseUrl}");
Console.WriteLine();

${tableViewCalls.join('\n')}
${procCalls.length > 0 ? '\n    // Stored procedure calls (uncomment to use):\n' + procCalls.join('\n') : ''}

Console.WriteLine();
Console.WriteLine("Press any key to exit...");
Console.ReadKey();

static async Task PrintAsync<T>(ITableRepository<T> repository)
{
    var items = await repository.ReadAsync();
    foreach (var item in items)
    {
        Console.WriteLine(item);
    }
}

// static async Task PrintProcAsync<T>(IProcedureRepository<T> repository)
// {
//     var items = await repository.ExecuteAsync(HttpMethod.Get);
//     foreach (var item in items)
//     {
//         Console.WriteLine(item);
//     }
// }
`;
}

export interface WebEntityInfo {
  name: string;
  type: 'table' | 'view' | 'stored-procedure';
}

export function generateWebProgramCs(entities: WebEntityInfo[], apiPath: string): string {
  return `var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Serve static files (wwwroot/index.html calls DAB directly)
app.UseDefaultFiles();
app.UseStaticFiles();

Console.WriteLine("Web Explorer running at http://localhost:5001");
Console.WriteLine("Make sure DAB is running: dab start");
Console.WriteLine("Then open http://localhost:5001 in your browser");

app.Run("http://localhost:5001");
`;
}

export function generateWebIndexHtml(entities: WebEntityInfo[], apiPath: string, templateHtml: string): string {
  const entitiesJson = JSON.stringify(entities.map(e => ({
    name: e.name,
    type: e.type,
    icon: e.type === 'table' ? '📋' : e.type === 'view' ? '👁️' : '⚙️'
  })));

  return templateHtml
    .replace("'{{DAB_BASE_URL}}'", "'http://localhost:5000/'")
    .replace("'{{API_PATH}}'", `'${apiPath}'`)
    .replace('{{ENTITIES_JSON}}', entitiesJson);
}

export function generateSolution(configFileName: string): string {
  const modelsGuid = generateGuid();
  const reposGuid = generateGuid();
  const clientGuid = generateGuid();
  const webGuid = generateGuid();
  const dabFolderGuid = generateGuid();

  return `Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
VisualStudioVersion = 17.0.31903.59
MinimumVisualStudioVersion = 10.0.40219.1
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Models", "Models\\Models.csproj", "{${modelsGuid}}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Repositories", "Repositories\\Repositories.csproj", "{${reposGuid}}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Client", "Client\\Client.csproj", "{${clientGuid}}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Web", "Web\\Web.csproj", "{${webGuid}}"
EndProject
Project("{2150E333-8FDC-42A3-9474-1A3956D46DE8}") = "DataApiBuilder", "DataApiBuilder", "{${dabFolderGuid}}"
\tProjectSection(SolutionItems) = preProject
\t\t..\\${configFileName} = ..\\${configFileName}
\tEndProjectSection
EndProject
Global
\tGlobalSection(SolutionConfigurationPlatforms) = preSolution
\t\tDebug|Any CPU = Debug|Any CPU
\t\tRelease|Any CPU = Release|Any CPU
\tEndGlobalSection
\tGlobalSection(ProjectConfigurationPlatforms) = postSolution
\t\t{${modelsGuid}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
\t\t{${modelsGuid}}.Debug|Any CPU.Build.0 = Debug|Any CPU
\t\t{${modelsGuid}}.Release|Any CPU.ActiveCfg = Release|Any CPU
\t\t{${modelsGuid}}.Release|Any CPU.Build.0 = Release|Any CPU
\t\t{${reposGuid}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
\t\t{${reposGuid}}.Debug|Any CPU.Build.0 = Debug|Any CPU
\t\t{${reposGuid}}.Release|Any CPU.ActiveCfg = Release|Any CPU
\t\t{${reposGuid}}.Release|Any CPU.Build.0 = Release|Any CPU
\t\t{${clientGuid}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
\t\t{${clientGuid}}.Debug|Any CPU.Build.0 = Debug|Any CPU
\t\t{${clientGuid}}.Release|Any CPU.ActiveCfg = Release|Any CPU
\t\t{${clientGuid}}.Release|Any CPU.Build.0 = Release|Any CPU
\t\t{${webGuid}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
\t\t{${webGuid}}.Debug|Any CPU.Build.0 = Debug|Any CPU
\t\t{${webGuid}}.Release|Any CPU.ActiveCfg = Release|Any CPU
\t\t{${webGuid}}.Release|Any CPU.Build.0 = Release|Any CPU
\tEndGlobalSection
\tGlobalSection(SolutionProperties) = preSolution
\t\tHideSolutionNode = FALSE
\tEndGlobalSection
EndGlobal
`;
}

function generateGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16).toUpperCase();
  });
}
