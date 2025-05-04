import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition, DbColumn } from '../types';
import { toPascalCase, sanitizeIdentifier, lowerFirst } from '../helpers';
import { getClassName, shouldGenerateFor } from '../helpers';

export async function generateMcpModels(
  entities: EntityDefinition[],
  selectedAliases: string[],
  configPath: string
): Promise<void> {
  const baseDir = path.dirname(configPath);
  const modelsFolder = path.join(baseDir, 'Mcp', 'Mcp.Server', 'Models');
  fs.mkdirSync(modelsFolder, { recursive: true });

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Generating MCP POCOs', cancellable: false },
    async (progress) => {
      for (const entity of entities) {
        if (!shouldGenerateFor(entity, selectedAliases)) continue;

        const className = getClassName(entity);
        progress.report({ message: `Generating ${className}...` });

        const fileContent = buildModelFile(entity, className);
        const filePath = path.join(modelsFolder, `${className}.cs`);
        fs.writeFileSync(filePath, fileContent.trim(), 'utf-8');
      }
    }
  );
}

function buildModelFile(entity: EntityDefinition, className: string): string {
  const columns = entity.dbMetadata?.columns ?? [];
  const properties = columns
    .map((col: DbColumn) => {
      const originalName = sanitizeIdentifier(col.name);
      const aliasName = sanitizeIdentifier(col.alias);
      const propertyName = toPascalCase(aliasName);
      const jsonName = originalName !== aliasName ? aliasName : originalName;
      return `        [JsonPropertyName("${jsonName}")]
        public ${col.netType} ${propertyName} { get; set; } = default!;`;
    })
    .join('\n\n');

  const restPath = (entity.rest?.path || '').replace(/^\/|\/$/g, '');
  const repoType = entity.source?.type === 'stored-procedure'
    ? 'ProcedureRepository'
    : 'TableRepository';

  return `#nullable enable

namespace Mcp.Models
{
    using System.Text.Json.Serialization;

    public class ${className}
    {
${properties}
    }
}
    
namespace Mcp
{
    using Mcp.Models;
    using Microsoft.DataApiBuilder.Rest;

    public static partial class ServiceLocator
    {
        private readonly static Lazy<${repoType}<${className}>> ${lowerFirst(className)}Repository =
            new(() => new(new(string.Format(BASE_URL, "${restPath}"))));
        public static ${repoType}<${className}> ${className}Repository => ${lowerFirst(className)}Repository.Value;
    }
}`;
}
