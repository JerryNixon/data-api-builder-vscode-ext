# SQL Utilities Guide

## Overview

The `dab-vscode-shared-database` package provides utilities for querying SQL Server metadata. These utilities help extensions discover tables, views, and stored procedures to generate DAB configurations.

## Connection Management

### openConnection

Opens a connection to SQL Server and returns a connection pool.

```typescript
import { openConnection } from 'dab-vscode-shared-database/mssql';

const connectionString = 'Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;';
const pool = await openConnection(connectionString);

// Use pool for queries
const tables = await getTables(pool);

// Always close when done
await pool.close();
```

**Parameters:**
- `connectionString` (string) - SQL Server connection string

**Returns:**
- `Promise<ConnectionPool | null>` - Connection pool or null if connection fails

**Connection String Formats:**

Windows Authentication:
```
Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true;
```

SQL Server Authentication:
```
Server=localhost;Database=MyDb;User Id=sa;Password=myPassword;TrustServerCertificate=true;
```

Azure SQL:
```
Server=myserver.database.windows.net;Database=MyDb;User Id=admin;Password=myPassword;Encrypt=true;
```

## Table Metadata

### getTables

Retrieves metadata for all tables in the database.

```typescript
import { getTables } from 'dab-vscode-shared-database/mssql';

const tables = await getTables(pool);

tables.forEach(table => {
    console.log(`Table: ${table.schema}.${table.name}`);
    console.log(`Primary Keys: ${table.primaryKeys.join(', ')}`);
    
    table.columns.forEach(col => {
        console.log(`  ${col.name} (${col.type}${col.maxLength ? `(${col.maxLength})` : ''})`);
        console.log(`    Nullable: ${col.isNullable}, PK: ${col.isPrimaryKey}, Identity: ${col.isIdentity}`);
    });
});
```

**Returns:**
```typescript
interface TableMetadata {
    schema: string;          // e.g., 'dbo'
    name: string;            // e.g., 'Actor'
    columns: ColumnMetadata[];
    primaryKeys: string[];   // Column names that are primary keys
}

interface ColumnMetadata {
    name: string;            // e.g., 'Id'
    type: string;            // e.g., 'int', 'nvarchar'
    maxLength: number | null; // For string types
    isNullable: boolean;
    isPrimaryKey: boolean;
    isIdentity: boolean;     // Auto-incrementing column
}
```

**Example Output:**
```typescript
[
  {
    schema: 'dbo',
    name: 'Actor',
    columns: [
      {
        name: 'Id',
        type: 'int',
        maxLength: null,
        isNullable: false,
        isPrimaryKey: true,
        isIdentity: true
      },
      {
        name: 'Name',
        type: 'nvarchar',
        maxLength: 100,
        isNullable: true,
        isPrimaryKey: false,
        isIdentity: false
      },
      {
        name: 'BirthYear',
        type: 'int',
        maxLength: null,
        isNullable: true,
        isPrimaryKey: false,
        isIdentity: false
      }
    ],
    primaryKeys: ['Id']
  }
]
```

## View Metadata

### getViews

Retrieves metadata for all views in the database.

```typescript
import { getViews } from 'dab-vscode-shared-database/mssql';

const views = await getViews(pool);

views.forEach(view => {
    console.log(`View: ${view.schema}.${view.name}`);
    view.columns.forEach(col => {
        console.log(`  ${col.name} (${col.type})`);
    });
});
```

**Returns:**
```typescript
interface ViewMetadata {
    schema: string;          // e.g., 'dbo'
    name: string;            // e.g., 'SeriesActors'
    columns: ColumnMetadata[];
}
```

Views have the same structure as tables but may not have primary keys defined.

## Stored Procedure Metadata

### getProcs

Retrieves metadata for all stored procedures in the database.

```typescript
import { getProcs } from 'dab-vscode-shared-database/mssql';

const procs = await getProcs(pool);

procs.forEach(proc => {
    console.log(`Procedure: ${proc.schema}.${proc.name}`);
    proc.parameters.forEach(param => {
        console.log(`  @${param.name} (${param.type}, ${param.mode})`);
    });
});
```

**Returns:**
```typescript
interface ProcMetadata {
    schema: string;          // e.g., 'dbo'
    name: string;            // e.g., 'GetSeriesActors'
    parameters: ParameterMetadata[];
}

interface ParameterMetadata {
    name: string;            // e.g., 'seriesId'
    type: string;            // e.g., 'int'
    maxLength: number | null;
    mode: 'IN' | 'OUT' | 'INOUT';
}
```

**Example Output:**
```typescript
[
  {
    schema: 'dbo',
    name: 'GetSeriesActors',
    parameters: [
      {
        name: 'seriesId',
        type: 'int',
        maxLength: null,
        mode: 'IN'
      },
      {
        name: 'top',
        type: 'int',
        maxLength: null,
        mode: 'IN'
      }
    ]
  }
]
```

## Complete Example

