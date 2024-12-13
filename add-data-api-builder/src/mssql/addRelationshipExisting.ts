import * as vscode from 'vscode';
import * as sql from 'mssql';
import { openConnection } from './querySql';
import {
  getConfiguredEntities,
  getDatabaseRelationships,
  filterValidRelationships,
  isRelationshipInConfig,
  addRelationshipToConfig,
  chooseMultipleRelationships,
} from './relationshipHelpers';

/**
 * Adds relationships from existing database definitions to the configuration.
 * @param configPath - The path to the configuration file.
 * @param connectionString - The SQL Server connection string.
 */
export async function addRelationshipExisting(configPath: string, connectionString: string) {
  let pool: sql.ConnectionPool | undefined;

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Loading Relationship Metadata...',
        cancellable: false,
      },
      async (progress) => {
        // Step 1: Connect to the database
        progress.report({ message: 'Connecting to the database...' });
        pool = await openConnection(connectionString);
        if (!pool) {
          throw new Error('Failed to connect to the database.');
        }

        // Step 2: Fetch all relationships from the database
        progress.report({ message: 'Fetching all relationships...' });
        const allRelationships = await getDatabaseRelationships(pool, configPath);
        if (allRelationships.length === 0) {
          throw new Error('No relationships found in the database.');
        }

        // Step 3: Fetch entities from the configuration file
        progress.report({ message: 'Fetching entities from the configuration...' });
        const entities = await getConfiguredEntities(configPath);
        if (entities.length === 0) {
          throw new Error('No entities found in the configuration file.');
        }

        // Step 4: Filter valid relationships based on the configuration
        progress.report({ message: 'Filtering valid relationships...' });
        const validRelationships = await filterValidRelationships(entities, configPath, allRelationships);
        if (validRelationships.length === 0) {
          throw new Error('No valid relationships found in the database.');
        }

        // Step 5: Allow user to choose multiple relationships
        const selectedRelationships = await chooseMultipleRelationships(validRelationships);
        if (!selectedRelationships || selectedRelationships.length === 0) {
          vscode.window.showInformationMessage('No relationships selected.');
          return;
        }

        // Step 6: Add selected relationships to the configuration
        for (const rel of selectedRelationships) {
          if (!(await isRelationshipInConfig(configPath, rel.sourceTableName, rel))) {
            await addRelationshipToConfig(configPath, rel.sourceTableName, rel);
          }
        }

        vscode.window.showInformationMessage('Selected relationships have been added successfully.');
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : `Error adding relationships: ${error}`);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}
