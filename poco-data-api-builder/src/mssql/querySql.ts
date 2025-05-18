import * as vscode from 'vscode';
import * as sql from 'mssql';

/** Public Methods **/

/**
 * Opens a connection to the SQL Server database.
 * @param connectionString - The SQL Server connection string.
 * @returns The connection pool or undefined if the connection fails.
 */
export async function openConnection(connectionString: string): Promise<sql.ConnectionPool | undefined> {
  try {
    const pool = await sql.connect(connectionString);

    if (!pool.connected) {
      throw new Error('Connection to the database could not be established.');
    }

    return pool;
  } catch (connectionError) {
    vscode.window.showErrorMessage(`Database connection failed: ${connectionError}`);
    return undefined;
  }
}

/**
 * Retrieves metadata of user-defined tables from the database and generates a POCO class.
 * @param pool - The SQL Server connection pool.
 * @param tableName - The table name to retrieve as POCO.
 * @param mappings - Optional column-to-alias mappings.
 * @returns A string representing the POCO class for the table.
 */
export async function getTableAsPoco(
  pool: sql.ConnectionPool,
  tableName: string,
  keyFields: string[] | undefined,
  mappings?: Record<string, string>,
): Promise<string> {
  if (!pool.connected) {
    throw new Error('Database connection is closed.');
  }

  const { schemaName, pureName } = extractSchemaName(tableName);
  const className = getCsharpName(pureName);

  try {
    const columns = await queryTableOrViewMetadata(pool, schemaName, pureName);
    return formatMetadataAsPoco(className, columns, mappings, keyFields);
  } catch (error) {
    vscode.window.showErrorMessage(`Error generating POCO for table ${tableName}: ${error}`);
    return "";
  }
}

/**
 * Retrieves metadata of user-defined views from the database and generates a POCO class.
 * @param pool - The SQL Server connection pool.
 * @param viewName - The view name to retrieve as POCO.
 * @param mappings - Optional column-to-alias mappings.
 * @returns A string representing the POCO class for the view.
 */
export async function getViewAsPoco(
  pool: sql.ConnectionPool,
  viewName: string,
  keyFields: string[] | undefined,
  mappings?: Record<string, string>,
): Promise<string> {
  if (!pool.connected) {
    throw new Error('Database connection is closed.');
  }

  const { schemaName, pureName } = extractSchemaName(viewName);
  const className = getCsharpName(pureName);

  try {
    const columns = await queryTableOrViewMetadata(pool, schemaName, pureName);
    return formatMetadataAsPoco(className, columns, mappings, keyFields);
  } catch (error) {
    vscode.window.showErrorMessage(`Error generating POCO for view ${viewName}: ${error}`);
    return "";
  }
}

/**
 * Retrieves metadata of stored procedures from the database and generates a POCO class.
 * @param pool - The SQL Server connection pool.
 * @param procedureName - The procedure name.
 * @param mappings - Optional column-to-alias mappings.
 * @returns A string representing the POCO class for the stored procedure.
 */
export async function getProcedureAsPoco(
  pool: sql.ConnectionPool,
  procedureName: string,
  mappings?: Record<string, string>,
): Promise<string> {
  if (!pool.connected) {
    throw new Error('Database connection is closed.');
  }

  const { schemaName, pureName } = extractSchemaName(procedureName);
  const className = getCsharpName(pureName);

  try {
    const columns = await queryProcedureMetadata(pool, schemaName, pureName);
    return formatMetadataAsPoco(className, columns, mappings);
  } catch (error) {
    vscode.window.showErrorMessage(`Error generating POCO for stored procedure ${procedureName}: ${error}`);
    return `// Procedure POCO generation failed for: ${procedureName}`;
  }
}

/** Private Methods **/

function genJsonName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, char => char.toLowerCase());
}

function getCsharpName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, char => char.toUpperCase());
}

