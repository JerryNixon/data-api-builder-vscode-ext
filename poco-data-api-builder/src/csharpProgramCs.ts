import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EntityDefinition } from './readConfig';

export async function createProgramCs(
    genCsFolder: string,
    selectedEntities: vscode.QuickPickItem[],
    entities: Record<string, EntityDefinition>
): Promise<void> {
    const programFilePath = path.join(genCsFolder, 'Program.cs');

    if (selectedEntities.length === 0) {
        vscode.window.showWarningMessage('No entities selected for Program.cs generation.');
        return;
    }

    const programCodeParts: string[] = [];

    for (const selected of selectedEntities) {
        const entity = selected.label;
        const entityDef = entities[entity];
        const restPath = entityDef.restPath?.replace(/^\/+/g, '') || entity;
        const camelCaseEntity = `${entity.charAt(0).toLowerCase()}${entity.slice(1)}`;

        if (entityDef.type === 'stored-procedure') {
            const parameters = entityDef.source.parameters
                ? Object.entries(entityDef.source.parameters)
                    .map(([key, type]) => {
                        const defaultValue = type === 'number'
                            ? 'default(int)'
                            : type === 'boolean'
                                ? 'default(bool)'
                                : 'default';
                        return `    {"${key}", $"{${defaultValue}}"}`;
                    })
                    .join(",\n        ")
                : "";

            const parametersCode = parameters
                ? `Parameters = new Dictionary<string, string>\n        {\n        ${parameters}\n        }`
                : "";

            programCodeParts.push(`var ${camelCaseEntity}Uri = new Uri($"{baseUrl}${restPath}");
var ${camelCaseEntity}Repository = new Api.${entity}Repository(${camelCaseEntity}Uri);
var ${camelCaseEntity}Items = await ${camelCaseEntity}Repository.ExecuteProcedureAsync(
    options: new()
    {
        Method = Api.Logic.ApiStoredProcedureExecOptions.ApiMethod.GET,
        ${parametersCode}
    }
);
Console.WriteLine($"\\n{${camelCaseEntity}Items.Length} item(s) returned from /${entity}.");
foreach (var item in ${camelCaseEntity}Items)
{
    Console.WriteLine(item.ToString());
}`);
        } else {
            programCodeParts.push(`var ${camelCaseEntity}Uri = new Uri($"{baseUrl}${restPath}");
var ${camelCaseEntity}Repository = new Api.${entity}Repository(${camelCaseEntity}Uri);
var ${camelCaseEntity}Items = await ${camelCaseEntity}Repository.GetAsync(options: new() { First = 1 });
Console.WriteLine($"\\n{${camelCaseEntity}Items.Length} item(s) returned from /${entity}.");
foreach (var item in ${camelCaseEntity}Items)
{
    Console.WriteLine(item.ToString());
}`);
        }
    }

    const apiCheckCode = `
if (!await Api.Logic.Utility.IsApiAvailableAsync("http://localhost:5000"))
{
    var message = "API is not available. Is Data API builder started?";
    System.Diagnostics.Debug.WriteLine(message);
    Console.WriteLine(message);
    return;
}

var baseUrl = "http://localhost:5000/api/";`;

    const programCode = `${apiCheckCode}

${programCodeParts.join('\n\n')}

Console.ReadKey();`;

    fs.writeFileSync(programFilePath, programCode);
}