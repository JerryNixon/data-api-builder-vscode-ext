# Shared Package Migration Guide

## Overview
This document tracks the migration of shared code from individual VS Code extensions into reusable npm workspace packages.

## Architecture

### Two Shared Packages

1. **`shared`** - Core utilities (NO database dependencies)
   - Small footprint (~50KB)
   - Used by ALL extensions
   - No heavy dependencies

2. **`shared-database`** - SQL utilities (depends on `mssql`)
   - Larger footprint (~5MB due to mssql driver)
   - Used only by extensions that query databases
   - Depends on `shared`

## Package Structure

```
data-api-builder-vscode-ext/
├── package.json (workspace root)
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── types/
│       ├── terminal/
│       ├── config/
│       └── prompts/
│
├── shared-database/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── types/
│       └── mssql/
│
└── [extensions]/
    └── package.json (depends on shared and/or shared-database)
```

## Extension Dependencies

| Extension | shared | shared-database | Reason |
|-----------|--------|-----------------|--------|
| **omnibus-data-api-builder** | ✅ | ❌ | Meta-extension, no direct code |
| **init-data-api-builder** | ✅ | ❌ | Only terminal/config/prompts |
| **start-data-api-builder** | ✅ | ❌ | Only terminal commands |
| **validate-data-api-builder** | ✅ | ❌ | Only terminal commands |
| **health-data-api-builder** | ✅ | ❌ | Only terminal commands |
| **config-data-api-builder** | ✅ | ❌ | Only config file editing |
| **add-data-api-builder** | ✅ | ✅ | Queries database for entities |
| **poco-data-api-builder** | ✅ | ✅ | Queries database for POCO generation |
| **mcp-data-api-builder** | ✅ | ✅ | Queries database for MCP generation |
| **visualize-data-api-builder** | ✅ | ✅ | Queries database for Mermaid diagrams |

## 🚀 How to Run Tests

### From Workspace Root

```bash
# Install all dependencies first
npm install

# Build shared packages
npm run build:all-shared

# Run unit tests (no database required)
npm run test:shared

# Run integration tests (requires Trek database)
npm run test:integration

# Run all tests
npm run test:all
```

### From Individual Packages

```bash
# Test shared package
cd shared
npm test

# Test shared-database package
cd shared-database
npm run test:integration
```

### Test Commands Explained

| Command | What It Does | Requirements |
|---------|-------------|--------------|
| `npm run test:shared` | Runs unit tests for `shared` package | None - pure functions only |
| `npm run test:integration` | Runs integration tests against SQL Server | Trek database required |
| `npm run test:all` | Runs both unit and integration tests | Trek database required |
| `npm run build:all-shared` | Builds both shared packages | Must run before testing |

### Expected Output

**Success:**
```bash
c:\...\data-api-builder-vscode-ext>npm run test:shared

> data-api-builder-vscode-ext-workspace@1.0.0 test:shared
> cd shared && npm test

> dab-vscode-shared@1.0.0 test
> mocha out/test/**/*.test.js

  Config Utils
    extractEnvVarName
      ✔ should extract env var name from @env() syntax
      ✔ should return empty string for invalid syntax
      ✔ should handle single quotes
      ✔ should return empty string for empty input

  4 passing (3ms)
```

## Migration Checklist

### Phase 1: Setup ✅
- [x] Create SHARED-MIGRATION.md
- [ ] Create shared/ package structure
- [ ] Create shared-database/ package structure
- [ ] Create root workspace package.json
- [ ] Run `npm install` at root

### Phase 2: Migrate to `shared` package
- [ ] Migrate terminal/terminalManager.ts
  - [ ] From: add-data-api-builder/src/runTerminal.ts
  - [ ] From: start-data-api-builder/src/runTerminal.ts
  - [ ] From: validate-data-api-builder/src/runTerminal.ts
  - [ ] From: init-data-api-builder/src/terminalManager.ts
  
