# DAB Extensions Overview

This document provides a comprehensive overview of all Data API Builder (DAB) VS Code extensions in this workspace. Each extension focuses on a specific DAB operation, and they can be used individually or together via the omnibus package.

## Extension Suite Architecture

The workspace contains 10+ VS Code extensions organized in a monorepo structure:

- **2 Shared Packages**: `shared` and `shared-database` for code reuse
- **9 Individual Extensions**: Each providing specific DAB functionality
- **1 Omnibus Extension**: Extension pack bundling all individual extensions
- **1 C# Library**: .NET library for REST operations (separate from VS Code extensions)

## Extension Catalog

### 1. omnibus-data-api-builder (Extension Pack)

**Display Name**: Data API builder (Omnibus)  
**Purpose**: ⭐ All Data API builder extensions in one package  
**Type**: Extension Pack (meta-package)

This is the recommended installation for users who want all DAB functionality. It bundles all individual extensions into a single install.

**Features**:
- Automatically installs all DAB extensions
- Single entry point for the complete DAB toolset
- No code execution - just dependency bundling

**Dependencies**: All individual DAB extensions listed below

**Package Info**:
- No direct dependencies on shared packages
- Defined as `extensionPack` in package.json
- Lightweight (~KB range)

---

### 2. init-data-api-builder

**Display Name**: DAB Init (Data API Builder)  
**Purpose**: Create Data API Builder configuration starter file  
**Command**: `dab init`

**Features**:
- Right-click context menu on folders
- Single multi-select dialog for configuration options:
  - REST endpoint
  - GraphQL endpoint
  - MCP (Model Context Protocol) endpoint
  - Cache settings
  - Developer Mode
  - Simulated security
- Guided prompts for database type, connection string, host mode
- Automatically updates `.env` file with connection string variables
- Automatically updates `.gitignore` to exclude sensitive files
- Supports Static Web Apps configuration

**Shared Dependencies**:
- `dab-vscode-shared` - Terminal management, config utilities, prompts
- No database dependencies

**Migration Status**: ✅ Fully migrated to shared packages

**Key Files**:
- [init-data-api-builder.md](init-data-api-builder.md) - Detailed extension guide
- `src/extension.ts` - Main activation and command logic
- `src/test/` - Unit tests

---

### 3. add-data-api-builder

**Display Name**: DAB Add (Data API Builder)  
**Purpose**: Adds entities to a Data API Builder configuration file  
**Command**: `dab add`

**Features**:
- Right-click context menu on `dab-*.json` or `staticwebapp.database.config.json`
- Supports adding Tables, Views, Stored Procedures, and Relationships
- Queries database metadata (tables, views, procedures) via SQL
- Interactive prompts for entity configuration:
  - Entity name and source
  - Permissions (anonymous, authenticated)
  - REST/GraphQL exposure
  - Key fields for tables
  - Parameters for stored procedures
- Relationship configuration between entities

**Shared Dependencies**:
- `dab-vscode-shared` - Terminal, config reading, prompts
- `dab-vscode-shared-database` - Database connection, metadata queries (getTables, getViews, getProcs)

**Database Operations**:
- Connects to SQL Server via connection string in config
- Retrieves table schemas, column information
- Retrieves view definitions
- Retrieves stored procedure signatures
- Properly closes connections after operations

**Build Process**:
- Uses webpack for bundling (includes mssql driver)
- `npx webpack` before `vsce package`

**Key Files**:
- `src/extension.ts` - Command registration
- `src/mssql/` - Database query logic
- `src/utils/` - Pure utility functions

---

### 4. start-data-api-builder

**Display Name**: DAB Start (Data API builder)  
**Purpose**: Start Data API Builder from a configuration file  
**Command**: `dab start`

**Features**:
- Right-click context menu on `dab-config.json`
- Automatically opens new terminal
- Runs `dab start` in background process
- Terminal stays open for logs and monitoring

**Shared Dependencies**:
- `dab-vscode-shared` - Terminal management
- No database dependencies

**Terminal Behavior**:
- Background process (`isBackground: true`)
- Named terminal: "DAB Start"
- Runs from config file directory

**Key Files**:
- `src/extension.ts` - Simple command that delegates to terminal utility

---

### 5. validate-data-api-builder

**Display Name**: DAB Validate (Data API Builder)  
**Purpose**: Validate a Data API Builder configuration file  
**Command**: `dab validate`

