import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ColumnMetadata {
  name: string;
  dataType: string;
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isIdentity: boolean;
  isComputed: boolean;
  defaultValue: string | null;
  referencedTable: string | null;
  referencedColumn: string | null;
}

export interface ParameterMetadata {
  name: string;
  dataType: string;
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
  isOutput: boolean;
  hasDefault: boolean;
  parameterOrder: number;
}

export interface IndexMetadata {
  name: string;
  type: string;
  isUnique: boolean;
  isPrimaryKey: boolean;
  columns: string[];
}

export interface ObjectMetadata {
  schema: string;
  name: string;
  fullName: string;
  type: 'TABLE' | 'VIEW' | 'STORED_PROCEDURE' | 'FUNCTION' | 'TABLE_FUNCTION';
  columns?: ColumnMetadata[];
  parameters?: ParameterMetadata[];
  indexes?: IndexMetadata[];
  returnType?: string;
  definition?: string;
}

export interface SchemaMetadata {
  serverName: string;
  databaseName: string;
  collation: string;
  objects: ObjectMetadata[];
  relationships: RelationshipMetadata[];
}

export interface RelationshipMetadata {
  name: string;
  parentSchema: string;
  parentTable: string;
  parentColumn: string;
  referencedSchema: string;
  referencedTable: string;
  referencedColumn: string;
  deleteAction: string;
  updateAction: string;
}

/**
 * SQL Metadata Query - retrieves comprehensive schema information from SQL Server
 */