function extractSchemaName(objectName: string): { schemaName: string; pureName: string } {
  let schemaName = "dbo"; // Default schema
  let pureName = objectName;

  const matches = objectName.match(/\[([^\]]+)\]\.\[([^\]]+)\]/) || objectName.match(/([^\.]+)\.([^\.]+)/);
  if (matches && matches.length >= 3) {
    schemaName = matches[1];
    pureName = matches[2];
  } else if (!objectName.includes(".")) {
    pureName = objectName;
  } else {
    [schemaName, pureName] = objectName.split(".");
  }

  return { schemaName, pureName };
}

async function queryTableOrViewMetadata(pool: sql.ConnectionPool, schemaName: string, pureName: string): Promise<any[]> {
  const query = `
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schemaName AND TABLE_NAME = @pureName
    ORDER BY ORDINAL_POSITION;
  `;

  try {
    if (!pool.connected) {
      throw new Error('Database connection is closed.');
    }

    const result = await pool
      .request()
      .input("schemaName", sql.NVarChar, schemaName)
      .input("pureName", sql.NVarChar, pureName)
      .query(query);

    if (result.recordset.length === 0) {
      throw new Error(`No columns found for ${pureName}`);
    }

    return result.recordset;
  } catch (error) {
    vscode.window.showErrorMessage(`Error fetching metadata for table/view: ${error}`);
    throw error;
  }
}

async function queryProcedureMetadata(pool: sql.ConnectionPool, schemaName: string, pureName: string): Promise<any[]> {
  try {
    const result = await pool.request()
      .input("procedureName", sql.NVarChar, `[${schemaName}].[${pureName}]`)
      .execute("sp_describe_first_result_set");

    return result.recordset.map((row: any) => ({
      COLUMN_NAME: row.name,
      DATA_TYPE: row.system_type_name.split('(')[0] // Strip any length/precision info
    }));
  } catch (error) {
    vscode.window.showErrorMessage(`Error fetching metadata for procedure: ${error}`);
    throw error;
  }
}

function formatCsharpProperty(columnName: string, dataType: string, alias?: string, isKey: boolean = false): string {
  const jsonName = genJsonName(alias || columnName);
  const propertyName = getCsharpName(alias || columnName);
  const propertyType = mapSqlTypeToCSharp(dataType);
  const keyAttribute = isKey ? "    [Key]\n" : "";
  return `${keyAttribute}    [JsonPropertyName("${jsonName}")]
    public ${propertyType} ${propertyName} { get; set; }
`;
}

function formatMetadataAsPoco(className: string, columns: any[], mappings?: Record<string, string>, keyFields: string[] = []): string {
  let pocoCode = `public class ${className} 
{
`;

  columns.forEach((row) => {
    const alias = mappings ? mappings[row.COLUMN_NAME] : undefined;
    const isKey = keyFields.includes(row.COLUMN_NAME);
    pocoCode += formatCsharpProperty(row.COLUMN_NAME, row.DATA_TYPE, alias, isKey) + "\n";
  });
  pocoCode = pocoCode.replace(/\n$/, "");
  pocoCode += `}
`;
  return pocoCode;
}

function mapSqlTypeToCSharp(sqlType: string): string {
  const typeMapping: { [key: string]: string } = {
    // String types
    "varchar": "string?",
    "nvarchar": "string?",
    // Date and time types
    "datetime": "DateTime",
    "smalldatetime": "DateTime",
    "datetime2": "DateTime",
    "datetimeoffset": "DateTimeOffset",
    "date": "DateTime",
    "time": "TimeSpan",
    // Boolean type
    "bit": "bool",
    // Integer types
    "tinyint": "byte",
    "smallint": "short",
    "int": "int",
    "bigint": "long",
    // Decimal types
    "decimal": "decimal",
    "numeric": "decimal",
    "money": "decimal",
    "smallmoney": "decimal",
    "real": "float",
    "float": "double",
    // Default fallback
    "uniqueidentifier": "Guid", // Guid type
    // Extend mappings as needed
  };

  return typeMapping[sqlType.toLowerCase()] || "object";
}

