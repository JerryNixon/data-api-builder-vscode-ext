// src/envManager.ts
import * as fs from 'fs';
import * as path from 'path';

export interface EnvEntry {
    name: string;
    value: string;
    display?: string;
}

const defaultBaseName = 'MSSQL_CONNECTION_STRING';
console.log('envManager loaded'); // ✅ forces module to be referenced

// Return connection entries with parsed display info
export function getConnections(folderPath: string): EnvEntry[] {
    if (!envFileExists(folderPath)) { return []; }
    const all = readEnvFile(folderPath);

    return all
        .filter(e => /server=/i.test(e.value))
        .map(e => ({
            ...e,
            display: parseDisplay(e.value)
        }));

    // Check if .env exists
    function envFileExists(folderPath: string): boolean {
        return fs.existsSync(path.join(folderPath, '.env'));
    }

    // Extract Server and Database from connection string
    function parseDisplay(value: string): string {
        const parts = value.split(';');
        let server = '';
        let database = '';

        for (const part of parts) {
            const [keyRaw, valRaw] = part.split('=');
            if (!keyRaw || !valRaw) { continue; }

            const key = keyRaw.trim().toLowerCase();
            const val = valRaw.trim();

            if (key === 'server' || key === 'data source') {
                server = val;
            }

            if (key === 'database' || key === 'initial catalog') {
                database = val;
            }
        }

        return `Server=${server};Database=${database};`;
    }
}

// Add a new connection with an auto-generated name
export function addConnection(folderPath: string, value: string): EnvEntry {
    const all = readEnvFile(folderPath);
    const name = genConnectionStringEnvName(all);

    all.push({ name, value });
    ensureAspnetcoreUrls(all);
    ensureDabEnvironment(all);
    writeEnvFile(folderPath, all);
    ensureGitIgnore(folderPath);

    return { name, value };

    function ensureAspnetcoreUrls(entries: EnvEntry[]): void {
        const key = 'ASPNETCORE_URLS';
        if (!entries.some(e => e.name.toLowerCase() === key.toLowerCase())) {
            entries.push({ name: key, value: 'http://localhost:5000' });
        }
    }

    function ensureDabEnvironment(entries: EnvEntry[]): void {
        const key = 'DAB_ENVIRONMENT';
        if (!entries.some(e => e.name.toLowerCase() === key.toLowerCase())) {
            entries.push({ name: key, value: 'Development' });
        }
    }

    function genConnectionStringEnvName(entries: EnvEntry[]): string {
        let name = defaultBaseName;
        let index = 2;
        while (entries.some(e => e.name.toLowerCase() === name.toLowerCase())) {
            name = `${defaultBaseName}_${index}`;
            index++;
        }
        return name;
    }

    function ensureGitIgnore(folder: string): void {
        const file = path.join(folder, '.gitignore');

        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, '.env\n');
            return;
        }

        let content = fs.readFileSync(file, 'utf8');
        const lines = content.split(/\r?\n/).map(line => line.trim());

        const hasExactDotEnv = lines.some(line => line === '.env');

        if (!hasExactDotEnv) {
            const append = content.endsWith('\n') ? '.env\n' : '\n.env\n';
            fs.appendFileSync(file, append);
        }
    }
}

// Internal

// Read .env into EnvEntry[]
function readEnvFile(folderPath: string): EnvEntry[] {
    const file = path.join(folderPath, '.env');
    if (!fs.existsSync(file)) { return []; }

    return fs.readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const idx = line.indexOf('=');
            if (idx === -1) { return null; }
            const name = line.substring(0, idx).trim();
            let value = line.substring(idx + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            return { name, value } as EnvEntry;
        })
        .filter((e): e is EnvEntry => e !== null);
}

// Quote values if needed, using single quotes for embedded double quotes
function quoteIfNeeded(val: string): string {
    const needsQuotes = /\s|["'#\$\\]/.test(val);
    if (!needsQuotes) {
        return val;
    }
    return val.includes('"') ? `'${val}'` : `"${val}"`;
}

// Write EnvEntry[] to .env file
function writeEnvFile(folderPath: string, entries: EnvEntry[]): void {
    const lines = entries.map(e => `${e.name}=${quoteIfNeeded(e.value)}`);
    fs.writeFileSync(path.join(folderPath, '.env'), lines.join('\n') + '\n');
}