- [ ] Migrate config/readConfig.ts
  - [ ] From: add-data-api-builder/src/readConfig.ts
  - [ ] From: poco-data-api-builder/src/readConfig.ts
  - [ ] From: mcp-data-api-builder/src/readConfig.ts
  
- [ ] Migrate config/envManager.ts
  - [ ] From: init-data-api-builder/src/envManager.ts
  
- [ ] Migrate prompts/promptManager.ts
  - [ ] From: init-data-api-builder/src/promptManager.ts

### Phase 3: Migrate to `shared-database` package
- [ ] Migrate mssql/connection.ts
  - [ ] From: add-data-api-builder/src/mssql/querySql.ts (openConnection)
  - [ ] From: poco-data-api-builder/src/mssql/querySql.ts (openConnection)
  - [ ] From: mcp-data-api-builder/src/mssql/querySql.ts (openConnection)
  
- [ ] Migrate mssql/getTables.ts
  - [ ] From: visualize-data-api-builder/src/getTables.ts
  
- [ ] Migrate mssql/getViews.ts
  - [ ] From: visualize-data-api-builder/src/getViews.ts
  
- [ ] Migrate mssql/getProcs.ts
  - [ ] From: visualize-data-api-builder/src/getProcs.ts

### Phase 4: Update Extensions
- [ ] **init-data-api-builder**
  - [ ] Update package.json to depend on "shared": "*"
  - [ ] Replace imports: `./terminalManager` → `dab-vscode-shared/terminal`
  - [ ] Replace imports: `./envManager` → `dab-vscode-shared/config`
  - [ ] Replace imports: `./promptManager` → `dab-vscode-shared/prompts`
  - [ ] Delete: src/terminalManager.ts, src/envManager.ts, src/promptManager.ts
  - [ ] Test extension functionality

- [ ] **start-data-api-builder**
  - [ ] Update package.json to depend on "shared": "*"
  - [ ] Replace imports: `./runTerminal` → `dab-vscode-shared/terminal`
  - [ ] Delete: src/runTerminal.ts
  - [ ] Test extension functionality

- [ ] **validate-data-api-builder**
  - [ ] Update package.json to depend on "shared": "*"
  - [ ] Replace imports: `./runTerminal` → `dab-vscode-shared/terminal`
  - [ ] Delete: src/runTerminal.ts
  - [ ] Test extension functionality

- [ ] **health-data-api-builder**
  - [ ] Update package.json to depend on "shared": "*"
  - [ ] Test extension functionality

- [ ] **config-data-api-builder**
  - [ ] Update package.json to depend on "shared": "*"
  - [ ] Test extension functionality

- [ ] **add-data-api-builder**
  - [ ] Update package.json to depend on "shared": "*" and "shared-database": "*"
  - [ ] Replace imports: `./runTerminal` → `dab-vscode-shared/terminal`
  - [ ] Replace imports: `./readConfig` → `dab-vscode-shared/config`
  - [ ] Replace imports: `./mssql/querySql` → `dab-vscode-shared-database/mssql`
  - [ ] Delete: src/runTerminal.ts, src/readConfig.ts
  - [ ] Keep extension-specific mssql utilities (relationship helpers)
  - [ ] Test extension functionality

- [ ] **poco-data-api-builder**
  - [ ] Update package.json to depend on "shared": "*" and "shared-database": "*"
  - [ ] Replace imports: `./readConfig` → `dab-vscode-shared/config`
  - [ ] Replace imports: `./mssql/querySql` → `dab-vscode-shared-database/mssql`
  - [ ] Delete: src/readConfig.ts
  - [ ] Keep extension-specific mssql utilities (POCO generation)
  - [ ] Test extension functionality

- [ ] **mcp-data-api-builder**
  - [ ] Update package.json to depend on "shared": "*" and "shared-database": "*"
  - [ ] Replace imports: `./readConfig` → `dab-vscode-shared/config`
  - [ ] Replace imports: `./mssql/querySql` → `dab-vscode-shared-database/mssql`
  - [ ] Delete: src/readConfig.ts
  - [ ] Keep extension-specific mssql utilities (entity enrichment)
  - [ ] Test extension functionality

