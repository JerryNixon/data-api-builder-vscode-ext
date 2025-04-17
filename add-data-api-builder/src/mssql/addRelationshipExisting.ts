import * as vscode from 'vscode';
import * as sql from 'mssql';
import * as path from 'path';
import * as process from 'process';
import { openConnection } from './querySql';
import { getConfiguredEntities, validateConfigPath } from '../readConfig';
import { getDatabaseRelationships } from './relationshipHelpers';
import { runCommand } from '../runTerminal';

export async function addRelationshipExisting(configPath: string, connectionString: string) {
  if (!validateConfigPath(configPath)) {
    return vscode.window.showErrorMessage("❌ Configuration file not found.");
  }

  const pool = await openConnection(connectionString);
  if (!pool) {
    return vscode.window.showErrorMessage("❌ Failed to connect to the database.");
  }

  const [dbRelationships, aliasMap, config] = await Promise.all([
    getDatabaseRelationships(pool, configPath),
    getConfiguredEntities(configPath),
    import(configPath)
  ]);

  const existingRelationships = extractExistingRelationships(config);
  const available = filterNewRelationships(dbRelationships, aliasMap, existingRelationships);
  if (!available.length) {
    return vscode.window.showInformationMessage("No valid 1:N relationships found.");
  }

  const selected = await promptUserForRelationships(available, aliasMap);
  if (!selected?.length) return;

  await Promise.all(
    selected.map(({ sourceAlias, targetAlias, relationship }) =>
      applyRelationship(
        configPath,
        sourceAlias,
        targetAlias,
        relationship.sourceColumnNames,
        relationship.targetColumnNames
      )
    )
  );

  vscode.window.showInformationMessage("✅ Relationships added successfully.");
}

function extractExistingRelationships(config: any) {
  return config.entities as {
    name: string;
    relationships?: {
      cardinality: string;
      target: string;
      sourceFields: string[];
      targetFields: string[];
    }[];
  }[];
}

function filterNewRelationships(
  dbRelationships: any[],
  aliasMap: Map<string, string>,
  entities: any[]
) {
  return dbRelationships.filter(({ sourceTableName, targetTableName, sourceColumnNames, targetColumnNames }) => {
    const sourceAlias = aliasMap.get(sourceTableName.toLowerCase());
    const targetAlias = aliasMap.get(targetTableName.toLowerCase());
    if (!sourceAlias || !targetAlias) return false;

    return !entities.some(entity =>
      entity.name === sourceAlias &&
      entity.relationships?.some(r =>
        r.cardinality === 'one' &&
        r.target === targetAlias &&
        r.sourceFields.join(',') === sourceColumnNames &&
        r.targetFields.join(',') === targetColumnNames
      )
    );
  });
}

async function promptUserForRelationships(valid: any[], aliasMap: Map<string, string>) {
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
  process.chdir(configDir);

  const forwardCmd = `dab update ${sourceAlias} ` +
                     `--relationship ${targetAlias} --cardinality one ` +
                     `--target.entity ${targetAlias} ` +
                     `--relationship.fields ${sourceColumns}:${targetColumns} ` +
                     `--config ${configFile}`;

  const reverseCmd = `dab update ${targetAlias} ` +
                     `--relationship ${sourceAlias} --cardinality many ` +
                     `--target.entity ${sourceAlias} ` +
                     `--relationship.fields ${targetColumns}:${sourceColumns} ` +
                     `--config ${configFile}`;

  await runCommand(forwardCmd);
  await runCommand(reverseCmd);
}
