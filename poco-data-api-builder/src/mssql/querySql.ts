import * as vscode from 'vscode';
import * as sql from 'mssql';

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

function genJsonName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, char => char.toLowerCase());
}

function getCsharpName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, char => char.toUpperCase());
}

function extractSchemaName(tableName: string): { schemaName: string; pureTableName: string } {
  let schemaName = "dbo"; // Default schema
  let pureTableName = tableName;

  const matches = tableName.match(/\[([^\]]+)\]\.\[([^\]]+)\]/) || tableName.match(/([^\.]+)\.([^\.]+)/);
  if (matches && matches.length >= 3) {
    schemaName = matches[1];
    pureTableName = matches[2];
  } else if (!tableName.includes(".")) {
    pureTableName = tableName;
  } else {
    [schemaName, pureTableName] = tableName.split(".");
  }

  return { schemaName, pureTableName };
}

async function queryTableMetadata(pool: sql.ConnectionPool, schemaName: string, pureTableName: string): Promise<any[]> {
  const query = `
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schemaName AND TABLE_NAME = @pureTableName
    ORDER BY ORDINAL_POSITION;
  `;

  try {
    if (!pool.connected) {
      throw new Error('Database connection is closed.');
    }

    const result = await pool
      .request()
      .input("schemaName", sql.NVarChar, schemaName)
      .input("pureTableName", sql.NVarChar, pureTableName)
      .query(query);

    if (result.recordset.length === 0) {
      throw new Error(`No columns found for table: ${pureTableName}`);
    }

    return result.recordset;
  } catch (error) {
    vscode.window.showErrorMessage(`Error fetching table metadata: ${error}`);
    throw error;
  }
}

function formatCsharpProperty(columnName: string, dataType: string, alias?: string): string {
  const jsonName = genJsonName(alias || columnName); // Use alias for JsonPropertyName if available
  const propertyName = getCsharpName(alias || columnName); // Use alias for property name if available
  const propertyType = mapSqlTypeToCSharp(dataType); // Use column's data type
  return `    [JsonPropertyName("${jsonName}")]
    public ${propertyType} ${propertyName} { get; set; }
`;
}

/**
 * Retrieves metadata of user-defined tables from the database, including primary keys and all columns.
 * Accommodates mappings if defined in the EntityDefinition.
 * @param pool - The SQL Server connection pool.
 * @param tableName - The table name to retrieve as POCO.
 * @param mappings - Optional column-to-alias mappings.
 * @returns A string representing the POCO class for the table.
 */
export async function getTableAsPoco(
  pool: sql.ConnectionPool,
  tableName: string,
  mappings?: Record<string, string>
): Promise<string> {
  if (!pool.connected) {
    throw new Error('Database connection is closed.');
  }

  const { schemaName, pureTableName } = extractSchemaName(tableName);
  const className = getCsharpName(pureTableName);

  try {
    const columns = await queryTableMetadata(pool, schemaName, pureTableName);

    let pocoCode = `public class ${className} {
`;

    columns.forEach((row) => {
      const alias = mappings ? mappings[row.COLUMN_NAME] : undefined;
      pocoCode += formatCsharpProperty(alias || row.COLUMN_NAME, row.DATA_TYPE, alias);
    });

    pocoCode += `}
`;
    return pocoCode;
  } catch (error) {
    vscode.window.showErrorMessage(`Error generating POCO for table ${tableName}: ${error}`);
    return "";
  }
}

function mapSqlTypeToCSharp(sqlType: string): string {
  const typeMapping: { [key: string]: string } = {
    "int": "int",
    "varchar": "string",
    "nvarchar": "string",
    "datetime": "DateTime",
    "bit": "bool",
    // Extend mappings as needed
  };
  return typeMapping[sqlType] || "object";
}

/**
 * Stub for getViewAsPoco method.
 * @param pool - The SQL Server connection pool.
 * @param viewName - The view name.
 * @returns A placeholder string indicating not implemented.
 */
export async function getViewAsPoco(
  pool: sql.ConnectionPool,
  viewName: string
): Promise<string> {
  return `// View POCO generation not implemented for: ${viewName}`;
}

/**
 * Stub for getProcedureAsPoco method.
 * @param pool - The SQL Server connection pool.
 * @param procedureName - The procedure name.
 * @returns A placeholder string indicating not implemented.
 */
export async function getProcedureAsPoco(
  pool: sql.ConnectionPool,
  procedureName: string
): Promise<string> {
  return `// Procedure POCO generation not implemented for: ${procedureName}`;
}