- [ ] **visualize-data-api-builder**
  - [ ] Update package.json to depend on "shared": "*" and "shared-database": "*"
  - [ ] Replace imports: `./getTables` → `dab-vscode-shared-database/mssql`
  - [ ] Replace imports: `./getViews` → `dab-vscode-shared-database/mssql`
  - [ ] Replace imports: `./getProcs` → `dab-vscode-shared-database/mssql`
  - [ ] Delete: src/getTables.ts, src/getViews.ts, src/getProcs.ts
  - [ ] Test extension functionality

### Phase 5: Testing & Validation
- [ ] Build all extensions successfully
- [ ] Run existing tests (if any)
- [ ] Manual smoke test each extension
- [ ] Verify extension sizes didn't bloat
- [ ] Test packaging with package.bat

### Phase 6: Documentation
- [ ] Update README.md in root
- [ ] Add README.md to shared package
- [ ] Add README.md to shared-database package
- [ ] Document development workflow

## Notes

### Import Patterns

**Before:**
```typescript
import { runCommand } from './runTerminal';
import { readConfig } from './readConfig';
import { openConnection } from './mssql/querySql';
```

**After:**
```typescript
import { runCommand } from 'dab-vscode-shared/terminal';
import { readConfig, getConnectionString } from 'dab-vscode-shared/config';
import { openConnection, getTables } from 'dab-vscode-shared-database/mssql';
```

### Build Commands

```bash
# At workspace root
npm install

# Build shared packages
cd shared && npm run build && cd ..
cd shared-database && npm run build && cd ..

# Build individual extension
cd add-data-api-builder && npm run compile && cd ..
```

### Testing Individual Extensions

After migration, test each extension:
1. Open VS Code in extension folder
2. Press F5 to launch Extension Development Host
3. Test all commands
4. Verify no runtime errors

## Benefits

✅ **Reduced duplication** - Common code in one place  
✅ **Easier maintenance** - Fix bugs once, benefit all extensions  
✅ **Better testing** - Test shared code independently  
✅ **Type safety** - Shared types prevent drift  
✅ **Smaller bundles** - Extensions without DB stay lightweight  
✅ **Faster development** - Reuse proven implementations

---

## ⚠️ Important Notes & Lessons Learned

### Testing Considerations

**VS Code API Cannot Be Tested in Mocha:**
- ❌ The `vscode` module only exists in Extension Development Host
- ❌ Cannot `import * as vscode from 'vscode'` in plain Node.js tests
- ✅ **Solution**: Extract pure utility functions into separate files (e.g., `utils.ts`)
- ✅ Test pure functions that don't use VS Code APIs
- ✅ For VS Code-specific code, rely on extension integration tests

**Example Pattern:**
```typescript
// ❌ BAD - Can't test in Mocha
export function readConfig(path: string): Config {
    vscode.window.showErrorMessage(...);  // Uses VS Code API
    return parseConfig();
}

// ✅ GOOD - Testable
// utils.ts
export function extractEnvVarName(conn: string): string {
    return conn.match(/@env\('(.+?)'\)/)?.[1] || '';
}

// readConfig.ts (imports from utils)
export { extractEnvVarName } from './utils';
export function readConfig(path: string): Config {
    vscode.window.showErrorMessage(...);  // VS Code API only here
    const envVar = extractEnvVarName(conn);  // Testable function
    return parseConfig();
}
```

### VS Code API Gotchas

**Terminal API:**
- ❌ `terminal.exitStatus` - Does NOT exist in VS Code API
- ✅ Use `vscode.window.terminals.includes(terminal)` to check if terminal still exists
- ✅ Terminal disposal: Always call `terminal.dispose()` before creating new one

**Correct Terminal Pattern:**
```typescript
const terminalClosed = dabTerminal && !vscode.window.terminals.includes(dabTerminal);
if (!dabTerminal || terminalClosed || expired) {
    dabTerminal?.dispose();
    dabTerminal = vscode.window.createTerminal({ name: TERMINAL_NAME, cwd });
}
```

