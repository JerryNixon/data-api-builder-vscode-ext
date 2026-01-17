// summary.ts
import { getTables } from './getTables';
import { getViews } from './getViews';
import { getProcs } from './getProcs';
import * as fs from 'fs';

interface DabConfig {
    runtime?: {
        rest?: {
            enabled?: boolean;
            path?: string;
        };
    };
    entities?: Record<string, {
        rest?: {
            enabled?: boolean;
            path?: string;
        };
    }>;
}

/**
 * Reads the DAB config and extracts REST configuration
 */
function getRestConfig(configPath: string): { enabled: boolean; basePath: string } {
    try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config: DabConfig = JSON.parse(configContent);
        
        const enabled = config.runtime?.rest?.enabled ?? true; // Default true
        const basePath = config.runtime?.rest?.path ?? '/api'; // Default /api
        
        return { enabled, basePath };
    } catch {
        return { enabled: true, basePath: '/api' };
    }
}

/**
 * Gets the REST path for a specific entity
 */
function getEntityRestPath(configPath: string, entityName: string): string | null {
    try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config: DabConfig = JSON.parse(configContent);
        
        const entity = config.entities?.[entityName];
        if (!entity) {
            return null;
        }
        
        const entityRestEnabled = entity.rest?.enabled ?? true;
        if (!entityRestEnabled) {
            return null;
        }
        
        return entity.rest?.path ?? `/${entityName}`;
    } catch {
        return null;
    }
}

/**
 * Generates a formatted markdown summary of tables, views, and stored procedures.
 * @param configPath - The path to the configuration file.
 */
export function generateSummary(configPath: string): string {
    const tables = getTables(configPath);
    const views = getViews(configPath);
    const procs = getProcs(configPath);
    
    const restConfig = getRestConfig(configPath);
    const baseUrl = 'http://localhost:5000';

    let summary = '';

    summary += '### Tables\n';

    if (tables.length > 0) {
        summary += '|Entity|Source|Relationships\n';
        summary += '|-|-|-\n';
        tables.forEach(table => {
            const relationships = table.relationships && Object.keys(table.relationships).length > 0
                ? Object.keys(table.relationships).join(', ')
                : '-';
            
            let entityName = table.name;
            if (restConfig.enabled) {
                const entityPath = getEntityRestPath(configPath, table.name);
                if (entityPath) {
                    const fullUrl = `${baseUrl}${restConfig.basePath}${entityPath}`;
                    entityName = `[${table.name}](${fullUrl})`;
                }
            }
            
            summary += `|${entityName}|${table.source}|${relationships}\n`;
        });
    } else {
        summary += '> None\n';
    }
    summary += '\n';

    summary += '### Views\n';
    if (views.length > 0) {
        summary += '|Entity|Source\n';
        summary += '|-|-\n';
        views.forEach(view => {
            let entityName = view.name;
            if (restConfig.enabled) {
                const entityPath = getEntityRestPath(configPath, view.name);
                if (entityPath) {
                    const fullUrl = `${baseUrl}${restConfig.basePath}${entityPath}`;
                    entityName = `[${view.name}](${fullUrl})`;
                }
            }
            
            summary += `|${entityName}|${view.sourceName}\n`;
        });
    } else {
        summary += '> None\n';
    }
    summary += '\n';

    summary += '### Stored Procedures\n';
    if (procs.length > 0) {
        summary += '|Entity|Source\n';
        summary += '|-|-\n';
        procs.forEach(proc => {
            let entityName = proc.name;
            if (restConfig.enabled) {
                const entityPath = getEntityRestPath(configPath, proc.name);
                if (entityPath) {
                    const fullUrl = `${baseUrl}${restConfig.basePath}${entityPath}`;
                    entityName = `[${proc.name}](${fullUrl})`;
                }
            }
            
            summary += `|${entityName} |${proc.sourceName}\n`;
        });
    } else {
        summary += '> None\n';
    }
    summary += '\n';

    return summary;
}
