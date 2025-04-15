import * as vscode from 'vscode';
import * as path from 'path';
import * as process from 'process';
import { openConnection, getPotentialLinkingTables, LinkingTable } from './querySql';
import { getTableAliasMap, getExistingManyToManyRelationships } from '../readConfig';
import { runCommand } from '../runTerminal';

export async function addLinkingTable(configPath: string, connectionString: string) {
    const connection = await openConnection(connectionString);
    if (!connection) {
        vscode.window.showErrorMessage("❌ Failed to connect to the database.");
        return;
    }

    const [potentialLinks, aliasMap, existingLinks] = await Promise.all([
        getPotentialLinkingTables(connection),
        getTableAliasMap(configPath),
        getExistingManyToManyRelationships(configPath)
    ]);

    const filteredLinks = potentialLinks.filter(link => {
        const left = `${link.leftSchema}.${link.leftTable}`.toLowerCase();
        const right = `${link.rightSchema}.${link.rightTable}`.toLowerCase();
        const linker = link.centerTable.toLowerCase();

        const leftAlias = aliasMap.get(left);
        const rightAlias = aliasMap.get(right);

        if (!leftAlias || !rightAlias) { return false; }

        const forward = `${leftAlias}->${rightAlias}->${linker}`;
        const backward = `${rightAlias}->${leftAlias}->${linker}`;

        return !existingLinks.has(forward.toLowerCase()) && !existingLinks.has(backward.toLowerCase());
    });

    if (!filteredLinks.length) {
        vscode.window.showInformationMessage("No linking tables matched config entities.");
        return;
    }

    const selected = await vscode.window.showQuickPick(
        filteredLinks.map(link => {
            const leftAlias = aliasMap.get(`${link.leftSchema}.${link.leftTable}`.toLowerCase())!;
            const rightAlias = aliasMap.get(`${link.rightSchema}.${link.rightTable}`.toLowerCase())!;
            return {
                label: `${leftAlias} <-> ${rightAlias} via ${link.centerSchema}.${link.centerTable}`,
                description: `many-to-many relationship`,
                detail: `Linking: ${link.leftSchema}.${link.leftTable}.${link.leftKeyColumn} = ${link.centerLeftKeyColumn}/${link.centerRightKeyColumn} = ${link.rightSchema}.${link.rightTable}.${link.rightKeyColumn}`,
                link,
                leftAlias,
                rightAlias
            };
        }),
        {
            title: "Select a linking relationship to add",
            canPickMany: true
        }
    );

    if (!selected || !selected.length) {
        return;
    }

    for (const item of selected) {
        await addLinkingRelationship(configPath, item);
    }
}

async function addLinkingRelationship(
    configPath: string,
    item: {
        link: LinkingTable;
        leftAlias: string;
        rightAlias: string;
    }
) {
    const configDir = path.dirname(configPath);
    const configFile = path.basename(configPath);
    process.chdir(configDir);

    const {
        centerTable,
        centerLeftKeyColumn,
        centerRightKeyColumn,
        leftKeyColumn,
        rightKeyColumn
    } = item.link;

    const linker = centerTable;
    const left = item.leftAlias;
    const right = item.rightAlias;

    const leftRelCmd = `dab update ${left} ` +
        `--relationship ${right} --cardinality many ` +
        `--target.entity ${right} ` +
        `--linking.object ${linker} ` +
        `--linking.source.fields ${centerLeftKeyColumn} ` +
        `--linking.target.fields ${centerRightKeyColumn} ` +
        `--relationship.fields ${leftKeyColumn}:${rightKeyColumn} ` +
        `--config ${configFile}`;
    await runCommand(leftRelCmd);

    const rightRelCmd = `dab update ${right} ` +
        `--relationship ${left} --cardinality many ` +
        `--target.entity ${left} ` +
        `--linking.object ${linker} ` +
        `--linking.source.fields ${centerRightKeyColumn} ` +
        `--linking.target.fields ${centerLeftKeyColumn} ` +
        `--relationship.fields ${rightKeyColumn}:${leftKeyColumn} ` +
        `--config ${configFile}`;
    await runCommand(rightRelCmd);
}
