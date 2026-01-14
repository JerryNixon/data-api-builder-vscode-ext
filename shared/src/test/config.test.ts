import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { extractEnvVarName } from '../config/utils';

// NOTE: Functions from readConfig.ts and envManager.ts use VS Code APIs 
// and cannot be tested in Node.js/Mocha. They must be tested in the 
// Extension Development Host. Only pure utility functions can be tested here.

describe('Config Utils', () => {
    describe('extractEnvVarName', () => {
        it('should extract env var name from @env() syntax', () => {
            const result = extractEnvVarName("@env('DB_CONNECTION')");
            assert.strictEqual(result, 'DB_CONNECTION');
        });

        it('should return empty string for invalid syntax', () => {
            const result = extractEnvVarName("Server=localhost;Database=test");
            assert.strictEqual(result, '');
        });

        it('should handle single quotes', () => {
            const result = extractEnvVarName("@env('MSSQL_CONNECTION_STRING')");
            assert.strictEqual(result, 'MSSQL_CONNECTION_STRING');
        });

        it('should return empty string for empty input', () => {
            const result = extractEnvVarName("");
            assert.strictEqual(result, '');
        });

        it('should handle double quotes', () => {
            const result = extractEnvVarName('@env("DB_CONNECTION")');
            assert.strictEqual(result, 'DB_CONNECTION');
        });

        it('should handle extra whitespace', () => {
            const result = extractEnvVarName("@env( 'DB_CONNECTION' )");
            assert.strictEqual(result, 'DB_CONNECTION');
        });

        it('should extract custom environment variable names', () => {
            const result = extractEnvVarName("@env('MY_CUSTOM_DB_CONNECTION')");
            assert.strictEqual(result, 'MY_CUSTOM_DB_CONNECTION');
        });

        it('should extract underscored variable names', () => {
            const result = extractEnvVarName("@env('SQL_SERVER_CONNECTION_STRING')");
            assert.strictEqual(result, 'SQL_SERVER_CONNECTION_STRING');
        });

        it('should extract numeric variable names', () => {
            const result = extractEnvVarName("@env('DB_CONNECTION_123')");
            assert.strictEqual(result, 'DB_CONNECTION_123');
        });

        it('should extract hyphenated variable names', () => {
            const result = extractEnvVarName("@env('DB-CONNECTION')");
            assert.strictEqual(result, 'DB-CONNECTION');
        });

        it('should extract dotted variable names', () => {
            const result = extractEnvVarName("@env('DB.CONNECTION')");
            assert.strictEqual(result, 'DB.CONNECTION');
        });
    });

    describe('JSON parsing with DAB config', () => {
        // Point to src/test/fixtures since fixture files aren't compiled
        const fixturesPath = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures');
        const configPath = path.join(fixturesPath, 'dab-config.json');

        it('should parse real DAB config file', () => {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            
            assert.ok(config, 'Config should be parsed');
            assert.strictEqual(config['data-source']['database-type'], 'mssql');
            assert.strictEqual(config['data-source']['connection-string'], "@env('MSSQL_CONNECTION_STRING')");
        });

        it('should read entities from config', () => {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            
            assert.ok(config?.entities, 'Entities should exist');
            assert.ok(config?.entities.Actor, 'Actor entity should exist');
            assert.ok(config?.entities.Character, 'Character entity should exist');
            assert.ok(config?.entities.Series, 'Series entity should exist');
        });

        it('should read table entity details', () => {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            const actor = config?.entities.Actor;
            
            assert.strictEqual(actor?.source.object, 'dbo.Actor');
            assert.strictEqual(actor?.source.type, 'table');
            assert.ok(actor?.source['key-fields']?.includes('Id'));
        });

        it('should read stored procedure entity', () => {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            const proc = config?.entities.GetSeriesActors;
            
            assert.strictEqual(proc?.source.type, 'stored-procedure');
            assert.strictEqual(proc?.source.object, 'dbo.GetSeriesActors');
            assert.ok(proc?.source.parameters);
        });

        it('should read relationships', () => {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            const character = config?.entities.Character;
            
            assert.ok(character?.relationships?.Actor);
            assert.strictEqual(character?.relationships?.Actor.cardinality, 'one');
            assert.ok(character?.relationships?.Series);
            assert.strictEqual(character?.relationships?.Series['linking.object'], 'Series_Character');
        });

        it('should verify .env file exists', () => {
            const envPath = path.join(fixturesPath, '.env');
            assert.ok(fs.existsSync(envPath), '.env fixture should exist');
        });

        it('should read .env file content', () => {
            const envPath = path.join(fixturesPath, '.env');
            const content = fs.readFileSync(envPath, 'utf-8');
            
            assert.ok(content.includes('MSSQL_CONNECTION_STRING='), 'Should contain connection string');
            assert.ok(content.includes('Server=localhost'), 'Should contain server');
            assert.ok(content.includes('Database=Trek'), 'Should contain database');
        });

        it('should parse custom environment variable names from .env file', () => {
            const customEnvPath = path.join(fixturesPath, '.env.custom');
            const content = fs.readFileSync(customEnvPath, 'utf-8');
            const lines = content.split('\n');
            
            // Simulate the parsing logic from readConnectionStringFromEnvFile
            const findEnvVar = (varName: string): string => {
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine.startsWith('#')) {
                        continue;
                    }
                    
                    // Try quoted match first
                    const quotedMatch = trimmedLine.match(new RegExp(`^${varName}\\s*=\\s*"(.+)"\\s*$`));
                    if (quotedMatch) {
                        return quotedMatch[1];
                    }
                    
                    // Try unquoted match
                    const unquotedMatch = trimmedLine.match(new RegExp(`^${varName}\\s*=\\s*(.+?)\\s*$`));
                    if (unquotedMatch) {
                        return unquotedMatch[1];
                    }
                }
                return '';
            };

            // Test custom variable names
            const customDb = findEnvVar('MY_CUSTOM_DB_CONNECTION');
            assert.ok(customDb.includes('Server=localhost'), 'Should find MY_CUSTOM_DB_CONNECTION');
            assert.ok(customDb.includes('Database=Trek'), 'Should parse Database=Trek');

            const anotherDb = findEnvVar('ANOTHER_DB_STRING');
            assert.ok(anotherDb.includes('Server=localhost'), 'Should find ANOTHER_DB_STRING');
            assert.ok(anotherDb.includes('Database=AnotherDB'), 'Should parse quoted connection string');

            const sqlServer = findEnvVar('SQL_SERVER_CONNECTION_STRING');
            assert.ok(sqlServer.includes('Server=localhost'), 'Should find SQL_SERVER_CONNECTION_STRING');
            assert.ok(sqlServer.includes('Database=Test'), 'Should parse Database=Test');
        });
    });
});

