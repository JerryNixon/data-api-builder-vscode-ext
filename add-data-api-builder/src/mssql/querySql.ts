import * as vscode from 'vscode';
import * as sql from 'mssql';
import { showErrorMessageWithTimeout } from '../utils/messageTimeout';

interface Relationship { //delete?
  LeftTable: string;          // e.g., "dbo.authors"
  LeftName: string;           // e.g., "authors"
  LeftKeys: string;           // e.g., "id" (comma-separated if multiple)
  MiddleTable: string;        // e.g., "dbo.books_authors"
  MiddleLeftKeys: string;     // e.g., "author_id" (comma-separated if multiple)
  MiddleRightKeys: string;    // e.g., "book_id" (comma-separated if multiple)
  RightTable: string;         // e.g., "dbo.books"
  RightName: string;          // e.g., "books"
  RightKeys: string;          // e.g., "id" (comma-separated if multiple)
  PresentationString: string; // Formatted string describing the relationship
  DabCliCommand: string;      // Generated DAB CLI command
}

export interface LinkingTable {
  leftSchema: string;
  leftTable: string;
  leftKeyColumn: string;
  centerSchema: string;
  centerTable: string;
  centerLeftKeyColumn: string;
  centerRightKeyColumn: string;
  rightSchema: string;
  rightTable: string;
  rightKeyColumn: string;
  text: string;
}

/**
 * Opens a connection to the SQL Server database.
 * @param connectionString - The SQL Server connection string.
 * @returns The connection pool or undefined if the connection fails.
 */
export async function openConnection(connectionString: string): Promise<sql.ConnectionPool | undefined> {
  try {
    // Check for unsupported .NET-specific connection string formats
    if (connectionString.toLowerCase().includes('integrated security=true')) {
      await showErrorMessageWithTimeout(
        'Connection string format not supported. "Integrated Security=true" is a .NET-specific parameter. ' +
        'For Node.js, use SQL Server authentication (e.g., "Server=localhost;Database=Trek;User Id=sa;Password=YourPassword") ' +
        'or contact your administrator for the correct connection string format.'
      );
      return undefined;
    }

    const pool = await sql.connect(connectionString);
    return pool.connected ? pool : undefined;
  } catch (connectionError: any) {
    let errorMessage = 'Database connection failed.';

    // Check for common authentication errors
    if (connectionError.code === 'ELOGIN') {
      errorMessage = 'Login failed. Please verify your SQL Server credentials. ' +
        'Note: Windows Integrated Security is not supported. Use SQL Server authentication (User Id and Password).';
    } else {
      if (connectionError.code) {
        errorMessage += ` Error Code: ${connectionError.code}.`;
      }

      if (connectionError.message) {
        errorMessage += ` Message: ${connectionError.message}.`;
      }

      if (connectionError.originalError?.message) {
        errorMessage += ` Details: ${connectionError.originalError.message}.`;
      }
    }

    console.error('SQL Connection Error:', connectionError);
    await showErrorMessageWithTimeout(errorMessage);
    return undefined;
  }
}

