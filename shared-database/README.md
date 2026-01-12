# dab-vscode-shared-database

SQL utilities for Data API Builder VS Code extensions. This package provides database query functionality with the mssql driver.

## ⚠️ Package Size Warning

This package includes the `mssql` driver (~5MB). Only add this dependency to extensions that actually need to query databases.

## Features

- **SQL Connection** - Connect to SQL Server databases
- **Table Metadata** - Query table structures and columns
- **View Metadata** - Query view structures and columns  
- **Stored Procedure Metadata** - Query stored procedure parameters and results
- **Type Definitions** - TypeScript types for database metadata

## Usage

```typescript
import { openConnection, getTables, getViews, getProcs } from 'dab-vscode-shared-database/mssql';
import type { TableMetadata, ViewMetadata, ProcMetadata } from 'dab-vscode-shared-database/types';

// Connect to database
const pool = await openConnection('Server=localhost;Database=mydb;...');

if (pool) {
    // Get tables
    const tables = await getTables(pool);
    
    // Get views
    const views = await getViews(pool);
    
    // Get stored procedures
    const procs = await getProcs(pool);
}
```

## Package Size

~5MB (includes mssql SQL Server driver)

## Dependencies

- `dab-vscode-shared` - Core utilities
- `mssql` - SQL Server driver
- `vscode` - VS Code extension API

## When to Use

✅ Use this package if your extension needs to:
- Query database schemas
- Generate code from database metadata
- Discover tables/views/procedures
- Validate database objects

❌ Don't use this package if your extension only:
- Runs DAB CLI commands
- Reads/writes config files
- Manages terminals

## Related Packages

- `dab-vscode-shared` - Core utilities without database dependencies (lightweight)
