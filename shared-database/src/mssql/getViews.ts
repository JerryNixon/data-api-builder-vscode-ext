import * as sql from 'mssql';
import type { ViewMetadata, ColumnMetadata } from '../types';

/**
 * Retrieves metadata for all user-defined views in the database
 * 
 * @param pool - SQL Server connection pool
 * @returns Array of view metadata including columns
 * 
 * @example
 * ```typescript
 * const views = await getViews(pool);
 * for (const view of views) {
 *     console.log(`${view.fullName}: ${view.columns.length} columns`);
 * }
 * ```
 */
export async function getViews(pool: sql.ConnectionPool): Promise<ViewMetadata[]> {
    const query = `
        SELECT 
            s.name AS schemaName,
            v.name AS viewName,
            c.name AS columnName,
            tp.name AS dataType,
            c.is_nullable AS isNullable,
            c.max_length AS maxLength
        FROM 
            sys.views v
        INNER JOIN 
            sys.schemas s ON v.schema_id = s.schema_id
        INNER JOIN 
            sys.columns c ON v.object_id = c.object_id
        INNER JOIN 
            sys.types tp ON c.user_type_id = tp.user_type_id
        WHERE 
            v.is_ms_shipped = 0
        ORDER BY 
            s.name, v.name, c.column_id;
    `;

    try {
        const result = await pool.request().query(query);
        return groupViewMetadata(result.recordset);
    } catch (error) {
        console.error('Error fetching view metadata:', error);
        return [];
    }
}

/**
 * Groups raw SQL results into ViewMetadata objects
 */
function groupViewMetadata(rows: any[]): ViewMetadata[] {
    const viewsMap = new Map<string, ViewMetadata>();

    for (const row of rows) {
        const fullName = `${row.schemaName}.${row.viewName}`;

        if (!viewsMap.has(fullName)) {
            viewsMap.set(fullName, {
                schema: row.schemaName,
                name: row.viewName,
                fullName,
                columns: []
            });
        }

        const view = viewsMap.get(fullName)!;
        view.columns.push({
            name: row.columnName,
            dataType: row.dataType,
            isNullable: row.isNullable,
            isPrimaryKey: false, // Views don't have primary keys
            maxLength: row.maxLength > 0 ? row.maxLength : undefined
        });
    }

    return Array.from(viewsMap.values());
}
