import * as fs from 'fs';
import * as path from 'path';
import type { EnvEntry } from '../types';

/**
 * Retrieves all connection string entries from the .env file in the specified folder.
 * Filters for entries that look like SQL connection strings (contain "server=").
 * 
 * @param folderPath - Path to the folder containing .env file
 * @returns Array of connection entries with parsed display information
 * 
 * @example
 * ```typescript
 * const connections = getConnections('/path/to/project');
 * // Returns: [{ name: 'DB_CONN', value: 'Server=...', display: 'Server=localhost;Database=mydb' }]
 * ```
 */
export function getConnections(folderPath: string): EnvEntry[] {
    const envPath = path.join(folderPath, '.env');
    
    if (!fs.existsSync(envPath)) {
        return [];
    }

    const allEntries = readEnvFile(folderPath);

    return allEntries
        .filter(entry => /server=/i.test(entry.value))
        .map(entry => ({
            ...entry,
            display: parseConnectionDisplay(entry.value)
        }));
}

/**
 * Adds a new connection string to the .env file with an auto-generated variable name.
 * Also ensures required DAB environment variables are present.
 * Updates .gitignore to exclude .env file.
 * 
 * @param folderPath - Path to the folder containing .env file
 * @param value - Connection string value to add
 * @returns The created environment entry
 * 
 * @example
 * ```typescript
 * const entry = addConnection('/path/to/project', 'Server=localhost;Database=mydb;...');
 * // Returns: { name: 'MSSQL_CONNECTION_STRING', value: 'Server=...' }
 * ```
 */
export function addConnection(folderPath: string, value: string): EnvEntry {
    const existingEntries = readEnvFile(folderPath);
    const name = generateConnectionStringName(existingEntries);

    existingEntries.push({ name, value });
    ensureDefaultVariables(existingEntries);
    writeEnvFile(folderPath, existingEntries);
    ensureGitIgnore(folderPath);

    return { name, value };
}

/**
 * Ensures .gitignore file exists and contains .env entry
 * 
 * @param folderPath - Path to the folder for .gitignore
 */
export function ensureGitIgnore(folderPath: string): void {
    const gitignorePath = path.join(folderPath, '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, '.env\n');
        return;
    }

    const content = fs.readFileSync(gitignorePath, 'utf8');
    const lines = content.split(/\r?\n/).map(line => line.trim());

    const hasEnvEntry = lines.some(line => line === '.env');

    if (!hasEnvEntry) {
        const append = content.endsWith('\n') ? '.env\n' : '\n.env\n';
        fs.appendFileSync(gitignorePath, append);
    }
}

// Private helper functions

/**
 * Parses a connection string to extract Server and Database for display
 */
function parseConnectionDisplay(connectionString: string): string {
    const parts = connectionString.split(';');
    let server = '';
    let database = '';

    for (const part of parts) {
        const [keyRaw, valRaw] = part.split('=');
        if (!keyRaw || !valRaw) {
            continue;
        }

        const key = keyRaw.trim().toLowerCase();
        const val = valRaw.trim();

        if (key === 'server' || key === 'data source') {
            server = val;
        }

        if (key === 'database' || key === 'initial catalog') {
            database = val;
        }
    }

    return `Server=${server};Database=${database}`;
}

/**
 * Generates a unique environment variable name for connection strings
 */
function generateConnectionStringName(existingEntries: EnvEntry[]): string {
    const baseName = 'MSSQL_CONNECTION_STRING';
    let name = baseName;
    let index = 2;

    while (existingEntries.some(e => e.name.toLowerCase() === name.toLowerCase())) {
        name = `${baseName}_${index}`;
        index++;
    }

    return name;
}

/**
 * Ensures required DAB environment variables exist
 */
function ensureDefaultVariables(entries: EnvEntry[]): void {
    const defaults: Array<{ name: string; value: string }> = [
        { name: 'ASPNETCORE_URLS', value: 'http://localhost:5000' },
        { name: 'DAB_ENVIRONMENT', value: 'Development' }
    ];

    for (const defaultVar of defaults) {
        const exists = entries.some(e => e.name.toLowerCase() === defaultVar.name.toLowerCase());
        if (!exists) {
            entries.push(defaultVar);
        }
    }
}

/**
 * Reads .env file and parses into EnvEntry array
 */
function readEnvFile(folderPath: string): EnvEntry[] {
    const envPath = path.join(folderPath, '.env');
    
    if (!fs.existsSync(envPath)) {
        return [];
    }

    const content = fs.readFileSync(envPath, 'utf8');
    
    return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const separatorIndex = line.indexOf('=');
            if (separatorIndex === -1) {
                return null;
            }

            const name = line.substring(0, separatorIndex).trim();
            let value = line.substring(separatorIndex + 1).trim();

            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            return { name, value };
        })
        .filter((entry): entry is EnvEntry => entry !== null);
}

/**
 * Quotes value if it contains special characters
 */
function quoteIfNeeded(value: string): string {
    const needsQuotes = /\s|["'#\$\\]/.test(value);
    
    if (!needsQuotes) {
        return value;
    }

    // Use single quotes if value contains double quotes
    return value.includes('"') ? `'${value}'` : `"${value}"`;
}

/**
 * Writes EnvEntry array to .env file
 */
function writeEnvFile(folderPath: string, entries: EnvEntry[]): void {
    const lines = entries.map(entry => `${entry.name}=${quoteIfNeeded(entry.value)}`);
    const content = lines.join('\n') + '\n';
    
    fs.writeFileSync(path.join(folderPath, '.env'), content);
}
