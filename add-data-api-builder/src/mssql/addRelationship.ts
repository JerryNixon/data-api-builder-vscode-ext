import * as vscode from 'vscode';
import { readDatabaseType, getConnectionString, validateConfigPath } from '../readConfig';
import { addRelationshipExisting } from './addRelationshipExisting';
import { addRelationshipCustom } from './addRelationshipCustom';

/**
 * Adds relationships to the configuration by prompting the user to 
 * choose between database-defined or custom relationships (later).
 * @param configPath - The path to the configuration file.
 * @param connectionString - The SQL Server connection string.
 */
export async function addRelationship(configPath: string, connectionString: string) {
  await addRelationshipExisting(configPath, connectionString);
}
