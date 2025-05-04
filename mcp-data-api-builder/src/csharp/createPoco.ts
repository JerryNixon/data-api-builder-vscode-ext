import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition, DbColumn } from '../types';
import { toPascalCase, sanitizeIdentifier } from '../helpers';

/**
 * Writes .cs model files based on enriched entity metadata.
 * @param entities - The list of EntityDefinitions enriched with dbMetadata.
 * @param selectedAliases - The aliases selected by the user.
 * @param configPath - The path to the DAB config file that was right-clicked.
 */
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
        const meta = entity.dbMetadata;
        if (!meta) continue;

        const rawName = entity.source?.object || meta.objectName;
        const classNameRaw = rawName.split('.').pop() || rawName;
        const className = toPascalCase(sanitizeIdentifier(classNameRaw));
        progress.report({ message: `Generating ${className}...` });

        const properties = meta.columns
          .map((col: DbColumn) => {
            const originalName = sanitizeIdentifier(col.name);
            const aliasName = sanitizeIdentifier(col.alias);
            const propertyName = toPascalCase(aliasName);
            const jsonName = originalName !== aliasName ? aliasName : originalName;
            return `        [JsonPropertyName("${jsonName}")]\n        public ${col.netType} ${propertyName} { get; set; } = default!;`;
          })
          .join('\n\n');

        const fileContent = `#nullable enable

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
    using Microsoft.DataApiBuilder.Rest.Abstractions;

    public static partial class ServiceLocator
    {
        public readonly static Lazy<TableRepository<${className}>> ${className}Repository =
            new(() => new(new(string.Format(BASE_URL, "${(entity.rest?.path || '').replace(/^\/|\/$/g, '')}"))));
    }
}`;

        const filePath = path.join(modelsFolder, `${className}.cs`);
        fs.writeFileSync(filePath, fileContent.trim(), 'utf-8');
      }
    }
  );
}
