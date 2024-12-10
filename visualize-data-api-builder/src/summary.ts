// summary.ts
import { getTables } from './getTables';
import { getViews } from './getViews';
import { getProcs } from './getProcs';

/**
 * Generates a formatted markdown summary of tables, views, and stored procedures.
 * @param configPath - The path to the configuration file.
 */
export function generateSummary(configPath: string): string {
    const tables = getTables(configPath);
    const views = getViews(configPath);
    const procs = getProcs(configPath);

    let summary = '';

    summary += '### Tables\n';

    if (tables.length > 0) {
        summary += '|Entity|Source|Relationships\n';
        summary += '|-|-|-\n';
        tables.forEach(table => {
            const relationships = table.relationships && Object.keys(table.relationships).length > 0
                ? Object.keys(table.relationships).join(', ')
                : '-';
            summary += `|${table.name}|${table.source}|${relationships}\n`;
        });
    } else {
        summary += '> None\n';
    }
    summary += '\n';

    summary += '### Views\n';
    if (views.length > 0) {
        summary += '|Entity|Source\n';
        summary += '|-|-\n';
        views.forEach(view => summary += `|${view}|${view}\n`);
    } else {
        summary += '> None\n';
    }
    summary += '\n';

    summary += '### Stored Procedures\n';
    if (procs.length > 0) {
        summary += '|Entity|Source\n';
        summary += '|-|-\n';
        procs.forEach(proc => summary += `|${proc.name} |${proc.sourceName}\n`);
    } else {
        summary += '> None\n';
    }
    summary += '\n';

    return summary;
}