```typescript
import { openConnection, getTables, getViews, getProcs } from 'dab-vscode-shared-database/mssql';

async function discoverDatabase(connectionString: string) {
    // Open connection
    const pool = await openConnection(connectionString);
    if (!pool) {
        console.error('Failed to connect to database');
        return;
    }

    try {
        // Get all tables
        const tables = await getTables(pool);
        console.log(`Found ${tables.length} tables:`);
        tables.forEach(t => console.log(`  - ${t.schema}.${t.name}`));

        // Get all views
        const views = await getViews(pool);
        console.log(`Found ${views.length} views:`);
        views.forEach(v => console.log(`  - ${v.schema}.${v.name}`));

        // Get all procedures
        const procs = await getProcs(pool);
        console.log(`Found ${procs.length} stored procedures:`);
        procs.forEach(p => console.log(`  - ${p.schema}.${p.name}`));

    } finally {
        // Always close connection
        await pool.close();
    }
}

// Usage
const connString = 'Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;';
await discoverDatabase(connString);
```

## Error Handling

Always use try/catch and close connections:

```typescript
import { openConnection, getTables } from 'dab-vscode-shared-database/mssql';

async function queryDatabase(connectionString: string) {
    let pool = null;
    
    try {
        pool = await openConnection(connectionString);
        
        if (!pool) {
            throw new Error('Failed to connect to database');
        }

        const tables = await getTables(pool);
        return tables;
        
    } catch (error) {
        console.error('Database query error:', error);
        vscode.window.showErrorMessage(`Database error: ${error.message}`);
        return [];
        
    } finally {
        // Ensure connection is closed even if error occurs
        if (pool) {
            await pool.close();
        }
    }
}
```

## Using with DAB Config

### Generate Entity from Table

```typescript
import { getTables } from 'dab-vscode-shared-database/mssql';
import type { EntityDefinition } from 'dab-vscode-shared/types';

async function generateEntity(pool: any, tableName: string): Promise<EntityDefinition> {
    const tables = await getTables(pool);
    const table = tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
    
    if (!table) {
        throw new Error(`Table ${tableName} not found`);
    }

    return {
        source: {
            object: `${table.schema}.${table.name}`,
            type: 'table',
            'key-fields': table.primaryKeys
        },
        graphql: {
            enabled: true,
            type: {
                singular: table.name,
                plural: `${table.name}s`
            }
        },
        rest: {
            enabled: true,
            path: `/${table.name.toLowerCase()}s`
        },
        permissions: [
            {
                role: 'anonymous',
                actions: ['read']
            }
        ]
    };
}
```

### Generate Entity from Stored Procedure

```typescript
import { getProcs } from 'dab-vscode-shared-database/mssql';

async function generateProcedureEntity(pool: any, procName: string): Promise<EntityDefinition> {
    const procs = await getProcs(pool);
    const proc = procs.find(p => p.name.toLowerCase() === procName.toLowerCase());
    
    if (!proc) {
        throw new Error(`Procedure ${procName} not found`);
    }

    // Convert parameters to DAB format
    const parameters: Record<string, string> = {};
    proc.parameters.forEach(param => {
        parameters[param.name] = param.type;
    });

    return {
        source: {
            object: `${proc.schema}.${proc.name}`,
            type: 'stored-procedure',
            parameters: parameters
        },
        graphql: {
            enabled: true,
            operation: 'query',
            type: {
                singular: proc.name
            }
        },
        rest: {
            enabled: true,
            methods: ['POST']
        },
        permissions: [
            {
                role: 'anonymous',
                actions: ['execute']
            }
        ]
    };
}
```

## Testing

See [Testing Guidelines](./testing.md) for integration test examples.

**Key Points:**
- Use `this.timeout(10000)` for database tests
- Always close connection pools in tests
- Check for null before using pool
- Use environment variable for connection string

```typescript
const connectionString = process.env.TEST_SQL_CONNECTION_STRING || 
    'Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;';
```

## Performance Considerations

### Connection Pooling

The mssql library uses connection pooling automatically. Reuse the pool for multiple queries:

```typescript
const pool = await openConnection(connectionString);

// Multiple queries on same pool
const tables = await getTables(pool);
const views = await getViews(pool);
const procs = await getProcs(pool);

// Close once when done
await pool.close();
```

### Query Optimization

The metadata queries join system tables efficiently:
- `getTables()` - Single query with GROUP BY for columns
- `getViews()` - Single query, similar to tables
- `getProcs()` - Query parameters table

## Limitations

- Only supports SQL Server (mssql driver)
- Requires appropriate permissions to query system tables
- May not work with very old SQL Server versions (< 2012)
- Complex types (CLR, XML, spatial) may not be fully represented

## Dependencies

The shared-database package depends on:
- `mssql` (^10.0.0) - SQL Server client
- `dab-vscode-shared` (*) - Core shared utilities

Extensions using this package will bundle ~5MB of additional dependencies.