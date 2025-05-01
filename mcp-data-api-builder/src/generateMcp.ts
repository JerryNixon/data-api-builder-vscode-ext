import * as vscode from 'vscode';
import { validateConfigPath } from './readConfig';
import { DbEntity, EntityDefinition } from './types';

/**
 * Prompts user to select from configured entities and initiates MCP generation.
 * @param configPath Path to the config file used to populate the entity list.
 * @param entityMap All entities from the config file.
 * @param dbEntities Metadata-enriched entities from the SQL database.
 */
export async function generateMcp(
  entityMap: Record<string, EntityDefinition>,
  dbEntities: DbEntity[],
  configPath: string
): Promise<void> {
  if (!validateConfigPath(configPath)) return;

  const aliases = Object.keys(entityMap);
  if (aliases.length === 0) {
    vscode.window.showWarningMessage('No entities found in the configuration.');
    return;
  }

  const selected = await vscode.window.showQuickPick(aliases, {
    canPickMany: true,
    title: 'Generate MCP Tools',
    placeHolder: 'Select entities to include in the MCP server'
  });

  if (!selected || selected.length === 0) {
    vscode.window.showInformationMessage('No entities selected. Operation canceled.');
    return;
  }

  const filtered = dbEntities.filter(e => selected.includes(getAliasForObjectName(e.objectName, entityMap)));
  vscode.window.showInformationMessage(`Generating MCP for: ${selected.join(', ')}`);

  // TODO: Replace with actual code generation logic
  console.log('MCP Generation Target(s):', filtered);
}

/**
 * Finds the entity alias associated with a given object name.
 */
function getAliasForObjectName(
  objectName: string,
  entityMap: Record<string, EntityDefinition>
): string {
  const match = Object.entries(entityMap).find(
    ([_, def]) => def.source.normalizedObjectName === objectName.toLowerCase()
  );
  return match?.[0] || objectName;
}