### Package Dependencies

**Two-Tier Approach:**
1. **`shared`** - NO database dependencies
   - Keep it lightweight (~50KB)
   - Only depends on `vscode` package
   - Used by ALL extensions

2. **`shared-database`** - Depends on `mssql`
   - Larger footprint (~5MB)
   - Only used by extensions that query databases
   - Depends on both `mssql` AND `shared`

**Why This Matters:**
- Extensions that only run CLI commands (start, validate, health) stay tiny
- Users don't download SQL drivers they don't need
- Marketplace bundles remain optimized

### NPM Workspace Setup

**Critical Files:**
1. **Root `package.json`** must include:
   ```json
   {
     "private": true,
     "workspaces": ["shared", "shared-database", "extension-name", ...]
   }
   ```

2. **Extension `package.json`** dependencies:
   ```json
   {
     "dependencies": {
       "dab-vscode-shared": "*",           // All extensions
       "dab-vscode-shared-database": "*"   // Only if DB needed
     }
   }
   ```

3. **Build Order Matters:**
   - Must build `shared` before `shared-database` (depends on it)
   - Must build both before building extensions
   - Use `npm run build:all-shared` before packaging

### Import Paths

**After migration, imports change:**

**Before:**
```typescript
import { runCommand } from './runTerminal';
import { readConfig } from './readConfig';
```

**After:**
```typescript
import { runCommand } from 'dab-vscode-shared/terminal';
import { readConfig, getConnectionString } from 'dab-vscode-shared/config';
import { openConnection, getTables } from 'dab-vscode-shared-database/mssql';
```

### TypeScript Configuration

**tsconfig.json must include:**
```json
{
  "compilerOptions": {
    "types": ["node", "mocha"]  // For test files
  }
}
```

### Testing Setup

**Run tests in this order:**
1. `npm run test:shared` - Unit tests (no DB)
2. `npm run test:integration` - Integration tests (requires Trek DB)
3. Only integration tests need SQL Server

**Working Test Syntax:**

**Unit Test (shared/src/test/config.test.ts):**
```typescript
import * as assert from 'assert';
import { extractEnvVarName } from '../config/utils';  // Import from utils, NOT readConfig

describe('Config Utils', () => {
    describe('extractEnvVarName', () => {
        it('should extract env var name from @env() syntax', () => {
            const result = extractEnvVarName("@env('DB_CONNECTION')");
            assert.strictEqual(result, 'DB_CONNECTION');
        });

        it('should return empty string for invalid syntax', () => {
            const result = extractEnvVarName("Server=localhost;Database=test");
            assert.strictEqual(result, '');
        });

        it('should handle single quotes', () => {
            const result = extractEnvVarName("@env('MSSQL_CONNECTION_STRING')");
            assert.strictEqual(result, 'MSSQL_CONNECTION_STRING');
        });

        it('should return empty string for empty input', () => {
            const result = extractEnvVarName("");
            assert.strictEqual(result, '');
        });
    });
});
```

**Integration Test (shared-database/src/test/integration.test.ts):**
```typescript
import * as assert from 'assert';
import { openConnection, getTables, getViews } from '../../mssql';

const connectionString = process.env.TEST_SQL_CONNECTION_STRING || 
    'Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;';

describe('SQL Server Integration Tests', function() {
    // Increase timeout for database operations
    this.timeout(10000);

    describe('openConnection', () => {
        it('should connect to SQL Server', async () => {
            const pool = await openConnection(connectionString);
            assert.ok(pool, 'Connection pool should be created');
            assert.strictEqual(pool?.connected, true, 'Should be connected');
            await pool?.close();
        });
    });

    describe('getTables', () => {
        it('should retrieve Trek database tables', async () => {
            const pool = await openConnection(connectionString);
            if (!pool) {
                assert.fail('Failed to connect to database');
                return;
            }

            const tables = await getTables(pool);
            await pool.close();

            assert.ok(tables.length > 0, 'Should have at least one table');
            
            // Check for expected Trek tables
            const tableNames = tables.map(t => t.name);
            assert.ok(tableNames.includes('Actor'), 'Should include Actor table');
            assert.ok(tableNames.includes('Character'), 'Should include Character table');
            assert.ok(tableNames.includes('Series'), 'Should include Series table');
        });

        it('should include column metadata for Actor table', async () => {
            const pool = await openConnection(connectionString);
            if (!pool) {
                assert.fail('Failed to connect to database');
                return;
            }

            const tables = await getTables(pool);
            await pool.close();

            const actor = tables.find(t => t.name === 'Actor');
            assert.ok(actor, 'Actor table should exist');
            assert.ok(actor!.columns.length > 0, 'Actor should have columns');
            
            const idColumn = actor!.columns.find(c => c.name === 'Id');
            assert.ok(idColumn, 'Should have Id column');
            assert.strictEqual(idColumn!.isPrimaryKey, true, 'Id should be primary key');
        });
    });
});
```

