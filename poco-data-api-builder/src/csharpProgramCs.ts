import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { EntityDefinition } from './readConfig';
import { getProcParameterTypes } from './mssql/querySql';

export async function createProgramCs(
  pool: any,
  genCsFolder: string,
  entities: Record<string, EntityDefinition>,
  selectedEntities: vscode.QuickPickItem[]
): Promise<void> {
  const filePath = path.join(genCsFolder, 'Client', 'Program.cs');

  const runtimeRestPath = entities[selectedEntities[0].label]?.runtimeRestPath?.replace(/^\/+|\/+$/g, '') || 'api';
  const header = `using Library.Repositories;

var baseUrl = new Uri("http://localhost:5000/${runtimeRestPath}/");`;

  const hasProcs = selectedEntities.some(e => entities[e.label].source.type === 'stored-procedure');
  const procLine = hasProcs ? `var procRepo = new ProcedureRepository(baseUrl);` : '';

  const blocks: string[] = [];

  for (const selected of selectedEntities) {
    const name = selected.label;
    const entity = entities[name];
    const varName = name.charAt(0).toLowerCase() + name.slice(1);

    if (entity.source.type === 'stored-procedure') {
      const parameters = await getProcParameterTypes(pool, entity.source.object);
      const args = Object.entries(parameters)
        .map(([key, type]) => getSampleArgument(key, type))
        .join(', ');

      blocks.push(`var ${varName}Response = await procRepo.Execute${name}Async(${args});
foreach (var result in ${varName}Response.Result)
{
    Console.WriteLine("${name}: " + result);
}`);
    } else {
      blocks.push(`var ${varName}Repo = new ${name}Repository(baseUrl);
if (!await ${varName}Repo.IsAvailableAsync())
{
    Console.WriteLine("${name} repository is not available. Is DAB started?");
    Console.ReadKey();
    return;
}
var ${varName}Response = await ${varName}Repo.ReadAsync();
foreach (var item in ${varName}Response.Result)
{
    Console.WriteLine("${name}: " + item);
}`);
    }
  }

  const finalCode = [header, procLine, ...blocks].filter(Boolean).join('\n\n');
  fs.writeFileSync(filePath, finalCode + '\n\nConsole.ReadKey();');
}

function getSampleArgument(name: string, type: string): string {
  const t = type.toLowerCase();
  if (t.includes('int')) return '123';
  if (t.includes('decimal') || t.includes('double') || t.includes('float')) return '123.45';
  if (t.includes('bool')) return 'true';
  if (t.includes('datetime')) return 'DateTime.Now';
  if (t.includes('guid')) return 'Guid.NewGuid()';
  return `"${name}"`;
}