**Features**:
- Right-click context menu on `dab-config.json` or `staticwebapp.database.config.json`
- Opens terminal and runs `dab validate -c <config-file>`
- Validates JSON schema compliance
- Checks entity definitions, permissions, relationships
- Reports errors in terminal output

**Shared Dependencies**:
- `dab-vscode-shared` - Terminal management, config path validation
- No database dependencies

**Validation Checks**:
- Schema validation against [dab.draft.schema.json](dab.draft.schema.json)
- Entity configuration correctness
- Relationship integrity
- Permission syntax

**Key Files**:
- `src/extension.ts` - Command execution

---

### 6. visualize-data-api-builder

**Display Name**: DAB Visualize (Data API Builder)  
**Purpose**: Visualize DAB configurations as Mermaid diagram  
**Command**: Custom visualization

**Features**:
- Right-click context menu on `dab-*.json` or `staticwebapp.database.config.json`
- Generates Mermaid diagram showing:
  - Tables, views, stored procedures
  - Relationships between entities (one-to-many, many-to-many)
  - Linking tables (phantom entities)
  - Standalone nodes for entities without relationships
- Opens diagram in new editor tab
- Interactive diagram (requires Mermaid Markdown extension)

**Shared Dependencies**:
- `dab-vscode-shared` - Config reading and parsing
- No database dependencies

**Diagram Features**:
- Entity relationship diagram (ERD) format
- Composite states for organized grouping
- Highlights unnamed linking entities
- Color coding for different entity types

**External Dependencies**:
- Recommends `bierner.markdown-mermaid` extension for rendering

**Key Files**:
- `src/extension.ts` - Config parsing and diagram generation
- `test-mermaid-output.md` - Example diagram output

---

### 7. health-data-api-builder

**Display Name**: DAB Health (Data API Builder)  
**Purpose**: Visualizes the /health status of a running DAB instance  
**Command**: Custom health check

**Features**:
- Checks health endpoint of running DAB instance
- Displays status information in VS Code
- Monitors running DAB services

**Shared Dependencies**:
- `dab-vscode-shared` - Config reading to determine endpoint
- No database dependencies (uses HTTP)

**Status**: Minimal documentation - check source for full capabilities

**Key Files**:
- `src/extension.ts` - Health endpoint querying

---

### 8. poco-data-api-builder

**Display Name**: DAB Poco Gen (Data API builder)  
**Purpose**: Generate self-contained C# models, repositories, and client from a DAB config with no third-party dependencies  
**Command**: Custom code generation

