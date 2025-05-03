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

  const header = `#nullable enable

namespace Mcp.Models;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

`;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Generating MCP POCOs', cancellable: false },
    async (progress) => {
      for (const entity of entities) {
        const meta = entity.dbMetadata;
        if (!meta) {
          continue;
        }

        const classNameRaw = selectedAliases.find(alias =>
          meta.objectName.toLowerCase().includes(alias.toLowerCase())
        ) || meta.objectName;

        const className = toPascalCase(sanitizeIdentifier(classNameRaw));
        progress.report({ message: `Generating ${className}...` });

        const properties = meta.columns
          .map((col: DbColumn) => {
            const originalName = sanitizeIdentifier(col.name);
            const aliasName = sanitizeIdentifier(col.alias);
            const propertyName = toPascalCase(aliasName);
            const jsonName = originalName !== aliasName ? aliasName : originalName;
            return `    [JsonPropertyName("${jsonName}")]\n    public ${col.netType} ${propertyName} { get; set; } = default!;`;
          })
          .join('\n\n');

        const content = `${header}public class ${className}\n{\n${properties}\n}`;
        const filePath = path.join(modelsFolder, `${className}.g.cs`);
        fs.writeFileSync(filePath, content.trim(), 'utf-8');
      }
    }
  );
}
