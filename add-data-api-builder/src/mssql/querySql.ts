import * as vscode from 'vscode';
import * as sql from 'mssql';

/**
 * Opens a connection to the SQL Server database.
 * @param connectionString - The SQL Server connection string.
 * @returns The connection pool or undefined if the connection fails.
 */
export async function openConnection(connectionString: string): Promise<sql.ConnectionPool | undefined> {
  try {
    return await sql.connect(connectionString);
  } catch (connectionError: any) {
    let errorMessage = 'Database connection failed.';

    if (connectionError.code) {
      errorMessage += ` Error Code: ${connectionError.code}.`;
    }

    if (connectionError.message) {
      errorMessage += ` Message: ${connectionError.message}.`;
    }

    if (connectionError.originalError?.message) {
      errorMessage += ` Details: ${connectionError.originalError.message}.`;
    }

    console.error(errorMessage);
    vscode.window.showErrorMessage("!" + errorMessage);
    return undefined;
  }
}

interface Relationship {
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
 * @returns An array of objects containing schemaName, tableName, primaryKeys, and allColumns.
 */
export async function getTableMetadata(pool: sql.ConnectionPool): Promise<{ schemaName: string; tableName: string; primaryKeys: string; allColumns: string }[]> {
  const query = `
    SELECT
      schemaName,
      tableName,
      STRING_AGG(primaryKey, ',') AS primaryKeys,
      STRING_AGG(columnName, ',') AS allColumns
    FROM (
      SELECT
        s.name AS schemaName,
        t.name AS tableName,
        c.name AS columnName,
        CASE 
          WHEN i.is_primary_key = 1 THEN c.name 
          ELSE NULL 
        END AS primaryKey
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
    ) AS TableColumns
    GROUP BY 
      schemaName, 
      tableName;
  `;

  try {
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (error) {
    vscode.window.showErrorMessage(`Error fetching table metadata: ${error}`);
    return [];
  }
}

/**
 * Retrieves metadata of user-defined views from the database, including all columns.
 * @param pool - The SQL Server connection pool.
 * @returns An array of objects containing schemaName, viewName, and columns.
 */
export async function getViewMetadata(pool: sql.ConnectionPool): Promise<{ schemaName: string; viewName: string; columns: string }[]> {
  const query = `
      SELECT
        s.name AS schemaName,
        v.name AS viewName,
        STRING_AGG(c.name, ',') AS columns
      FROM 
        sys.views v
      INNER JOIN 
        sys.schemas s ON v.schema_id = s.schema_id
      INNER JOIN 
        sys.columns c ON v.object_id = c.object_id
      WHERE 
        v.is_ms_shipped = 0
      GROUP BY 
        s.name, v.name
      ORDER BY 
        s.name, v.name;
    `;

  try {
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (error) {
    vscode.window.showErrorMessage(`Error fetching view metadata: ${error}`);
    return [];
  }
}

/**
 * Retrieves metadata of user-defined stored procedures from the database, including parameters, result columns, and T-SQL script.
 * @param pool - The SQL Server connection pool.
 * @returns An array of objects containing name, paramInfo, colInfo, and script.
 */
export async function getProcedureMetadata(pool: sql.ConnectionPool): Promise<{ name: string; paramInfo: string; colInfo: string; script: string }[]> {
  const query = `
  -- Temporary table for procedures
  IF OBJECT_ID('tempdb..#Procedures') IS NOT NULL
      DROP TABLE #Procedures;

  CREATE TABLE #Procedures (
      FullName NVARCHAR(255),
      ParamInfo NVARCHAR(MAX),
      ColInfo NVARCHAR(MAX),
      Script NVARCHAR(MAX),
      Processed BIT DEFAULT 0
  );

  -- Populate procedures
  INSERT INTO #Procedures (FullName)
  SELECT CONCAT(s.name, '.', p.name)
  FROM sys.procedures p
  INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
  WHERE is_ms_shipped = 0
    AND p.name NOT IN (
        'sp_upgraddiagrams', 
        'sp_helpdiagrams', 
        'sp_helpdiagramdefinition', 
        'sp_creatediagram', 
        'sp_renamediagram', 
        'sp_alterdiagram', 
        'sp_dropdiagram');

  -- Process each procedure
  WHILE EXISTS (SELECT 1 FROM #Procedures WHERE Processed = 0)
  BEGIN
      DECLARE @procName NVARCHAR(255), @objectId INT, @params NVARCHAR(MAX), @columns NVARCHAR(MAX), @script NVARCHAR(MAX);
      
      -- Get the next unprocessed procedure
      SELECT TOP 1 @procName = FullName, @objectId = OBJECT_ID(FullName)
      FROM #Procedures
      WHERE Processed = 0;

      -- Get parameters and map SQL types to simple types
      SELECT @params = STRING_AGG(
          CONCAT(
              name, ':', 
              CASE TYPE_NAME(user_type_id)
                  WHEN 'int' THEN 'number'
                  WHEN 'bit' THEN 'boolean'
                  WHEN 'varchar' THEN 'string'
                  WHEN 'nvarchar' THEN 'string'
                  ELSE 'string' -- Default to string for unsupported types
              END
          ), ', ')
      FROM sys.parameters
      WHERE object_id = @objectId;

      -- Get result set columns
      SELECT @columns = STRING_AGG(name, ', ')
      FROM sys.dm_exec_describe_first_result_set_for_object(@objectId, NULL);

      -- Get the T-SQL definition
      SELECT @script = definition
      FROM sys.sql_modules
      WHERE object_id = @objectId;

      -- Update the metadata
      UPDATE #Procedures
      SET 
          ParamInfo = @params,
          ColInfo = @columns,
          Script = @script,
          Processed = 1
      WHERE FullName = @procName;
  END;

  -- Output metadata
  SELECT 
      FullName AS name,
      ISNULL(ParamInfo, '') AS paramInfo,
      ISNULL(ColInfo, '') AS colInfo,
      ISNULL(Script, '') AS script
  FROM #Procedures;
  `;

  try {
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (error) {
    // Assert or typecast error to `Error` type
    const errorMessage = (error as Error).message || 'Unknown error occurred';
    vscode.window.showErrorMessage(`Error fetching procedure metadata: ${errorMessage}`);
    return [];
  }
}