**Features**:
- Right-click context menu on `dab-config.json`
- Generates complete .NET 8 solution in `Gen/` folder:
  - **Models/**: C# 12 records for each entity with `[Key]` and `[JsonPropertyName]` attributes
  - **Repositories/**: Entity-specific repository classes (Table, View, Procedure)
  - **Repositories/Rest/**: Static infrastructure code (interfaces, base classes, response types)
  - **Client/**: Sample console application demonstrating usage
  - **Gen.sln**: Visual Studio solution file
  - **diagram.md**: Mermaid diagram visualizing the generated structure

**Generated Code Patterns**:
```csharp
// Model (C# 12 record)
public record Actor(
    [property: Key][property: JsonPropertyName("Id")] int Id,
    [property: JsonPropertyName("Name")] string? Name
)
{
    public object WithoutKeys() => new { Name };
};

// Repository
public sealed class ActorRepository : RepositoryBase<Actor>, ITableRepository<Actor>
{
    public Task<Actor> CreateAsync(Actor item);
    public Task<Actor[]> ReadAsync(int? first = null, string? select = null, 
                                     string? filter = null, string? sort = null, 
                                     string? nextPage = null);
    public Task<Actor> UpdateAsync(Actor item, string[]? fields = null);
    public Task DeleteAsync(Actor item);
}

// Aggregate repository
public sealed class RestRepository
{
    public ActorRepository Actor { get; }
    public CharacterRepository Character { get; }
    // ... all entity repositories
}
```

**Shared Dependencies**:
- `dab-vscode-shared` - Config reading and entity parsing
- `dab-vscode-shared-database` - Database metadata for type mapping
- Uses embedded C# templates from `resources/` folder

**Build Process**:
- Uses webpack for bundling
- `npx webpack` before `vsce package`

**Key Files**:
- `src/extension.ts` - Code generation orchestration
- `resources/` - C# code templates
- Separate C# library in `classlib-dab-rest/` for runtime support

---

## Shared Packages

### shared (dab-vscode-shared)

**Purpose**: Core utilities with NO database dependencies (~50KB)

**Modules**:
- **terminal**: `runCommand()` - Execute terminal commands
- **config**: `readConfig()`, `validateConfigPath()` - DAB config file operations
- **config/utils**: `extractEnvVarName()` - Parse `@env('VAR')` syntax
- **prompts**: Input validation and user prompts
- **types**: TypeScript definitions for DAB configs

**Used By**: ALL extensions

**Test Strategy**:
- Unit tests in Node.js/Mocha
- No VS Code API in testable functions
- Fixtures use Trek database schema

---

### shared-database (dab-vscode-shared-database)

**Purpose**: SQL utilities with mssql driver (~5MB)

**Modules**:
- **connection**: Database connection management
- **metadata**: 
  - `getTables()` - Retrieve table schemas
  - `getViews()` - Retrieve view definitions
  - `getProcs()` - Retrieve stored procedure signatures
- **types**: SQL-specific TypeScript types

**Used By**: add, poco, config (planned), mcp (planned)

**Test Strategy**:
- Integration tests against real Trek database
- Uses `TEST_SQL_CONNECTION_STRING` environment variable
- 10-second timeouts for SQL operations
- Properly closes connections

**Reference**: [SQL Utilities Guide](sql-utilities.md)

---

## Extension Dependencies Matrix

| Extension | Shared | Shared-DB | Webpack | Database | Notes |
|-----------|--------|-----------|---------|----------|-------|
| **omnibus** | ❌ | ❌ | ❌ | No | Extension pack only |
| **init** | ✅ | ❌ | ✅ | No | Terminal + prompts |
| **start** | ✅ | ❌ | ✅ | No | Terminal only |
| **validate** | ✅ | ❌ | ✅ | No | Terminal + config |
| **health** | ✅ | ❌ | ✅ | No | HTTP endpoint |
| **visualize** | ✅ | ❌ | ✅ | No | Config parsing |
| **agent** | ✅ | ❌ | ✅ | No | Chat participant |
| **add** | ✅ | ✅ | ✅ | Yes | SQL metadata |
| **poco** | ✅ | ✅ | ✅ | Yes | SQL + codegen |
| **config** | ✅ | ❌ | ✅ | No | Planned |
| **mcp** | ✅ | ✅ | ✅ | Yes | Planned |

**🔑 Key Insight**: All extensions using `dab-vscode-shared` **require webpack bundling** to properly externalize the `vscode` module and avoid extension host warnings.

---

## Common Patterns

### Activation Events

Most extensions activate when DAB config files are present:

```json
"activationEvents": [
  "workspaceContains:**/dab-*.json",
  "workspaceContains:**/staticwebapp.database.config.json"
]
```

### Context Menu Integration

Extensions register context menu items based on file patterns:

```json
"menus": {
  "explorer/context": [
    {
      "command": "extension.commandName",
      "when": "resourceFilename == 'dab-config.json'",
      "group": "dab"
    }
  ]
}
```

### Terminal Usage

Simple terminal commands (from shared package):

```typescript
import { runCommand } from 'dab-vscode-shared/terminal';

// Foreground (waits for completion)
runCommand('dab validate -c dab-config.json');

// Background (for servers)
runCommand('dab start', { isBackground: true, name: 'DAB Start' });
```

### Config Reading

Standard pattern for reading configs:

```typescript
import { readConfig, validateConfigPath } from 'dab-vscode-shared/config';

if (!validateConfigPath(configPath)) {
    vscode.window.showErrorMessage('Invalid DAB config file');
    return;
}

const config = readConfig(configPath);
const entities = Object.keys(config?.entities ?? {});
```

### Database Queries

Pattern for SQL operations (from shared-database):

```typescript
import { getTables, getViews, getProcs } from 'dab-vscode-shared-database/metadata';

