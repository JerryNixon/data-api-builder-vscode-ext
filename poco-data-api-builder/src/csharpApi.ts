import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { EntityDefinition } from './readConfig';

export async function createApiCs(
  genCsFolder: string,
  entities: Record<string, EntityDefinition>,
  selectedEntities: vscode.QuickPickItem[]
): Promise<void> {
  createApiCsFull(genCsFolder, entities, selectedEntities);
}

export async function createApiCsFull(
  genCsFolder: string,
  entities: Record<string, EntityDefinition>,
  selectedEntities: vscode.QuickPickItem[]
): Promise<void> {
  const apiFilePath = path.join(genCsFolder, 'Api.cs');

  let apiCode = `namespace Api;

using Api.Models;
using Api.Logic;

`;

  for (const selected of selectedEntities) {
    const entity = entities[selected.label];
    const repositoryName = `${selected.label}Repository`;
    const baseClass = entity.source.type === 'stored-procedure' ? 'ApiProcedureRepository' : 'ApiTableViewRepository';
    const pocoClassName = selected.label;

    // Begin repository class
    apiCode += `public class ${repositoryName} : ${baseClass}<${pocoClassName}>
{
    public ${repositoryName}(Uri baseUri) : base(baseUri) { }

`;

    // Add GetAsync method for tables/views
    if (entity.source.type !== 'stored-procedure') {
      const keyFields = entity.source['key-fields'] || ['id'];
      const methodParams = keyFields.map((key) => `int ${key}`).join(', ');
      const queryFilters = keyFields.map((key) => `${key} eq \${${key}}`).join(' and ');

      apiCode += `    public async Task<${pocoClassName}?> GetAsync(${methodParams})
    {
        var options = new ApiTableViewGetOptions
        {
            Filter = $"${queryFilters}"
        };
        return (await GetAsync(options)).FirstOrDefault();
    }
`;
    }

    // End repository class
    apiCode += `}

`;
  }

  // Write the Api.cs file
  fs.writeFileSync(apiFilePath, apiCode.trim());
}
