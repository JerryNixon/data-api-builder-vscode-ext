import * as vscode from 'vscode';
import { openConnection, getPotentialLinkingTables, getPotentialLinkedTables, getEntityFieldsByType } from './querySql';
import { getExistingEntities } from '../readConfig';
import { runCommand } from '../runTerminal';

/**
 * Entry point for adding a linking table relationship.
 */
export async function addLinkingTable(configPath: string, connectionString: string) {
    const connection = await openConnection(connectionString);
    if (!connection) {
        vscode.window.showErrorMessage("❌ Failed to connect to the database.");
        return;
    }

    const existingEntities = (await getExistingEntities(configPath)).map(e => e.toLowerCase());
    if (!existingEntities.length) {
        vscode.window.showErrorMessage("❌ Failed to read configuration.");
        return;
    }

    // Step 04: Choose linking table
    const linkingTable = await chooseLinkingTable(connection);
    if (!linkingTable) {
        vscode.window.showErrorMessage(`❌ No linking table selected. Stopped.`);
        return;
    }

    // Step 08: Choose left linking keys (first)
    const leftLinkingKeys = await chooseKeys(connection, linkingTable, "Select linking table fields for LEFT");
    if (!leftLinkingKeys.length) {
        vscode.window.showErrorMessage(`❌ No left linking key(s) selected. Stopped.`);
        return;
    }

    // Step 11: Choose right linking keys (next)
    const rightLinkingKeys = await chooseKeys(connection, linkingTable, "Select linking table fields for RIGHT");
    if (!rightLinkingKeys.length) {
        vscode.window.showErrorMessage(`❌ No right linking key(s) selected. Stopped.`);
        return;
    }

    // Step 05: Get potential left/right tables (filtered by linking table keys)
    const potentialEntities = await getPotentialLinkedTables(connection, linkingTable, [...leftLinkingKeys, ...rightLinkingKeys]);
    if (!potentialEntities.length) {
        vscode.window.showErrorMessage("❌ Zero potential linked tables found.");
        return;
    }

    // Step 06: Choose left table
    const leftTable = await chooseEntity("Left", potentialEntities, linkingTable);
    if (!leftTable) {
        vscode.window.showErrorMessage("❌ No left table selected.");
        return;
    }

    // Step 07: Choose left keys (filtered by left linking keys)
    const leftKeys = await chooseKeys(connection, leftTable, `Choose ${leftTable} keys to ${linkingTable}`, leftLinkingKeys);
    if (!leftKeys.length) {
        vscode.window.showErrorMessage(`❌ No left keys selected. Stopped.`);
        return;
    }

    // Step 09: Choose right table
    const rightTable = await chooseEntity("Right", potentialEntities, linkingTable);
    if (!rightTable) {
        vscode.window.showErrorMessage(`❌ No right table selected. Stopped.`);
        return;
    }

    // Step 10: Choose right keys (filtered by right linking keys)
    const rightKeys = await chooseKeys(connection, rightTable, `Choose ${rightTable} keys to ${linkingTable}`, rightLinkingKeys);
    if (!rightKeys.length) {
        vscode.window.showErrorMessage(`❌ No right keys selected. Stopped.`);
        return;
    }

    // Step 13: Run DAB CLI command
    await executeDabCommand(configPath, leftTable, leftKeys, linkingTable, leftLinkingKeys, rightLinkingKeys, rightTable, rightKeys);
    vscode.window.showInformationMessage("✅ Successfully added linking table relationship.");
}

/**
 * Prompts the user to select a linking table.
 */
async function chooseLinkingTable(connection: any): Promise<string | undefined> {
    const tables = await getPotentialLinkingTables(connection);
    if (!tables.length) {
        vscode.window.showErrorMessage("❌ Zero potential linking tables found.");
        return undefined;
    }

    const selection = await vscode.window.showQuickPick(
        tables.map(t => ({
            label: `${t.schema}.${t.table_name}`,
            description: `Select linking table`,
            detail: `LEFT -> ${t.schema}.${t.table_name} -> RIGHT`
        })), { placeHolder: 'Select the linking table' });

    if (!selection) {
        vscode.window.showErrorMessage("❌ No linking table selected. Stopped.");
        return undefined;
    }

    return selection.label;
}

/**
 * Prompts the user to select an entity.
 */
async function chooseEntity(side: 'Left' | 'Right', entities: string[], linkingTable: string): Promise<string | undefined> {
    const selection = await vscode.window.showQuickPick(
        entities.map(entity => ({
            label: entity,
            description: `Select ${side} table`,
            detail: side === 'Left'
                ? `${entity} -> ${linkingTable} -> RIGHT`
                : `LEFT -> ${linkingTable} -> ${entity}`
        })), { placeHolder: `Select the ${side} table` });

    if (!selection) {
        vscode.window.showErrorMessage(`❌ No ${side.toLowerCase()} table selected. Stopped.`);
        return undefined;
    }

    return selection.label;
}

/**
 * Prompts the user to select keys from an entity.
 */
async function chooseKeys(
    connection: any, entity: string, promptMessage: string, filterKeys?: string[]): Promise<string[]> {

    // Fetch fields filtered by data type when filterKeys exist
    const fields = filterKeys
        ? await getEntityFieldsByType(connection, entity, filterKeys)
        : await getEntityFieldsByType(connection, entity);

    if (!fields.length) {
        vscode.window.showErrorMessage(`❌ No matching keys found in ${entity}. Stopped.`);
        return [];
    }

    const selection = await vscode.window.showQuickPick(
        fields.map(field => ({
            label: field,
            description: `Select field from ${entity}`
        })), { canPickMany: true, placeHolder: promptMessage });

    if (!selection?.length) {
        vscode.window.showErrorMessage(`❌ No keys selected. Stopped.`);
        return [];
    }

    return selection.map(item => item.label);
}

/**
 * Executes the DAB CLI command to add the relationship.
 */
async function executeDabCommand(
    configPath: string,
    leftEntity: string,
    leftKeys: string[],
    linkingTable: string,
    linkingLeftKeys: string[],
    linkingRightKeys: string[],
    rightEntity: string,
    rightKeys: string[]
) {
    const command = `dab add relationship --config ${configPath} --entity ${leftEntity} --relationship ${rightEntity} --cardinality many ` +
        `--linking-table ${linkingTable} --left-keys ${leftKeys.join(",")} --linking-left-keys ${linkingLeftKeys.join(",")} ` +
        `--linking-right-keys ${linkingRightKeys.join(",")} --right-keys ${rightKeys.join(",")}`;

    await runCommand(command);
}