**Test Output (Success):**
```bash
> dab-vscode-shared@1.0.0 test
> mocha out/test/**/*.test.js

  Config Utils
    extractEnvVarName
      ✔ should extract env var name from @env() syntax
      ✔ should return empty string for invalid syntax
      ✔ should handle single quotes
      ✔ should return empty string for empty input

  4 passing (3ms)
```

**Key Points:**
- ✅ Tests must import from pure utility files (no VS Code API)
- ✅ Use Node's built-in `assert` module
- ✅ Use `describe()` and `it()` from Mocha
- ✅ Integration tests should close connections: `await pool.close()`
- ✅ Use `this.timeout(10000)` for database tests
- ✅ Always check for null/undefined before using results

**Connection String for Tests:**
```bash
# Default (Windows Authentication)
Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;

# Or set custom:
set TEST_SQL_CONNECTION_STRING=Server=...;Database=Trek;...
```

### File Cleanup Checklist

**When migrating an extension:**
1. ✅ Update `package.json` dependencies
2. ✅ Update all import statements
3. ✅ Delete migrated files (runTerminal.ts, readConfig.ts, etc.)
4. ✅ Keep extension-specific files (relationship helpers, POCO generators, etc.)
5. ✅ Test extension in Extension Development Host (F5)
6. ✅ Verify extension size didn't bloat
7. ✅ Package with `vsce package` to verify .vsix builds

### Common Pitfalls

**❌ Don't:**
- Import entire modules: `import * as shared from 'dab-vscode-shared'`
- Add database dependencies to `shared` package
- Test VS Code APIs in Mocha (will fail)
- Forget to run `npm install` at workspace root
- Skip building shared packages before extensions

**✅ Do:**
- Use specific imports: `import { runCommand } from 'dab-vscode-shared/terminal'`
- Keep shared packages focused and minimal
- Extract pure functions for testing
- Build shared packages first: `npm run build:all-shared`
- Test each extension after migration

### Migration Order Recommendation

**Migrate in this order:**
1. **Simple extensions first** (start, validate, health) - Only need `shared`
2. **Medium complexity** (init, config) - Only need `shared`
3. **Database extensions last** (add, poco, mcp, visualize) - Need both packages

**Why:** Build confidence with simple migrations before tackling complex ones.

### Debugging Tips

**If tests fail:**
- Check `vscode` imports in test files (extract to utils)
- Verify build completed: `npm run build`
- Check import paths are correct
- Ensure workspace `npm install` ran successfully

**If extension fails to load:**
- Check all imports updated from `./file` to `package/path`
- Verify shared packages built successfully
- Check extension's package.json has correct dependencies
- Press F5 and check Debug Console for errors

### Performance Notes

**Bundle Sizes:**
- `shared` package compiles to ~50KB
- `shared-database` adds ~5MB (due to mssql driver)
- Extensions should not increase in size if dependencies correct
- Use webpack for extensions that need smaller bundles

### Version Management

**Keep versions in sync:**
- All shared packages use version `1.0.0`
- Extensions reference with `"*"` (workspace link)
- Bump versions together when publishing
- Consider semantic versioning for breaking changes