export const SQL_METADATA_QUERY = `
SET NOCOUNT ON;

-- Database info
SELECT 
    @@SERVERNAME AS serverName,
    DB_NAME() AS databaseName,
    DATABASEPROPERTYEX(DB_NAME(), 'Collation') AS collation
FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;

-- Tables and Views with columns
SELECT 
    s.name AS [schema],
    o.name AS name,
    QUOTENAME(s.name) + '.' + QUOTENAME(o.name) AS fullName,
    CASE o.type 
        WHEN 'U' THEN 'TABLE'
        WHEN 'V' THEN 'VIEW'
    END AS type,
    (
        SELECT 
            c.name AS name,
            t.name AS dataType,
            CASE WHEN t.name IN ('nvarchar','nchar') THEN c.max_length/2 
                 WHEN t.name IN ('varchar','char','varbinary') THEN c.max_length 
                 ELSE NULL END AS maxLength,
            CASE WHEN t.name IN ('decimal','numeric') THEN c.precision ELSE NULL END AS precision,
            CASE WHEN t.name IN ('decimal','numeric') THEN c.scale ELSE NULL END AS scale,
            c.is_nullable AS isNullable,
            ISNULL(pk.is_primary_key, 0) AS isPrimaryKey,
            CASE WHEN fk.parent_column_id IS NOT NULL THEN 1 ELSE 0 END AS isForeignKey,
            c.is_identity AS isIdentity,
            c.is_computed AS isComputed,
            dc.definition AS defaultValue,
            QUOTENAME(rs.name) + '.' + QUOTENAME(rt.name) AS referencedTable,
            rc.name AS referencedColumn
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        LEFT JOIN (
            SELECT ic.object_id, ic.column_id, i.is_primary_key
            FROM sys.index_columns ic
            INNER JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
            WHERE i.is_primary_key = 1
        ) pk ON c.object_id = pk.object_id AND c.column_id = pk.column_id
        LEFT JOIN sys.foreign_key_columns fk ON c.object_id = fk.parent_object_id AND c.column_id = fk.parent_column_id
        LEFT JOIN sys.tables rt ON fk.referenced_object_id = rt.object_id
        LEFT JOIN sys.schemas rs ON rt.schema_id = rs.schema_id
        LEFT JOIN sys.columns rc ON fk.referenced_object_id = rc.object_id AND fk.referenced_column_id = rc.column_id
        LEFT JOIN sys.default_constraints dc ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
        WHERE c.object_id = o.object_id
        ORDER BY c.column_id
        FOR JSON PATH
    ) AS columns,
    (
        SELECT 
            i.name AS name,
            i.type_desc AS type,
            i.is_unique AS isUnique,
            i.is_primary_key AS isPrimaryKey,
            (
                SELECT c.name
                FROM sys.index_columns ic
                INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
                ORDER BY ic.key_ordinal
                FOR JSON PATH
            ) AS columns
        FROM sys.indexes i
        WHERE i.object_id = o.object_id AND i.name IS NOT NULL
        FOR JSON PATH
    ) AS indexes
FROM sys.objects o
INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
WHERE o.type IN ('U', 'V')
    AND s.name NOT IN ('sys', 'INFORMATION_SCHEMA')
ORDER BY s.name, o.name
FOR JSON PATH;

-- Stored Procedures with parameters
SELECT 
    s.name AS [schema],
    p.name AS name,
    QUOTENAME(s.name) + '.' + QUOTENAME(p.name) AS fullName,
    'STORED_PROCEDURE' AS type,
    (
        SELECT 
            pr.name AS name,
            t.name AS dataType,
            CASE WHEN t.name IN ('nvarchar','nchar') THEN pr.max_length/2 
                 WHEN t.name IN ('varchar','char','varbinary') THEN pr.max_length 
                 ELSE NULL END AS maxLength,
            CASE WHEN t.name IN ('decimal','numeric') THEN pr.precision ELSE NULL END AS precision,
            CASE WHEN t.name IN ('decimal','numeric') THEN pr.scale ELSE NULL END AS scale,
            pr.is_output AS isOutput,
            pr.has_default_value AS hasDefault,
            pr.parameter_id AS parameterOrder
        FROM sys.parameters pr
        INNER JOIN sys.types t ON pr.user_type_id = t.user_type_id
        WHERE pr.object_id = p.object_id AND pr.parameter_id > 0
        ORDER BY pr.parameter_id
        FOR JSON PATH
    ) AS parameters
FROM sys.procedures p
INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
WHERE s.name NOT IN ('sys', 'INFORMATION_SCHEMA')
ORDER BY s.name, p.name
FOR JSON PATH;

-- Scalar Functions with parameters and return type
SELECT 
    s.name AS [schema],
    o.name AS name,
    QUOTENAME(s.name) + '.' + QUOTENAME(o.name) AS fullName,
    'FUNCTION' AS type,
    t.name AS returnType,
    (
        SELECT 
            pr.name AS name,
            pt.name AS dataType,
            CASE WHEN pt.name IN ('nvarchar','nchar') THEN pr.max_length/2 
                 WHEN pt.name IN ('varchar','char','varbinary') THEN pr.max_length 
                 ELSE NULL END AS maxLength,
            CASE WHEN pt.name IN ('decimal','numeric') THEN pr.precision ELSE NULL END AS precision,
            CASE WHEN pt.name IN ('decimal','numeric') THEN pr.scale ELSE NULL END AS scale,
            0 AS isOutput,
            pr.has_default_value AS hasDefault,
            pr.parameter_id AS parameterOrder
        FROM sys.parameters pr
        INNER JOIN sys.types pt ON pr.user_type_id = pt.user_type_id
        WHERE pr.object_id = o.object_id AND pr.parameter_id > 0
        ORDER BY pr.parameter_id
        FOR JSON PATH
    ) AS parameters
FROM sys.objects o
INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
INNER JOIN sys.parameters ret ON o.object_id = ret.object_id AND ret.parameter_id = 0
INNER JOIN sys.types t ON ret.user_type_id = t.user_type_id
WHERE o.type = 'FN'
    AND s.name NOT IN ('sys', 'INFORMATION_SCHEMA')
ORDER BY s.name, o.name
FOR JSON PATH;

-- Table-Valued Functions with columns and parameters
SELECT 
    s.name AS [schema],
    o.name AS name,
    QUOTENAME(s.name) + '.' + QUOTENAME(o.name) AS fullName,
    'TABLE_FUNCTION' AS type,
    (
        SELECT 
            c.name AS name,
            t.name AS dataType,
            CASE WHEN t.name IN ('nvarchar','nchar') THEN c.max_length/2 
                 WHEN t.name IN ('varchar','char','varbinary') THEN c.max_length 
                 ELSE NULL END AS maxLength,
            CASE WHEN t.name IN ('decimal','numeric') THEN c.precision ELSE NULL END AS precision,
            CASE WHEN t.name IN ('decimal','numeric') THEN c.scale ELSE NULL END AS scale,
            c.is_nullable AS isNullable,
            0 AS isPrimaryKey,
            0 AS isForeignKey,
            0 AS isIdentity,
            0 AS isComputed,
            NULL AS defaultValue,
            NULL AS referencedTable,
            NULL AS referencedColumn
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = o.object_id
        ORDER BY c.column_id
        FOR JSON PATH
    ) AS columns,
    (
        SELECT 
            pr.name AS name,
            pt.name AS dataType,
            CASE WHEN pt.name IN ('nvarchar','nchar') THEN pr.max_length/2 
                 WHEN pt.name IN ('varchar','char','varbinary') THEN pr.max_length 
                 ELSE NULL END AS maxLength,
            CASE WHEN pt.name IN ('decimal','numeric') THEN pr.precision ELSE NULL END AS precision,
            CASE WHEN pt.name IN ('decimal','numeric') THEN pr.scale ELSE NULL END AS scale,
            0 AS isOutput,
            pr.has_default_value AS hasDefault,
            pr.parameter_id AS parameterOrder
        FROM sys.parameters pr
        INNER JOIN sys.types pt ON pr.user_type_id = pt.user_type_id
        WHERE pr.object_id = o.object_id AND pr.parameter_id > 0
        ORDER BY pr.parameter_id
        FOR JSON PATH
    ) AS parameters
FROM sys.objects o
INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
WHERE o.type IN ('TF', 'IF')
    AND s.name NOT IN ('sys', 'INFORMATION_SCHEMA')
ORDER BY s.name, o.name
FOR JSON PATH;

-- Foreign Key Relationships
SELECT 
    fk.name AS name,
    ps.name AS parentSchema,
    pt.name AS parentTable,
    pc.name AS parentColumn,
    rs.name AS referencedSchema,
    rt.name AS referencedTable,
    rc.name AS referencedColumn,
    fk.delete_referential_action_desc AS deleteAction,
    fk.update_referential_action_desc AS updateAction
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.tables pt ON fk.parent_object_id = pt.object_id
INNER JOIN sys.schemas ps ON pt.schema_id = ps.schema_id
INNER JOIN sys.columns pc ON fkc.parent_object_id = pc.object_id AND fkc.parent_column_id = pc.column_id
INNER JOIN sys.tables rt ON fk.referenced_object_id = rt.object_id
INNER JOIN sys.schemas rs ON rt.schema_id = rs.schema_id
INNER JOIN sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
ORDER BY ps.name, pt.name, fk.name
FOR JSON PATH;
`;

