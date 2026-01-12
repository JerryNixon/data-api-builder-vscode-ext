# dab-vscode-shared

Core utilities for Data API Builder VS Code extensions. This package provides common functionality without database dependencies, keeping extensions lightweight.

## Features

- **Terminal Management** - Unified terminal creation and command execution
- **Config Reading** - DAB configuration file parsing and validation
- **Environment Management** - .env file handling and connection string management
- **Prompt Utilities** - Reusable VS Code quick pick dialogs
- **Type Definitions** - Shared TypeScript types for DAB config schema

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
