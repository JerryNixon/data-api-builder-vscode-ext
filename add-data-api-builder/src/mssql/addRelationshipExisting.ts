import * as vscode from 'vscode';
import * as sql from 'mssql';
import * as path from 'path';
import { openConnection } from './querySql';
import {
  getConfiguredEntities,
  validateConfigPath,
  getExistingRelationships
} from '../readConfig';
import { getDatabaseRelationships } from './relationshipHelpers';
import { runCommand } from '../runTerminal';

interface Relationship {
  cardinality: string;
  target: string;
  sourceFields: string[];
  targetFields: string[];
}

interface EntityConfig {
  name: string;
  relationships?: Relationship[];
}

export async function addRelationshipExisting(configPath: string, connectionString: string) {
  if (!validateConfigPath(configPath)) {
    return vscode.window.showErrorMessage("❌ Configuration file not found.");
  }

  const pool = await openConnection(connectionString);
  if (!pool) {
    return vscode.window.showErrorMessage("❌ Failed to connect to the database.");
  }

  const dbRelationships = await getDatabaseRelationships(pool, configPath);
  const aliasMap = await getConfiguredEntities(configPath);
  const existingRelationships = await getExistingRelationships(configPath);

  const available = getFilteredRelationshipsFromDatabase(dbRelationships, aliasMap, existingRelationships);
  if (!available.length) {
    return vscode.window.showInformationMessage("No valid 1:N relationships found.");
  }

  const selected = await userSelectRelationships(available, aliasMap);
  if (!selected?.length) return;

  for (const item of selected) {
    const { sourceAlias, targetAlias, relationship } = item;
    const { sourceColumnNames, targetColumnNames } = relationship;

    await applyRelationship(
      configPath,
      sourceAlias,
      targetAlias,
      sourceColumnNames,
      targetColumnNames
    );
  }

  vscode.window.showInformationMessage("✅ Relationships added successfully.");
}

function arraysMatch(a: string[], b: string[]) {
  return a.length === b.length && a.every((val, i) => val === b[i]);
}

function getFilteredRelationshipsFromDatabase(
  dbRelationships: any[],
  aliasMap: Map<string, string>,
  entities: EntityConfig[]
) {
  return dbRelationships.filter((r: any) => {
    const sourceAlias = aliasMap.get(r.sourceTableName.toLowerCase());
    const targetAlias = aliasMap.get(r.targetTableName.toLowerCase());
    if (!sourceAlias || !targetAlias) return false;

    return !entities.some(entity =>
      entity.name === sourceAlias &&
      (entity.relationships)?.some((rel) =>
        rel.cardinality === 'one' &&
        rel.target === targetAlias &&
        arraysMatch(rel.sourceFields, r.sourceColumnNames.split(',')) &&
        arraysMatch(rel.targetFields, r.targetColumnNames.split(','))
      )
    );
  });
}

async function userSelectRelationships(valid: any[], aliasMap: Map<string, string>) {
  return await vscode.window.showQuickPick(
    valid.map(r => {
      const sourceAlias = aliasMap.get(r.sourceTableName.toLowerCase()) ?? r.sourceTableName;
      const targetAlias = aliasMap.get(r.targetTableName.toLowerCase()) ?? r.targetTableName;

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
}

async function applyRelationship(
  configPath: string,
  sourceAlias: string,
  targetAlias: string,
  sourceColumns: string,
  targetColumns: string
) {
  const configDir = path.dirname(configPath);
  const configFile = path.basename(configPath);

  const forwardCmd = `dab update ${sourceAlias} ` +
                     `--relationship ${targetAlias} --cardinality one ` +
                     `--target.entity ${targetAlias} ` +
                     `--relationship.fields ${sourceColumns}:${targetColumns} ` +
                     `--config "${configFile}"`;

  const reverseCmd = `dab update ${targetAlias} ` +
                     `--relationship ${sourceAlias} --cardinality many ` +
                     `--target.entity ${sourceAlias} ` +
                     `--relationship.fields ${targetColumns}:${sourceColumns} ` +
                     `--config "${configFile}"`;

  await runCommand(forwardCmd, { cwd: configDir });
  await runCommand(reverseCmd, { cwd: configDir });
}
