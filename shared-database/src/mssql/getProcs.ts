import * as sql from 'mssql';
import type { ProcMetadata, ParameterMetadata } from '../types';

/**
 * Retrieves metadata for all user-defined stored procedures in the database
 * 
 * @param pool - SQL Server connection pool
 * @returns Array of stored procedure metadata including parameters
 * 
 * @example
 * ```typescript
 * const procs = await getProcs(pool);
 * for (const proc of procs) {
 *     console.log(`${proc.fullName}: ${proc.parameters.length} parameters`);
 * }
 * ```
 */
export async function getProcs(pool: sql.ConnectionPool): Promise<ProcMetadata[]> {
    const query = `
        SELECT 
            s.name AS schemaName,
            p.name AS procName,
            pr.name AS paramName,
            tp.name AS dataType,
            pr.is_output AS isOutput,
            pr.max_length AS maxLength,
            pr.parameter_id AS parameterId
        FROM 
            sys.procedures p
        INNER JOIN 
            sys.schemas s ON p.schema_id = s.schema_id
        LEFT JOIN 
            sys.parameters pr ON p.object_id = pr.object_id
        LEFT JOIN 
            sys.types tp ON pr.user_type_id = tp.user_type_id
        WHERE 
            p.is_ms_shipped = 0
            AND p.name NOT IN (
                'sp_upgraddiagrams',
                'sp_helpdiagrams',
                'sp_helpdiagramdefinition',
                'sp_creatediagram',
                'sp_renamediagram',
                'sp_alterdiagram',
                'sp_dropdiagram'
            )
        ORDER BY 
            s.name, p.name, pr.parameter_id;
    `;

    try {
        const result = await pool.request().query(query);
        return groupProcMetadata(result.recordset);
    } catch (error) {
        console.error('Error fetching stored procedure metadata:', error);
        return [];
    }
}

/**
 * Groups raw SQL results into ProcMetadata objects
 */
function groupProcMetadata(rows: any[]): ProcMetadata[] {
    const procsMap = new Map<string, ProcMetadata>();

    for (const row of rows) {
        const fullName = `${row.schemaName}.${row.procName}`;

        if (!procsMap.has(fullName)) {
            procsMap.set(fullName, {
                schema: row.schemaName,
                name: row.procName,
                fullName,
                parameters: []
            });
        }

        const proc = procsMap.get(fullName)!;
        
        // Only add parameter if it exists (some procs have no parameters)
        if (row.paramName) {
            proc.parameters.push({
                name: row.paramName,
                dataType: row.dataType,
                isOutput: row.isOutput,
                maxLength: row.maxLength > 0 ? row.maxLength : undefined
            });
        }
    }

    return Array.from(procsMap.values());
}