export async function getPotentialLinkingTables(connection: sql.ConnectionPool): Promise<LinkingTable[]> {
  const query = `
    WITH ForeignKeys AS (
        SELECT 
            fk.name AS FKName,
            sch.name AS SchemaName,
            parent.name AS TableName,
            col.name AS ColumnName,
            ref_sch.name AS RefSchemaName,
            ref.name AS RefTableName,
            ref_col.name AS RefColumnName
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
        JOIN sys.tables parent ON parent.object_id = fk.parent_object_id
        JOIN sys.schemas sch ON sch.schema_id = parent.schema_id
        JOIN sys.columns col ON col.column_id = fkc.parent_column_id AND col.object_id = parent.object_id
        JOIN sys.tables ref ON ref.object_id = fk.referenced_object_id
        JOIN sys.schemas ref_sch ON ref_sch.schema_id = ref.schema_id
        JOIN sys.columns ref_col ON ref_col.column_id = fkc.referenced_column_id AND ref_col.object_id = ref.object_id
    ),
    PrimaryKeys AS (
        SELECT 
            sch.name AS SchemaName,
            t.name AS TableName,
            c.name AS ColumnName
        FROM sys.indexes i
        JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
        JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        JOIN sys.tables t ON t.object_id = i.object_id
        JOIN sys.schemas sch ON sch.schema_id = t.schema_id
        WHERE i.is_primary_key = 1
    ),
    CompositePrimaryKeys AS (
        SELECT SchemaName, TableName
        FROM PrimaryKeys
        GROUP BY SchemaName, TableName
        HAVING COUNT(*) = 2
    ),
    FKPairs AS (
        SELECT
            f1.SchemaName AS CenterSchema,
            f1.TableName AS CenterTable,
            f1.ColumnName AS CenterLeftKeyColumn,
            f2.ColumnName AS CenterRightKeyColumn,
            f1.RefSchemaName AS LeftSchema,
            f1.RefTableName AS LeftTable,
            f1.RefColumnName AS LeftKeyColumn,
            f2.RefSchemaName AS RightSchema,
            f2.RefTableName AS RightTable,
            f2.RefColumnName AS RightKeyColumn
        FROM ForeignKeys f1
        JOIN ForeignKeys f2 ON
            f1.SchemaName = f2.SchemaName AND
            f1.TableName = f2.TableName AND
            f1.ColumnName < f2.ColumnName
    )
    SELECT
        fp.LeftSchema AS leftSchema,
        fp.LeftTable AS leftTable,
        fp.LeftKeyColumn AS leftKeyColumn,
        fp.CenterSchema AS centerSchema,
        fp.CenterTable AS centerTable,
        fp.CenterLeftKeyColumn AS centerLeftKeyColumn,
        fp.CenterRightKeyColumn AS centerRightKeyColumn,
        fp.RightSchema AS rightSchema,
        fp.RightTable AS rightTable,
        fp.RightKeyColumn AS rightKeyColumn,
        CONCAT(fp.LeftSchema, '.', fp.LeftTable, ' <-> ', fp.RightSchema, '.', fp.RightTable, ' via ', fp.CenterSchema, '.', fp.CenterTable) AS text
    FROM FKPairs fp
    JOIN CompositePrimaryKeys pk 
        ON pk.SchemaName = fp.CenterSchema AND pk.TableName = fp.CenterTable
  `;

  const result = await connection.request().query(query);
  return result.recordset as LinkingTable[];
}

/**
 * Retrieves potential many-to-many relationships from the database using foreign key constraints.
 * @param connection SQL Server connection pool
 * @returns Array of relationships with source, junction, and target table details, including DAB CLI commands
 */
export async function getPotentialLinkedTables(
  connection: sql.ConnectionPool
): Promise<Relationship[]> {
  const query = `
    WITH ForeignKeyRelationships AS (
        -- Find tables that have foreign keys pointing to other tables (Right side of the relationship)
        SELECT 
          CONCAT(fk.TABLE_SCHEMA, '.', fk.TABLE_NAME) AS MiddleTable,
          CONCAT(pk.TABLE_SCHEMA, '.', pk.TABLE_NAME) AS RightTable,
          pk.TABLE_NAME AS RightName,
          fk.COLUMN_NAME AS MiddleRightKey, 
          pk.COLUMN_NAME AS RightKey
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk
        JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc 
          ON fk.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk
          ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME 
          AND fk.ORDINAL_POSITION = pk.ORDINAL_POSITION
    ),
    GroupedRelationships AS (
        -- Find tables that the MiddleTable itself references (Left side of the relationship)
        SELECT 
          CONCAT(fk.TABLE_SCHEMA, '.', fk.TABLE_NAME) AS LeftTable,
          CONCAT(pk.TABLE_SCHEMA, '.', pk.TABLE_NAME) AS MiddleTable,
          fk.TABLE_NAME AS LeftName,
          fk.COLUMN_NAME AS LeftKey, 
          pk.COLUMN_NAME AS MiddleLeftKey
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk
        JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc 
          ON fk.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk
          ON rc.CONSTRAINT_NAME = pk.CONSTRAINT_NAME 
          AND fk.ORDINAL_POSITION = pk.ORDINAL_POSITION
    )
    , Reciprocal AS (
      SELECT 
        g.LeftTable,
        g.LeftName,
        STRING_AGG(g.LeftKey, ',') AS LeftKeys,
        g.MiddleTable,
        STRING_AGG(g.MiddleLeftKey, ',') AS MiddleLeftKeys,
        STRING_AGG(f.MiddleRightKey, ',') AS MiddleRightKeys,
        f.RightTable,
        f.RightName,
        STRING_AGG(f.RightKey, ',') AS RightKeys
      FROM GroupedRelationships g
      JOIN ForeignKeyRelationships f ON g.MiddleTable = f.MiddleTable
      -- Ensure we only pick MiddleTables that have exactly 2 outbound relationships
      GROUP BY g.LeftTable, g.MiddleTable, f.RightTable, g.LeftName, f.RightName

      UNION

      SELECT 
        f.RightTable AS LeftTable,
        f.RightName AS LeftName,
        STRING_AGG(f.RightKey, ',') AS LeftKeys,
        g.MiddleTable,
        STRING_AGG(f.MiddleRightKey, ',') AS MiddleLeftKeys,
        STRING_AGG(g.MiddleLeftKey, ',') AS MiddleRightKeys,
        g.LeftTable AS RightTable,
        g.LeftName AS RightName,
        STRING_AGG(g.LeftKey, ',') AS RightKeys
      FROM GroupedRelationships g
      JOIN ForeignKeyRelationships f ON g.MiddleTable = f.MiddleTable
      GROUP BY g.LeftTable, g.MiddleTable, f.RightTable, f.RightName, g.LeftName
    )
    SELECT *,
        CONCAT (
            LeftTable, ' [',
            LeftKeys, '] <- [',
            MiddleLeftKeys, '] ',
            MiddleTable, ' [', 
            MiddleRightKeys, '] -> ',
            RightTable, ' [',
            RightKeys, ']'
        ) AS PresentationString,
      CONCAT('dab update "', LeftName, '" ') + 
      CONCAT(' --relationship "', RightName, '" ') + 
      CONCAT(' --target.entity "', RightName, '" ') + 
      ' --cardinality many ' +
      CONCAT(' --relationship.fields "', LeftKeys, ':', RightKeys, '" ') + 
      CONCAT(' --linking.object "', MiddleTable, '" ') + 
      CONCAT(' --linking.source.fields "', MiddleLeftKeys, '" ') + 
      CONCAT(' --linking.target.fields "', MiddleRightKeys, '"') AS DabCliCommand
    FROM Reciprocal
    WHERE LeftTable != RightTable
    ORDER BY 4, 2
  `;

  const request = connection.request();
  const result = await request.query<Relationship>(query); // Type the query result
  if (!result.recordset.length) {
    return [];
  }
  return result.recordset;
}