const connectionString = config['data-source']?.['connection-string'];
const tables = await getTables(connectionString);
const views = await getViews(connectionString);
const procs = await getProcs(connectionString);
```

---

## Extension Lifecycle

### Development Workflow

1. **Edit Extension** - Modify TypeScript in `src/`
2. **Build** - Run `npm run build` or `tsc`
3. **Test in Dev Host** - Press F5 to launch Extension Development Host
4. **Unit Test** - Run `npm test` (pure functions only)
5. **Package** - Run `vsce package` to create .vsix
6. **Publish** - Upload to VS Code Marketplace

### Build Requirements

**Extensions with Shared Packages** (init, start, validate, health, visualize, agent, add, poco):
- **Webpack bundling required** to properly externalize `vscode` module
- Run `webpack` command (via `npm run compile`)
- Output to `dist/extension.js`
- Bundles extension code + shared packages into single file
- Prevents "Could not identify extension for 'vscode' require call" warning

**Extension Pack Only** (omnibus):
- No build required
- Just dependency declarations in package.json

**Why Webpack is Required**:
- Shared packages import `vscode` module
- Without webpack, extension host can't map `shared/out/terminal.js` to owning extension
- Webpack bundles everything and marks `vscode` as external
- See [vscode-extensions.md](vscode-extensions.md#webpack-bundling) for full details

**Build Commands**:
```bash
# Development build
npm run compile      # Runs webpack

# Watch mode (rebuild on changes)
npm run watch        # Runs webpack --watch

# Production build for publishing
npm run package      # Runs webpack with optimizations
```

---

## Testing Strategy

### Unit Tests (Mocha)

**What CAN be tested**:
- Pure functions with no VS Code API
- Config parsing and validation
- Data transformations
- Utility functions

**What CANNOT be tested**:
- Functions importing `vscode` module
- Commands and context menus
- Terminal operations
- UI interactions

**Test Organization**:
```
extension-name/
  src/
    extension.ts        # VS Code API - NOT testable in Mocha
    utils/
      helpers.ts        # Pure functions - TESTABLE
    test/
      fixtures/
        dab-config.json # Trek schema configs
      suite/
        utils.test.ts   # Unit tests
```

### Integration Tests

**Database Tests** (shared-database only):
- Run against real Trek database
- Use `TEST_SQL_CONNECTION_STRING` env var
- Must close connections properly
- Use 10-second timeouts

**Extension Tests** (F5 launch):
- Test in Extension Development Host
- Manual verification of commands
- UI interaction testing

**Reference**: [Testing Guidelines](testing.md)

---

## Publishing Workflow

All extensions are published under the `jerry-nixon` publisher account on the VS Code Marketplace.

**Publisher Page**: https://marketplace.visualstudio.com/manage/publishers/jerry-nixon

**Common Metadata**:
- **Publisher**: jerry-nixon
- **Repository**: https://github.com/JerryNixon/data-api-builder-vscode-ext.git
- **Engine**: vscode ^1.95.0
- **Category**: Other (some also Programming Languages, Debuggers)
- **Icon**: images/icon.png
- **Gallery Banner**: Blue theme (#0078d7)

---

## Related Documentation

- [Shared Package Migration Guide](shared-migration.md) - Migration strategy and checklists
- [Testing Guidelines](testing.md) - Unit and integration testing
- [VS Code Extension Development](vscode-extensions.md) - Extension patterns and API
- [DAB CLI Reference](dab-cli.md) - DAB command options
- [DAB Configuration Schema](dab-config-schema.md) - Config file structure
- [SQL Utilities Guide](sql-utilities.md) - Database operations
- [NPM Workspace Management](npm-workspaces.md) - Monorepo structure
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

---

## Quick Reference

### All Extensions List

1. **omnibus-data-api-builder** - Extension pack (all-in-one)
2. **init-data-api-builder** - Initialize DAB config
3. **add-data-api-builder** - Add entities to config
4. **start-data-api-builder** - Start DAB engine
5. **validate-data-api-builder** - Validate config file
6. **visualize-data-api-builder** - Visualize as diagram
7. **health-data-api-builder** - Check DAB health
8. **poco-data-api-builder** - Generate C# code
9. **agent-data-api-builder** - @dab Copilot chat participant

### Extension Count by Status

- ✅ **Implemented**: 9 extensions
- 📦 **Extension Pack**: 1 (omnibus)

### Shared Package Usage

- **Using dab-vscode-shared only**: 7 extensions
- **Using both shared packages**: 2 extensions (add, poco)
- **Using no shared packages**: 1 extension (omnibus - extension pack)
