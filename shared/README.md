# dab-vscode-shared

Core utilities for Data API Builder VS Code extensions. This package provides common functionality without database dependencies, keeping extensions lightweight.

## Features

- **Terminal Management** - Unified terminal creation and command execution
- **Config Reading** - DAB configuration file parsing and validation
- **Environment Management** - .env file handling and connection string management with custom variable name support
- **Prompt Utilities** - Reusable VS Code quick pick dialogs
- **Type Definitions** - Shared TypeScript types for DAB config schema

## Custom Environment Variables

The package supports custom environment variable names for database connection strings. Simply use any variable name in your DAB config:

**dab-config.json:**
```json
{
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('MY_CUSTOM_DB_CONNECTION')"
  }
}
```

**.env file:**
```env
MY_CUSTOM_DB_CONNECTION=Server=localhost;Database=MyDB;Integrated Security=true;
SQL_SERVER_CONNECTION_STRING=Server=localhost;Database=Test;User Id=sa;Password=secret;
ANOTHER_CONNECTION="Server=localhost;Database=Prod;Trusted_Connection=yes;"
```

The `getConnectionString()` function will:
1. Extract the custom variable name from `@env('VARIABLE_NAME')`
2. Look for it in the `.env` file in the same directory as the config
3. Fall back to `process.env` if not found in `.env`
4. Support both quoted and unquoted values in `.env` files

Supported variable name formats:
- Underscores: `MY_CUSTOM_DB_CONNECTION`
- Hyphens: `DB-CONNECTION`  
- Numbers: `DB_CONNECTION_123`
- Mixed: `SQL_SERVER_CONNECTION_STRING_V2`

## Usage

```typescript
import { runCommand } from 'dab-vscode-shared/terminal';
import { readConfig, getConnectionString } from 'dab-vscode-shared/config';
import { askBoolean } from 'dab-vscode-shared/prompts';
import type { EntityDefinition, DabConfig } from 'dab-vscode-shared/types';

// Run terminal command
runCommand('dab start', { cwd: '/path/to/project' });

// Read config file
const config = readConfig('/path/to/dab-config.json');

// Get connection string
const connStr = await getConnectionString('/path/to/dab-config.json');

// Prompt user
const enabled = await askBoolean('REST', 'Enable REST endpoints?', true);
```

## Package Size

~50KB (no database drivers)

## Dependencies

- `vscode` - VS Code extension API

## Related Packages

- `dab-vscode-shared-database` - SQL utilities with mssql driver (use only if you need database queries)