/**
 * Retrieves metadata of user-defined tables from the database, including primary keys and all columns.
 * @param pool - The SQL Server connection pool.
 * @returns An array of objects containing schemaName, tableName, primaryKeys, allColumns, and columnDetails.
 */
export async function getTableMetadata(pool: sql.ConnectionPool): Promise<{ schemaName: string; tableName: string; primaryKeys: string; allColumns: string; columnDetails: Array<{name: string; type: string; isPrimaryKey: boolean}> }[]> {
  const query = `
    WITH TableColumns AS (
      SELECT
        s.name AS schemaName,
        t.name AS tableName,
        c.name AS columnName,
        TYPE_NAME(c.user_type_id) AS columnType,
        CASE 
          WHEN i.is_primary_key = 1 THEN c.name 
          ELSE NULL 
        END AS primaryKey,
        CASE 
          WHEN i.is_primary_key = 1 THEN 1 
          ELSE 0 
        END AS isPrimaryKey
      FROM 
        sys.tables t
      INNER JOIN 
        sys.schemas s ON t.schema_id = s.schema_id
      INNER JOIN 
        sys.columns c ON t.object_id = c.object_id
      LEFT JOIN 
        sys.index_columns ic ON t.object_id = ic.object_id AND c.column_id = ic.column_id
      LEFT JOIN 
        sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      WHERE 
        t.is_ms_shipped = 0 
        AND t.name != 'sysdiagrams'
    )
    SELECT
      schemaName,
      tableName,
      STRING_AGG(primaryKey, ',') AS primaryKeys,
      STRING_AGG(columnName, ',') AS allColumns,
      (
        SELECT columnName as name, columnType as type, CAST(isPrimaryKey AS BIT) as isPrimaryKey
        FROM TableColumns tc2
        WHERE tc2.schemaName = tc.schemaName AND tc2.tableName = tc.tableName
        FOR JSON PATH
      ) AS columnDetails
    FROM TableColumns tc
    GROUP BY 
      schemaName, 
      tableName;
  `;

  try {
    const result = await pool.request().query(query);
    return result.recordset.map((row: any) => ({
      ...row,
      columnDetails: row.columnDetails ? JSON.parse(row.columnDetails) : []
    }));
  } catch (error) {
    await showErrorMessageWithTimeout(`Error fetching table metadata: ${error}`);
    return [];
  }
}

/**
 * Retrieves metadata of user-defined views from the database, including all columns.
 * @param pool - The SQL Server connection pool.
 * @returns An array of objects containing schemaName, viewName, columns, and columnDetails.
 */