/**
 * Fetches primary key columns and their data types for a given table.
 * @param pool - The SQL Server connection pool.
 * @param tableName - The name of the table.
 * @returns A record mapping column names to their data types.
 */
export async function getTableKeysTypes(
  pool: sql.ConnectionPool,
  tableName: string
): Promise<Record<string, string>> {
  if (!pool.connected) {
    throw new Error('Database connection is closed.');
  }

  const { schemaName, pureName } = extractSchemaName(tableName);

  const query = `
  SELECT c.COLUMN_NAME, c.DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS c
    INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      ON c.TABLE_SCHEMA = tc.TABLE_SCHEMA AND c.TABLE_NAME = tc.TABLE_NAME
    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND c.COLUMN_NAME = kcu.COLUMN_NAME
    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      AND c.TABLE_SCHEMA = @schemaName
      AND c.TABLE_NAME = @pureName;
  `;

  try {
    const result = await pool.request()
      .input('schemaName', sql.NVarChar, schemaName)
      .input('pureName', sql.NVarChar, pureName)
      .query(query);

    return result.recordset.reduce((acc, row) => {
      acc[row.COLUMN_NAME] = mapSqlTypeToCSharp(row.DATA_TYPE);
      return acc;
    }, {} as Record<string, string>);
  } catch (error) {
    vscode.window.showErrorMessage(`Error fetching table keys: ${error}`);
    throw error;
  }
}

/**
 * Fetches column data types for specified columns in a view.
 * @param pool - The SQL Server connection pool.
 * @param viewName - The name of the view.
 * @param columnNames - The columns to retrieve types for.
 * @returns A record mapping column names to their data types.
 */
export async function getViewKeyTypes(
  pool: sql.ConnectionPool,
  viewName: string,
  columnNames: string[]
): Promise<Record<string, string>> {
  if (!pool.connected) {
    throw new Error('Database connection is closed.');
  }

  const { schemaName, pureName } = extractSchemaName(viewName);
  const columnNamesPlaceholder = columnNames.map((_, i) => `@column${i}`).join(', ');

  const query = `
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schemaName AND TABLE_NAME = @pureName
      AND COLUMN_NAME IN (${columnNamesPlaceholder});
  `;

  try {
    const request = pool.request().input('schemaName', sql.NVarChar, schemaName).input('pureName', sql.NVarChar, pureName);

    columnNames.forEach((name, index) => {
      request.input(`column${index}`, sql.NVarChar, name);
    });

    const result = await request.query(query);

    return result.recordset.reduce((acc, row) => {
      acc[row.COLUMN_NAME] = mapSqlTypeToCSharp(row.DATA_TYPE);
      return acc;
    }, {} as Record<string, string>);
  } catch (error) {
    vscode.window.showErrorMessage(`Error fetching view columns: ${error}`);
    throw error;
  }
}

/**
 * Fetches parameter names and their data types for a stored procedure.
 * @param pool - The SQL Server connection pool.
 * @param procName - The name of the stored procedure.
 * @returns A record mapping parameter names to their data types.
 */
export async function getProcParameterTypes(
  pool: sql.ConnectionPool,
  procName: string
): Promise<Record<string, string>> {
  if (!pool.connected) {
    throw new Error('Database connection is closed.');
  }

  const { schemaName, pureName } = extractSchemaName(procName);

  const query = `
    SELECT PARAMETER_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.PARAMETERS
    WHERE SPECIFIC_SCHEMA = @schemaName AND SPECIFIC_NAME = @pureName;
  `;

  try {
    const result = await pool.request()
      .input('schemaName', sql.NVarChar, schemaName)
      .input('pureName', sql.NVarChar, pureName)
      .query(query);

    return result.recordset.reduce((acc, row) => {
      acc[row.PARAMETER_NAME.replace('@', '')] = mapSqlTypeToCSharp(row.DATA_TYPE);
      return acc;
    }, {} as Record<string, string>);
  } catch (error) {
    vscode.window.showErrorMessage(`Error fetching procedure parameters: ${error}`);
    throw error;
  }
}