export class SqlMetadataProvider {
  /**
   * Check if sqlcmd is installed and available in PATH
   */
  private checkSqlcmdInstalled(): void {
    try {
      execSync('sqlcmd -?', { encoding: 'utf8', windowsHide: true, stdio: 'pipe' });
    } catch {
      throw new Error(
        'sqlcmd is not installed or not in PATH. ' +
        'Please install SQL Server command line tools:\n' +
        '  - Windows: Install "Microsoft Command Line Utilities for SQL Server" from https://aka.ms/sqlcmd\n' +
        '  - macOS: brew install sqlcmd\n' +
        '  - Linux: See https://learn.microsoft.com/sql/linux/sql-server-linux-setup-tools'
      );
    }
  }

  /**
   * Execute the metadata query using sqlcmd and parse the results
   */
  async getSchema(connectionString: string): Promise<SchemaMetadata> {
    // Check sqlcmd is available first
    this.checkSqlcmdInstalled();

    // Parse connection string to extract server and database
    const serverMatch = connectionString.match(/(?:Server|Data Source)=([^;]+)/i);
    const databaseMatch = connectionString.match(/(?:Database|Initial Catalog)=([^;]+)/i);
    
    const server = serverMatch?.[1] || 'localhost';
    const database = databaseMatch?.[1] || 'master';
    
    // Build sqlcmd arguments
    const useTrustedConnection = connectionString.toLowerCase().includes('integrated security=true') ||
                                  connectionString.toLowerCase().includes('trusted_connection=true');
    
    // Write SQL to temp file to avoid command line escaping issues
    const tempDir = os.tmpdir();
    const sqlFile = path.join(tempDir, `dab_schema_query_${Date.now()}.sql`);
    const outputFile = path.join(tempDir, `dab_schema_output_${Date.now()}.txt`);
    
    try {
      // Write the query to a temp file
      fs.writeFileSync(sqlFile, SQL_METADATA_QUERY, 'utf8');
      
      let sqlcmdArgs: string[];
      if (useTrustedConnection) {
        sqlcmdArgs = ['-S', server, '-d', database, '-E', '-i', sqlFile, '-o', outputFile, '-y', '0', '-h', '-1'];
      } else {
        const userMatch = connectionString.match(/(?:User Id|UID)=([^;]+)/i);
        const passMatch = connectionString.match(/(?:Password|PWD)=([^;]+)/i);
        const user = userMatch?.[1] || '';
        const pass = passMatch?.[1] || '';
        sqlcmdArgs = ['-S', server, '-d', database, '-U', user, '-P', pass, '-i', sqlFile, '-o', outputFile, '-y', '0', '-h', '-1'];
      }
      
      // Execute sqlcmd
      const command = `sqlcmd ${sqlcmdArgs.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;
      
      let sqlcmdStderr = '';
      try {
        execSync(command, {
          encoding: 'utf8',
          timeout: 60000,
          maxBuffer: 50 * 1024 * 1024,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (cmdError: any) {
        sqlcmdStderr = cmdError.stderr || cmdError.message || '';
        // Check if output file was still created (sqlcmd might exit with error but still produce output)
        if (!fs.existsSync(outputFile)) {
          throw new Error(`sqlcmd failed: ${sqlcmdStderr}. Server: ${server}, Database: ${database}`);
        }
      }
      
      // Read and parse output
      if (!fs.existsSync(outputFile)) {
        throw new Error(`No output from sqlcmd. Server: ${server}, Database: ${database}. ${sqlcmdStderr}`);
      }
      
      const output = fs.readFileSync(outputFile, 'utf8');
      
      // Check for connection/login errors in output (sqlcmd writes errors to output file with -o flag)
      if (output.includes('Login failed') || output.includes('Cannot open database') || 
          output.includes('A network-related') || output.includes('server was not found')) {
        const errorLines = output.split('\n').filter(l => l.includes('Error') || l.includes('failed') || l.includes('Cannot')).join(' ');
        throw new Error(`Database connection failed: ${errorLines || output.substring(0, 500)}`);
      }
      
      if (!output || output.trim().length === 0) {
        throw new Error(`Empty output from sqlcmd. Server: ${server}, Database: ${database}. Check connection and permissions.`);
      }
      
      // Check for SQL errors in output
      if (output.includes('Msg ') && output.includes('Level ')) {
        const errorMatch = output.match(/Msg \d+, Level \d+[^\n]+\n[^\n]+/);
        throw new Error(`SQL Error: ${errorMatch ? errorMatch[0] : 'Unknown SQL error in output'}`);
      }
      
      return this.parseOutput(output);
    } finally {
      // Cleanup temp files
      try {
        if (fs.existsSync(sqlFile)) fs.unlinkSync(sqlFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
  
  /**
   * Parse the multi-result JSON output from sqlcmd
   */
  private parseOutput(output: string): SchemaMetadata {
    // Split output into result sets (separated by blank lines)
    const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Find JSON blocks
    const jsonBlocks: string[] = [];
    let currentBlock = '';
    let bracketCount = 0;
    let inJson = false;
    
    for (const line of lines) {
      if (line.startsWith('{') || line.startsWith('[')) {
        inJson = true;
      }
      
      if (inJson) {
        currentBlock += line;
        bracketCount += (line.match(/[\[{]/g) || []).length;
        bracketCount -= (line.match(/[\]}]/g) || []).length;
        
        if (bracketCount === 0 && currentBlock.length > 0) {
          jsonBlocks.push(currentBlock);
          currentBlock = '';
          inJson = false;
        }
      }
    }
    
    // Parse each JSON block
    const dbInfo = jsonBlocks[0] ? JSON.parse(jsonBlocks[0]) : { serverName: '', databaseName: '', collation: '' };
    const tablesAndViews = jsonBlocks[1] ? JSON.parse(jsonBlocks[1]) : [];
    const storedProcs = jsonBlocks[2] ? JSON.parse(jsonBlocks[2]) : [];
    const scalarFunctions = jsonBlocks[3] ? JSON.parse(jsonBlocks[3]) : [];
    const tableFunctions = jsonBlocks[4] ? JSON.parse(jsonBlocks[4]) : [];
    const relationships = jsonBlocks[5] ? JSON.parse(jsonBlocks[5]) : [];
    
    // Process objects - parse nested JSON strings
    const processObject = (obj: any): ObjectMetadata => {
      const processed: ObjectMetadata = {
        schema: obj.schema,
        name: obj.name,
        fullName: obj.fullName,
        type: obj.type
      };
      
      if (obj.columns) {
        processed.columns = typeof obj.columns === 'string' ? JSON.parse(obj.columns) : obj.columns;
      }
      if (obj.parameters) {
        processed.parameters = typeof obj.parameters === 'string' ? JSON.parse(obj.parameters) : obj.parameters;
      }
      if (obj.indexes) {
        const indexes = typeof obj.indexes === 'string' ? JSON.parse(obj.indexes) : obj.indexes;
        processed.indexes = indexes.map((idx: any) => ({
          ...idx,
          columns: typeof idx.columns === 'string' ? JSON.parse(idx.columns).map((c: any) => c.name) : (idx.columns || []).map((c: any) => c.name)
        }));
      }
      if (obj.returnType) {
        processed.returnType = obj.returnType;
      }
      
      return processed;
    };
    
    const objects: ObjectMetadata[] = [
      ...tablesAndViews.map(processObject),
      ...storedProcs.map(processObject),
      ...scalarFunctions.map(processObject),
      ...tableFunctions.map(processObject)
    ];
    
    return {
      serverName: dbInfo.serverName || '',
      databaseName: dbInfo.databaseName || '',
      collation: dbInfo.collation || '',
      objects,
      relationships
    };
  }
  
  /**
   * Get a summary of the schema (useful for quick overview)
   */
  getSummary(schema: SchemaMetadata): object {
    const tables = schema.objects.filter(o => o.type === 'TABLE');
    const views = schema.objects.filter(o => o.type === 'VIEW');
    const procs = schema.objects.filter(o => o.type === 'STORED_PROCEDURE');
    const functions = schema.objects.filter(o => o.type === 'FUNCTION' || o.type === 'TABLE_FUNCTION');
    
    return {
      database: schema.databaseName,
      server: schema.serverName,
      counts: {
        tables: tables.length,
        views: views.length,
        storedProcedures: procs.length,
        functions: functions.length,
        relationships: schema.relationships.length
      },
      tables: tables.map(t => ({
        name: t.fullName,
        columns: t.columns?.length || 0,
        primaryKey: t.columns?.filter(c => c.isPrimaryKey).map(c => c.name) || []
      })),
      views: views.map(v => v.fullName),
      storedProcedures: procs.map(p => ({
        name: p.fullName,
        parameters: p.parameters?.length || 0
      })),
      functions: functions.map(f => ({
        name: f.fullName,
        type: f.type,
        returnType: f.returnType
      }))
    };
  }
}