export async function getViewMetadata(pool: sql.ConnectionPool): Promise<{ schemaName: string; viewName: string; columns: string; columnDetails: Array<{name: string; type: string}> }[]> {
  const query = `
      SELECT
        s.name AS schemaName,
        v.name AS viewName,
        STRING_AGG(c.name, ',') AS columns,
        (
          SELECT c2.name as name, TYPE_NAME(c2.user_type_id) as type
          FROM sys.columns c2
          WHERE c2.object_id = v.object_id
          FOR JSON PATH
        ) AS columnDetails
      FROM 
        sys.views v
      INNER JOIN 
        sys.schemas s ON v.schema_id = s.schema_id
      INNER JOIN 
        sys.columns c ON v.object_id = c.object_id
      WHERE 
        v.is_ms_shipped = 0
      GROUP BY 
        s.name, v.name, v.object_id
      ORDER BY 
        s.name, v.name;
    `;

  try {
    const result = await pool.request().query(query);
    return result.recordset.map((row: any) => ({
      ...row,
      columnDetails: row.columnDetails ? JSON.parse(row.columnDetails) : []
    }));
  } catch (error) {
    await showErrorMessageWithTimeout(`Error fetching view metadata: ${error}`);
    return [];
  }
}

/**
 * Retrieves metadata of user-defined stored procedures from the database, including parameters, result columns, and T-SQL script.
 * @param pool - The SQL Server connection pool.
 * @returns An array of objects containing name, paramInfo, colInfo, script, and parameters.
 */
export async function getProcedureMetadata(pool: sql.ConnectionPool): Promise<{ name: string; paramInfo: string; colInfo: string; script: string; parameters: Array<{name: string; type: string}> }[]> {
  const query = `
/* name | paramInfo (no @) | colInfo | script */
WITH Procs AS (
    SELECT
        p.object_id,
        name   = QUOTENAME(SCHEMA_NAME(p.schema_id)) + '.' + QUOTENAME(p.name),
        script = sm.definition
    FROM sys.procedures AS p
    JOIN sys.sql_modules AS sm
      ON sm.object_id = p.object_id
    WHERE p.is_ms_shipped = 0
      AND p.name NOT IN (
        'sp_upgraddiagrams',
        'sp_helpdiagrams',
        'sp_helpdiagramdefinition',
        'sp_creatediagram',
        'sp_renamediagram',
        'sp_alterdiagram',
        'sp_dropdiagram'
      )
),
ParamAgg AS (
    SELECT
        pr.object_id,
        paramInfo = STRING_AGG(STUFF(pr.name, 1, 1, ''), ',')
                     WITHIN GROUP (ORDER BY pr.parameter_id)
    FROM sys.parameters AS pr
    INNER JOIN Procs AS p
      ON p.object_id = pr.object_id
    GROUP BY pr.object_id
),
ParamDetails AS (
    SELECT
        pr.object_id,
        paramDetails = (
            SELECT 
                STUFF(pr2.name, 1, 1, '') as name,
                TYPE_NAME(pr2.user_type_id) as type
            FROM sys.parameters AS pr2
            WHERE pr2.object_id = pr.object_id
            ORDER BY pr2.parameter_id
            FOR JSON PATH
        )
    FROM sys.parameters AS pr
    INNER JOIN Procs AS p
      ON p.object_id = pr.object_id
    GROUP BY pr.object_id
),
ColAgg AS (
    SELECT
        p.object_id,
        colInfo = STRING_AGG(r.name, ',')
                    WITHIN GROUP (ORDER BY r.column_ordinal)
    FROM Procs AS p
    CROSS APPLY sys.dm_exec_describe_first_result_set_for_object(p.object_id, NULL) AS r
    WHERE r.error_state IS NULL
      AND r.is_hidden = 0
    GROUP BY p.object_id
)
SELECT
    p.name,
    paramInfo = ISNULL(pa.paramInfo, ''),
    colInfo   = ISNULL(ca.colInfo, ''),
    script    = p.script,
    paramDetails = ISNULL(pd.paramDetails, '[]')
FROM Procs AS p
LEFT JOIN ParamAgg AS pa
  ON pa.object_id = p.object_id
LEFT JOIN ColAgg AS ca
  ON ca.object_id = p.object_id
LEFT JOIN ParamDetails AS pd
  ON pd.object_id = p.object_id
ORDER BY p.name;
  `;

  try {
    const result = await pool.request().query(query);
    return result.recordset.map((row: any) => ({
      ...row,
      parameters: row.paramDetails ? JSON.parse(row.paramDetails) : []
    }));
  } catch (error) {
    // Assert or typecast error to `Error` type
    const errorMessage = (error as Error).message || 'Unknown error occurred';
    await showErrorMessageWithTimeout(`Error fetching procedure metadata: ${errorMessage}`);
    return [];
  }
}