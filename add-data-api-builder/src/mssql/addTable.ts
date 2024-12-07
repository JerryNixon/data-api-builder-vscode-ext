import * as vscode from 'vscode';
import * as sql from 'mssql';

/**
 * Adds tables to the configuration by presenting a list of user-defined tables to select from.
 * @param configPath - The path to the configuration file.
 * @param connectionString - The SQL Server connection string.
 */
export async function addTable(configPath: string, connectionString: string) {
  let pool: sql.ConnectionPool | undefined;

  try {
    // Attempt to connect to the SQL Server database
    try {
      pool = await sql.connect(connectionString);
    } catch (connectionError) {
      vscode.window.showErrorMessage(`Database connection failed: ${connectionError}`);
      return;
    }

    // Query to get user-defined tables, excluding Microsoft-shipped and internal tables
    const query = `
      SELECT 
        s.name AS schemaName, 
        t.name AS tableName
      FROM 
        sys.tables t
      INNER JOIN 
        sys.schemas s ON t.schema_id = s.schema_id
      WHERE 
        t.is_ms_shipped = 0
        AND t.name != 'sysdiagrams'
      ORDER BY 
        s.name, 
        t.name;
    `;

    const result = await pool.request().query(query);

    if (result.recordset.length === 0) {
      vscode.window.showInformationMessage('No user-defined tables found.');
      return;
    }

    // Create a list of tables in the format "schemaName.tableName"
    const tableOptions = result.recordset.map(row => `${row.schemaName}.${row.tableName}`);

    // Show the multi-select pick list to the user
    const selectedTables = await vscode.window.showQuickPick(tableOptions, {
      canPickMany: true,
      placeHolder: 'Select tables to add',
    });

    if (!selectedTables || selectedTables.length === 0) {
      vscode.window.showInformationMessage('No tables selected.');
      return;
    }

    // Echo the selected tables back to the user
    vscode.window.showInformationMessage(`Selected tables: ${selectedTables.join(', ')}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Error adding tables: ${error}`);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}
