import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getTableAsPoco, getViewAsPoco, getProcedureAsPoco } from './mssql/querySql';
import { EntityDefinition } from './readConfig';

export async function createModels(
  pool: any,
  entities: Record<string, EntityDefinition>,
  selectedEntities: vscode.QuickPickItem[],
  genCsFolder: string
): Promise<void> {
  const modelsFolderPath = path.join(genCsFolder, 'Library', 'Models');
  fs.mkdirSync(modelsFolderPath, { recursive: true });

  const header = `namespace Library.Models;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

`;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating POCOs',
      cancellable: false
    },
    async (progress: vscode.Progress<{ message?: string }>) => {
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

        const content = header + poco;
        const filePath = path.join(modelsFolderPath, `${selected.label}.cs`);
        fs.writeFileSync(filePath, content.trim());
      }
    }
  );
}
