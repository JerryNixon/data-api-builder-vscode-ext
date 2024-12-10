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
    } catch (connectionError) {
        vscode.window.showErrorMessage(`Database connection failed: ${connectionError}`);
        return undefined;
    }
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
 * Retrieves metadata of user-defined stored procedures from the database, including parameters and result columns.
 * @param pool - The SQL Server connection pool.
 * @returns An array of objects containing name, paramInfo, and colInfo.
 */
export async function getProcedureMetadata(pool: sql.ConnectionPool): Promise<{ name: string; paramInfo: string; colInfo: string; script: string }[]> {
    const query = `
    -- Drop the #Procedures table if it exists
    IF OBJECT_ID('tempdb..#Procedures') IS NOT NULL
        DROP TABLE #Procedures;

    -- Create the #Procedures table to store the list of procedures
    SELECT 
        s.name AS schemaName,
        p.name AS procName,
        0 AS processed,
        CONCAT(s.name, '.', p.name) AS FullName,
        OBJECT_ID(CONCAT(s.name, '.', p.name)) AS objId,
        CAST(NULL AS VARCHAR(MAX)) AS paramInfo,
        CAST(NULL AS VARCHAR(MAX)) AS colInfo,
        CAST(NULL AS VARCHAR(MAX)) AS script
    INTO #Procedures
    FROM 
        sys.procedures p
    INNER JOIN 
        sys.schemas s ON p.schema_id = s.schema_id
    WHERE 
        is_ms_shipped = 0
        AND p.name NOT IN (
            'sp_upgraddiagrams', 
            'sp_helpdiagrams', 
            'sp_helpdiagramdefinition', 
            'sp_creatediagram', 
            'sp_renamediagram', 
            'sp_alterdiagram', 
            'sp_dropdiagram'
        );

    -- Loop through unprocessed procedures
    WHILE EXISTS (SELECT 1 FROM #Procedures WHERE processed = 0)
    BEGIN
        DECLARE @objId INT;
        DECLARE @fullName VARCHAR(255);
        DECLARE @paramInfo VARCHAR(MAX);
        DECLARE @colInfo VARCHAR(MAX);

        -- Get the next unprocessed procedure's object ID
        SELECT TOP 1 
            @objId = objId,
            @fullName = FullName
        FROM #Procedures
        WHERE processed = 0;

        -- Get parameter information
        SELECT 
            @paramInfo = STRING_AGG(ISNULL(name, ''), ', ')
        FROM sys.parameters
        WHERE object_id = @objId;

        -- Get column information from the first result set
        SELECT 
            @colInfo = STRING_AGG(ISNULL(name, ''), ', ')
        FROM sys.dm_exec_describe_first_result_set_for_object(@objId, NULL);

        -- Update the #Procedures table
        UPDATE #Procedures
        SET 
            paramInfo = @paramInfo,
            colInfo = @colInfo,
            script = (SELECT definition FROM sys.sql_modules WHERE object_id = object_id(@fullName)),
            processed = 1
        WHERE objId = @objId;
    END

    -- View the updated table
    SELECT 
        FullName AS name,
        paramInfo,
        colInfo,
        script
    FROM #Procedures;
    `;

    try {
        const result = await pool.request().query(query);
        return result.recordset;
    } catch (error) {
        vscode.window.showErrorMessage(`Error fetching procedure metadata: ${error}`);
        return [];
    }
}
