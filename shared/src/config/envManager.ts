import * as fs from 'fs';
import * as path from 'path';
import type { EnvEntry } from '../types';

const CONNECTION_SERVER_KEYS = new Set([
    'server',
    'data source',
    'address',
    'addr',
    'network address'
]);

const CONNECTION_KEY_ALIASES: Record<string, string> = {
    'server':             'Server',
    'data source':        'Server',
    'address':            'Server',
    'addr':               'Server',
    'network address':    'Server',
    'database':           'Database',
    'initial catalog':    'Database',
    'user id':            'User Id',
    'userid':             'User Id',
    'uid':                'User Id',
    'password':           'Password',
    'pwd':                'Password',
    'connect timeout':    'Connection Timeout',
    'connection timeout': 'Connection Timeout',
    'trusted_connection': 'Integrated Security',
    'integrated security': 'Integrated Security',
    'encrypt':            'Encrypt',
    'trustservercertificate': 'TrustServerCertificate',
    'trust server certificate': 'TrustServerCertificate',
    'multipleactiveresultsets': 'MultipleActiveResultSets',
    'multiple active result sets': 'MultipleActiveResultSets',
    'persist security info': 'Persist Security Info',
    'pooling':            'Pooling',
    'command timeout':    'Command Timeout'
};

/**
 * Retrieves all connection string entries from the .env file in the specified folder.
 * Filters for entries that look like SQL connection strings. Any ADO.NET or other
 * dialect aliases are normalized to standard JS keys and saved back to the .env file.
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

    const normalizedValueUpdates = new Map<string, string>();
    const normalizedEntries = allEntries.map(entry => {
        if (!isSqlServerConnectionString(entry.value)) {
            return entry;
        }
        const normalized = normalizeConnectionString(entry.value);
        if (normalized !== entry.value) {
            normalizedValueUpdates.set(entry.name.toLowerCase(), normalized);
            return { ...entry, value: normalized };
        }
        return entry;
    });

    if (normalizedValueUpdates.size > 0) {
        updateEnvFileValues(folderPath, normalizedValueUpdates);
    }

    return normalizedEntries
        .filter(entry => isSqlServerConnectionString(entry.value))
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
    const normalizedValue = normalizeConnectionString(value);

    existingEntries.push({ name, value: normalizedValue });
    ensureDefaultVariables(existingEntries);
    writeEnvFile(folderPath, existingEntries);
    ensureGitIgnore(folderPath);

    return { name, value: normalizedValue };
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
 * Parses a normalized connection string to extract Server and Database for display.
 * Assumes the input has already been run through `normalizeConnectionString`.
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

        if (key === 'server') {
            server = val;
        }

        if (key === 'database') {
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

function isSqlServerConnectionString(value: string): boolean {
    return value
        .split(';')
        .some(part => {
            const eq = part.indexOf('=');
            if (eq === -1) {
                return false;
            }

            const key = part.substring(0, eq).trim().toLowerCase();
            return CONNECTION_SERVER_KEYS.has(key);
        });
}

/**
 * Normalizes SQL Server connection string keys from ADO.NET and other dialects
 * to standard JavaScript format (node-mssql / DAB compatible).
 *
 * Aliases normalized:
 *   Data Source / Address / Addr / Network Address  → Server
 *   Initial Catalog                                 → Database
 *   UID                                             → User Id
 *   Pwd                                             → Password
 *   Connect Timeout                                 → Connection Timeout
 *   Trusted_Connection                              → Integrated Security
 */
export function normalizeConnectionString(value: string): string {
    return value
        .split(';')
        .map(part => {
            const eq = part.indexOf('=');
            if (eq === -1) {
                return part;
            }
            const key = part.substring(0, eq).trim();
            const val = part.substring(eq + 1);
            const canonical = CONNECTION_KEY_ALIASES[key.toLowerCase()];
            return canonical ? `${canonical}=${val}` : part;
        })
        .join(';');
}

function updateEnvFileValues(folderPath: string, normalizedValues: Map<string, string>): void {
    const envPath = path.join(folderPath, '.env');
    const content = fs.readFileSync(envPath, 'utf8');

    const updatedLines = content.split(/\r?\n/).map(line => {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1 || line.trim().startsWith('#')) {
            return line;
        }

        const name = line.substring(0, separatorIndex).trim();
        const normalizedName = name.toLowerCase();
        if (!normalizedValues.has(normalizedName)) {
            return line;
        }

        const normalizedValue = normalizedValues.get(normalizedName)!;
        const currentValue = line.substring(separatorIndex + 1).trim();
        let quote: '"' | "'" | undefined;
        if ((currentValue.startsWith('"') && currentValue.endsWith('"')) ||
            (currentValue.startsWith("'") && currentValue.endsWith("'"))) {
            quote = currentValue[0] as '"' | "'";
        }

        const value = quote ? `${quote}${normalizedValue}${quote}` : quoteIfNeeded(normalizedValue);
        const prefixMatch = line.match(/^([^=]*=\s*)/);
        const prefix = prefixMatch ? prefixMatch[1] : line.substring(0, separatorIndex + 1);
        return `${prefix}${value}`;
    });

    fs.writeFileSync(envPath, updatedLines.join(content.includes('\r\n') ? '\r\n' : '\n'));
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
