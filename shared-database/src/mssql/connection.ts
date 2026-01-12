import * as sql from 'mssql';

/**
 * Opens a connection to SQL Server database.
 * 
 * @param connectionString - SQL Server connection string
 * @returns Connection pool if successful, undefined if connection fails
 * 
 * @example
 * ```typescript
 * const pool = await openConnection('Server=localhost;Database=mydb;User Id=sa;Password=***;');
 * if (pool) {
 *     // Connection successful
 * }
 * ```
 */
export async function openConnection(connectionString: string): Promise<sql.ConnectionPool | undefined> {
    try {
        const pool = await sql.connect(connectionString);
        return pool.connected ? pool : undefined;
    } catch (error) {
        console.error('Database connection failed:', error);
        return undefined;
    }
}
