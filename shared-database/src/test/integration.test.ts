import * as assert from 'assert';
import { openConnection, getTables, getViews } from '../../mssql';

// Integration tests - only run if TEST_SQL_CONNECTION_STRING is set
const connectionString = process.env.TEST_SQL_CONNECTION_STRING || 
    'Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;';

describe('SQL Server Integration Tests', function() {
    // Increase timeout for database operations
    this.timeout(10000);

    describe('openConnection', () => {
        it('should connect to SQL Server', async () => {
            const pool = await openConnection(connectionString);
            assert.ok(pool, 'Connection pool should be created');
            assert.strictEqual(pool?.connected, true, 'Should be connected');
            await pool?.close();
        });
    });

    describe('getTables', () => {
        it('should retrieve Trek database tables', async () => {
            const pool = await openConnection(connectionString);
            if (!pool) {
                assert.fail('Failed to connect to database');
                return;
            }

            const tables = await getTables(pool);
            await pool.close();

            assert.ok(tables.length > 0, 'Should have at least one table');
            
            // Check for expected Trek tables
            const tableNames = tables.map(t => t.name);
            assert.ok(tableNames.includes('Actor'), 'Should include Actor table');
            assert.ok(tableNames.includes('Character'), 'Should include Character table');
            assert.ok(tableNames.includes('Series'), 'Should include Series table');
        });

        it('should include column metadata for Actor table', async () => {
            const pool = await openConnection(connectionString);
            if (!pool) {
                assert.fail('Failed to connect to database');
                return;
            }

            const tables = await getTables(pool);
            await pool.close();

            const actor = tables.find(t => t.name === 'Actor');
            assert.ok(actor, 'Actor table should exist');
            assert.ok(actor!.columns.length > 0, 'Actor should have columns');
            
            const idColumn = actor!.columns.find(c => c.name === 'Id');
            assert.ok(idColumn, 'Should have Id column');
            assert.strictEqual(idColumn!.isPrimaryKey, true, 'Id should be primary key');
        });
    });

    describe('getViews', () => {
        it('should retrieve views (may be empty)', async () => {
            const pool = await openConnection(connectionString);
            if (!pool) {
                assert.fail('Failed to connect to database');
                return;
            }

            const views = await getViews(pool);
            await pool.close();

            // Trek DB might not have views, so just verify no errors
            assert.ok(Array.isArray(views), 'Should return an array');
        });
    });
});
