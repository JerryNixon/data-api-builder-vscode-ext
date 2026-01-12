import * as sql from 'mssql';
import type { TableMetadata, ColumnMetadata } from '../types';

/**
 * Retrieves metadata for all user-defined tables in the database
 * 
 * @param pool - SQL Server connection pool
 * @returns Array of table metadata including columns and primary keys
 * 
 * @example
 * ```typescript
 * const tables = await getTables(pool);
 * for (const table of tables) {
 *     console.log(`${table.fullName}: ${table.columns.length} columns`);
 * }
 * ```
 */
export async function getTables(pool: sql.ConnectionPool): Promise<TableMetadata[]> {
    const query = `
        SELECT 
            s.name AS schemaName,
            t.name AS tableName,
            c.name AS columnName,
            tp.name AS dataType,
            c.is_nullable AS isNullable,
            c.max_length AS maxLength,
            CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey
        FROM 
            sys.tables t
        INNER JOIN 
            sys.schemas s ON t.schema_id = s.schema_id
        INNER JOIN 
            sys.columns c ON t.object_id = c.object_id
        INNER JOIN 
            sys.types tp ON c.user_type_id = tp.user_type_id
        LEFT JOIN (
            SELECT 
                ic.object_id, 
                ic.column_id
            FROM 
                sys.indexes i
            INNER JOIN 
                sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            WHERE 
                i.is_primary_key = 1
        ) pk ON c.object_id = pk.object_id AND c.column_id = pk.column_id
        WHERE 
            t.is_ms_shipped = 0
        ORDER BY 
            s.name, t.name, c.column_id;
    `;

    try {
        const result = await pool.request().query(query);
        return groupTableMetadata(result.recordset);
    } catch (error) {
        console.error('Error fetching table metadata:', error);
        return [];
    }
}

/**
 * Groups raw SQL results into TableMetadata objects
 */
function groupTableMetadata(rows: any[]): TableMetadata[] {
    const tablesMap = new Map<string, TableMetadata>();

    for (const row of rows) {
        const fullName = `${row.schemaName}.${row.tableName}`;

        if (!tablesMap.has(fullName)) {
            tablesMap.set(fullName, {
                schema: row.schemaName,
                name: row.tableName,
                fullName,
                columns: []
            });
        }

        const table = tablesMap.get(fullName)!;
        table.columns.push({
            name: row.columnName,
            dataType: row.dataType,
            isNullable: row.isNullable,
            isPrimaryKey: row.isPrimaryKey === 1,
            maxLength: row.maxLength > 0 ? row.maxLength : undefined
        });
    }

    return Array.from(tablesMap.values());
}
