import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition } from '../types';
import { getClassName, shouldGenerateFor } from '../helpers';

export async function generateMcpClientExtensions(
  entities: EntityDefinition[],
  selectedAliases: string[],
  configPath: string
): Promise<void> {
  const baseDir = path.dirname(configPath);
  const clientFolder = path.join(baseDir, 'Mcp', 'Mcp.Client');
  fs.mkdirSync(clientFolder, { recursive: true });

  for (const entity of entities) {
    if (!shouldGenerateFor(entity, selectedAliases)) continue;
    if (entity.source.type === 'stored-procedure') continue;

    const modelType = getClassName(entity);
    const fileName = `${modelType}Client.cs`;
    const filePath = path.join(clientFolder, fileName);

    const fileContent = `using System.Text.Json;
using ModelContextProtocol.Client;

public static partial class McpClientExtensions
{
    public static async Task<List<${modelType}>> Get${modelType}Async(this IMcpClient client, string? filter = null)
    {
        var parameters = new Dictionary<string, object?>
        {
            ["filter"] = filter
        };

        var result = await client.CallToolAsync("Get${modelType}", parameters);
        if (result.Content?.FirstOrDefault()?.Text is string json)
        {
            return JsonSerializer.Deserialize<List<${modelType}>>(json) ?? [];
        }
        return [];
    }

    public static async Task<${modelType}> Create${modelType}Async(this IMcpClient client, ${modelType} input)
    {
        var parameters = new Dictionary<string, object?>
        {
            ["item"] = input
        };

        var result = await client.CallToolAsync("Create${modelType}", parameters);
        if (result.Content?.FirstOrDefault()?.Text is string json)
        {
            return JsonSerializer.Deserialize<${modelType}>(json) ?? null!;
        }
        return null!;
    }

    public static async Task<${modelType}> Update${modelType}Async(this IMcpClient client, ${modelType} input)
    {
        var parameters = new Dictionary<string, object?>
        {
            ["item"] = input
        };

        var result = await client.CallToolAsync("Update${modelType}", parameters);
        if (result.Content?.FirstOrDefault()?.Text is string json)
        {
            return JsonSerializer.Deserialize<${modelType}>(json) ?? null!;
        }
        return null!;
    }

    public static async Task<bool> Delete${modelType}Async(this IMcpClient client, ${modelType} input)
    {
        var parameters = new Dictionary<string, object?>
        {
            ["item"] = input
        };

        var result = await client.CallToolAsync("Delete${modelType}", parameters);
        if (result.Content?.FirstOrDefault()?.Text is string json)
        {
            return JsonSerializer.Deserialize<bool>(json);
        }
        return false;
    }
}
`;

    fs.writeFileSync(filePath, fileContent.trim(), 'utf-8');
  }
}
