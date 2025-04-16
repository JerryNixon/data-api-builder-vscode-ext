import * as vscode from 'vscode';
import * as sql from 'mssql';
import * as path from 'path';
import * as process from 'process';
import { openConnection } from './querySql';
import {
  getConfiguredEntities,
  validateConfigPath
} from '../readConfig';
import {
  getDatabaseRelationships
} from './relationshipHelpers';
import { runCommand } from '../runTerminal';

/**
 * Adds one-to-many or one-to-one relationships based on foreign keys.
 * Only includes relationships between configured entities (by alias).
 */
export async function addRelationshipExisting(configPath: string, connectionString: string) {
  if (!validateConfigPath(configPath)) {
    vscode.window.showErrorMessage("❌ Configuration file not found.");
    return;
  }

  const pool = await openConnection(connectionString);
  if (!pool) {
    vscode.window.showErrorMessage("❌ Failed to connect to the database.");
    return;
  }

  const [dbRelationships, aliasMap] = await Promise.all([
    getDatabaseRelationships(pool, configPath),
    getConfiguredEntities(configPath)
  ]);

  const valid = dbRelationships.filter(r => {
    const sourceKey = r.sourceTableName.toLowerCase();
    const targetKey = r.targetTableName.toLowerCase();
    return aliasMap.has(sourceKey) && aliasMap.has(targetKey);
  });

  if (!valid.length) {
    vscode.window.showInformationMessage("No valid 1:N relationships found.");
    return;
  }

  const selected = await vscode.window.showQuickPick(
    valid.map(r => {
      const sourceKey = r.sourceTableName.toLowerCase();
      const targetKey = r.targetTableName.toLowerCase();
      const sourceAlias = aliasMap.get(sourceKey) ?? r.sourceTableName;
      const targetAlias = aliasMap.get(targetKey) ?? r.targetTableName;
      
      return {
        label: `${sourceAlias} → ${targetAlias}`,
        description: `1:N relationship`,
        detail: `Linking: ${sourceAlias}.${r.sourceColumnNames} → ${targetAlias}.${r.targetColumnNames}`,
        relationship: r,
        sourceAlias,
        targetAlias
      };
    }),
    {
      title: "Select one-to-many relationships to add",
      canPickMany: true
    }
  );

  if (!selected || !selected.length) { return; }

  for (const item of selected) {
    const { sourceAlias, targetAlias } = item;
    const { sourceColumnNames, targetColumnNames } = item.relationship;
    await applyRelationship(configPath, sourceAlias, targetAlias, sourceColumnNames, targetColumnNames);
  }

  vscode.window.showInformationMessage("✅ Relationships added successfully.");
}

/**
 * Executes the CLI command to add a one-to-many relationship.
 */
async function applyRelationship(
  configPath: string,
  sourceAlias: string,
  targetAlias: string,
  sourceColumns: string,
  targetColumns: string
) {
  const configDir = path.dirname(configPath);
  const configFile = path.basename(configPath);
  process.chdir(configDir);

  const cmd = `dab update ${sourceAlias} ` +
    `--relationship ${targetAlias} --cardinality one ` +
    `--target.entity ${targetAlias} ` +
    `--relationship.fields ${sourceColumns}:${targetColumns} ` +
    `--config ${configFile}`;

  await runCommand(cmd);
}
