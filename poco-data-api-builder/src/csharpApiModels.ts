import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getTableAsPoco, getViewAsPoco, getProcedureAsPoco } from './mssql/querySql';
import { EntityDefinition } from './readConfig';

export async function createApiModelsCs(
  pool: any,
  entities: Record<string, EntityDefinition>,
  selectedEntities: vscode.QuickPickItem[],
  genCsFolder: string
): Promise<void> {
  const modelsFolderPath = path.join(genCsFolder, 'Api', 'Models');

  // Ensure the target directory exists
  fs.mkdirSync(modelsFolderPath, { recursive: true });

  const header = `
namespace Api.Models;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

`;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Generating POCOs', cancellable: false },
    async (progress) => {
      for (const selected of selectedEntities) {
        progress.report({ message: `Processing ${selected.label}...` });

        const entity = entities[selected.label];
        let poco = '';

        if (entity.source.type === 'table') {
          poco = await getTableAsPoco(pool, entity.source.object, entity.source['key-fields'], entity.mappings || {});
        } else if (entity.source.type === 'view') {
          poco = await getViewAsPoco(pool, entity.source.object, entity.source['key-fields'], entity.mappings || {});
        } else if (entity.source.type === 'stored-procedure') {
          poco = await getProcedureAsPoco(pool, entity.source.object, entity.mappings || {});
        } else {
          vscode.window.showWarningMessage(`Unsupported entity type: ${entity.source.type}`);
          continue;
        }

        // Add the header to the POCO
        const content = header + poco;

        // Write the POCO to a file
        const filePath = path.join(modelsFolderPath, `${selected.label}.cs`);
        fs.writeFileSync(filePath, content.trim());
      }
    }
  );
}
