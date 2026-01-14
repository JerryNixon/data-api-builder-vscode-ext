# Troubleshooting Guide

## Common Issues and Solutions

### Add Extension Issues

#### Issue: Relationships keep appearing after being added
**Symptoms:** After adding a relationship successfully, the same relationship appears in the selection list again.

**Cause:** The filtering logic wasn't correctly parsing relationship fields from the config JSON. The config stores fields as `source.fields` and `target.fields` arrays, but the code was looking for `relationship.fields` (which is CLI syntax only).

**Solution:** Read relationship fields directly from the JSON structure:
```typescript
// ❌ Wrong - relationship.fields doesn't exist in JSON
const fields = rel["relationship.fields"]?.split(':') || ['', ''];
sourceFields: fields[0]?.split(',')

// ✅ Correct - use source.fields and target.fields
sourceFields: rel["source.fields"] || [],
targetFields: rel["target.fields"] || []
```

Additionally, ensure bidirectional relationship checking (both "one" and "many" sides):
```typescript
const exists = entities.some(entity => {
  if (entity.name === sourceAlias) {
    return (entity.relationships)?.some((rel) =>
      rel.cardinality === 'one' &&
      rel.target === targetAlias &&
      arraysMatch(rel.sourceFields, sourceFields) &&
      arraysMatch(rel.targetFields, targetFields)
    );
  }
  if (entity.name === targetAlias) {
    return (entity.relationships)?.some((rel) =>
      rel.cardinality === 'many' &&
      rel.target === sourceAlias &&
      arraysMatch(rel.sourceFields, targetFields) &&
      arraysMatch(rel.targetFields, sourceFields)
    );
  }
  return false;
});
```

#### Issue: "Cannot read properties of undefined (reading 'length')"
**Symptoms:** Error occurs when trying to add a second relationship after successfully adding the first.

**Cause:** The `getExistingRelationships()` function was trying to call `.split()` on undefined values when relationship fields were missing or null.

**Solution:** Use proper null safety with optional chaining and default values:
```typescript
// ❌ Wrong - fields[0] might be undefined
sourceFields: rel["relationship.fields"]?.split(':')[0].split(',')

// ✅ Correct - check at each step
const fields = rel["relationship.fields"]?.split(':') || ['', ''];
sourceFields: fields[0]?.split(',').filter(Boolean) || []
```

Better yet, read directly from the JSON structure (see previous issue).

#### Issue: Stored procedure parameters added as fields
**Symptoms:** Using `--source.params` during `dab add` causes "Invalid format" error or parameters appear as entity fields instead of stored procedure parameters.

**Cause:** The `--source.params` flag is not valid during `dab add` for stored procedures. DAB auto-introspects parameters.

**Solution:** Remove `--source.params` from the add command, then add parameter descriptions separately:
```bash
# Step 1: Add the stored procedure (no --source.params)
dab add GetBook --source "get_book_by_id" --source.type "stored-procedure" --permissions "anonymous:execute"

# Step 2: Add parameter descriptions
dab update GetBook --parameters.name id --parameters.description "Book ID (int)"
```

#### Issue: Entity names with brackets cause errors
**Symptoms:** DAB CLI errors when entity names contain square brackets like `[Actor]`.

**Solution:** Strip brackets from entity names before using in DAB commands:
```typescript
const entityName = procedureName.replace(/[\[\]]/g, '');
```

#### Issue: Missing --fields.primary-key parameter
**Symptoms:** DAB CLI error when adding field descriptions to tables/views.

**Cause:** The `--fields.primary-key` parameter is required for all fields, even when setting to false.

**Solution:** Always include the primary-key flag:
```typescript
const cmd = `dab update ${entityName} ` +
  `--fields.name "${columnName}" ` +
  `--fields.description "${description}" ` +
  `--fields.primary-key ${isPrimaryKey}`;  // Required!
```

### VS Code API Issues

#### Issue: Cannot find module 'vscode'
**Symptoms:**
```
Error: Cannot find module 'vscode'
Require stack:
- c:\...\shared\out\config\readConfig.js
- c:\...\shared\out\test\config.test.js
```

**Cause:** Test file imports from a module that uses the VS Code API. The `vscode` module only exists in Extension Development Host, not in Node.js/Mocha.

**Solution:**
1. Extract pure logic to a `utils.ts` file
2. Import from `utils.ts` in tests, not from the main file
3. Re-export from main file for API compatibility

```typescript
// utils.ts (no vscode import)
export function extractEnvVarName(conn: string): string {
    const match = conn.match(/@env\(\s*['"](.+?)['"]\s*\)/);
    return match ? match[1].trim() : '';
}

// readConfig.ts (uses vscode)
import * as vscode from 'vscode';
export { extractEnvVarName } from './utils';  // Re-export

// config.test.ts (test file)
import { extractEnvVarName } from '../config/utils';  // Import from utils!
```

#### Issue: Terminal.exitStatus property doesn't exist
**Symptoms:**
```
TypeError: Cannot read property 'exitStatus' of undefined
```

**Cause:** The VS Code API doesn't have an `exitStatus` property on Terminal objects.

**Solution:** Use `vscode.window.terminals.includes(terminal)` to check if terminal still exists:

```typescript
// ❌ Wrong
if (dabTerminal && !dabTerminal.exitStatus) { ... }

// ✅ Correct
const terminalClosed = dabTerminal && !vscode.window.terminals.includes(dabTerminal);
if (!dabTerminal || terminalClosed || expired) {
    dabTerminal?.dispose();
    dabTerminal = vscode.window.createTerminal({ name, cwd });
}
```

### Testing Issues

#### Issue: Fixture file not found
**Symptoms:**
```
Error: ENOENT: no such file or directory, open 'C:\...\shared\out\test\fixtures\dab-config.json'
```

**Cause:** Tests run from compiled output directory (`out/test/`), but fixture files aren't copied during TypeScript compilation.

**Solution:** Reference fixtures from source directory:

```typescript
// ❌ Wrong
const fixturesPath = path.join(__dirname, 'fixtures');

// ✅ Correct
const fixturesPath = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures');
```

#### Issue: Tests pass locally but fail in CI
**Cause:** Missing environment variables or database connection

**Solution:** Set `TEST_SQL_CONNECTION_STRING` environment variable or use default:
```typescript
const connectionString = process.env.TEST_SQL_CONNECTION_STRING || 
    'Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;';
```

#### Issue: Database connection timeout
**Symptoms:**
```
Error: Timeout of 2000ms exceeded
```

**Cause:** Default Mocha timeout (2 seconds) too short for database operations

**Solution:** Increase timeout for database tests:
```typescript
describe('SQL Server Integration Tests', function() {
    this.timeout(10000);  // 10 seconds
    
    it('should query database', async () => {
        // ... test code
    });
});
```

#### Issue: Connection pool not closed
**Symptoms:** Tests hang or don't complete

**Cause:** Forgot to close SQL connection pool

**Solution:** Always close connections:
```typescript
it('should query database', async () => {
    const pool = await openConnection(connectionString);
    if (!pool) {
        assert.fail('Failed to connect');
        return;
    }

    const results = await yourQuery(pool);
    await pool.close();  // ✅ Always close!
    
    assert.ok(results.length > 0);
});
```

### Build Issues

#### Issue: npm install fails with "Cannot read properties of null"
**Symptoms:**
```
npm error Cannot read properties of null (reading 'location')
```

**Cause:** Corrupted npm cache or workspace state

**Solution:**
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` folders: `rmdir /s /q node_modules`
3. Delete `package-lock.json`
4. Run `npm install` again

#### Issue: TypeScript compiler not found
**Symptoms:**
```
'tsc' is not recognized as an internal or external command
```

**Cause:** Dependencies not installed or not in PATH

**Solution:**
1. Run `npm install` at workspace root
2. Use npx: `npx tsc`
3. Or use full path: `node node_modules/typescript/bin/tsc`

#### Issue: Build succeeds but tests fail
**Cause:** Stale compiled output from old code

**Solution:** Clean and rebuild:
```bash
# From shared package directory
npm run clean
npm run build
npm test
```

### Import Issues

#### Issue: Module not found after migration
**Symptoms:**
```
Cannot find module 'dab-vscode-shared/terminal'
```

**Cause:** Package not built or not linked properly

**Solution:**
1. Build shared packages: `npm run build:all-shared`
2. Run `npm install` at workspace root
3. Verify `node_modules` has symbolic links to shared packages

#### Issue: Wrong import path
**Symptoms:** Extension fails to load in Extension Development Host

**Cause:** Using old local imports instead of package imports

**Solution:** Update all imports:
```typescript
// ❌ Before migration
import { runCommand } from './runTerminal';
import { readConfig } from '../config/readConfig';

// ✅ After migration
import { runCommand } from 'dab-vscode-shared/terminal';
import { readConfig } from 'dab-vscode-shared/config';
```

### Extension Issues

#### Issue: Extension fails to activate
**Symptoms:** Extension doesn't load in Extension Development Host

**Cause:** Missing dependencies or activation events

**Solution:**
1. Check package.json has correct dependencies:
   ```json
   "dependencies": {
     "dab-vscode-shared": "*"
   }
   ```
2. Check activation events in package.json:
   ```json
   "activationEvents": ["onCommand:your.command"]
   ```
3. Check Debug Console for errors (F5 → Debug Console)

#### Issue: Extension size bloated after migration
**Cause:** Unnecessarily including database package

**Solution:** Only include `shared-database` if extension queries databases:
```json
{
  "dependencies": {
    "dab-vscode-shared": "*"
    // Only add shared-database if you need SQL queries
  }
}
```

### Database Issues

#### Issue: Cannot connect to Trek database
**Symptoms:**
```
Error: Login failed for user
```

**Cause:** Incorrect connection string or permissions

**Solution:**
1. Check SQL Server is running
2. Verify database name: `Trek`
3. Test connection string:
   ```
   Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;
   ```
4. Ensure Windows Authentication has access to Trek database

#### Issue: Trek database doesn't exist
**Cause:** Test database not set up

**Solution:** Create Trek database with schema:
```sql
CREATE DATABASE Trek;
GO

USE Trek;
GO

CREATE TABLE Actor (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100),
    BirthYear INT
);

CREATE TABLE Character (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100),
    ActorId INT FOREIGN KEY REFERENCES Actor(Id)
);

CREATE TABLE Series (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100),
    Year INT
);

-- Add sample data
INSERT INTO Actor (Name, BirthYear) VALUES ('Patrick Stewart', 1940);
INSERT INTO Actor (Name, BirthYear) VALUES ('William Shatner', 1931);
INSERT INTO Series (Name, Year) VALUES ('The Next Generation', 1987);
```

### PowerShell Execution Policy Issues

#### Issue: npm command blocked by execution policy
**Symptoms:**
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled
```

**Cause:** PowerShell execution policy blocking npm scripts

**Solution:**
1. Use cmd.exe instead of PowerShell
2. Or temporarily allow scripts in current session:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
   ```
3. Or use tasks in VS Code (automatically uses cmd.exe)

### Workspace Issues

#### Issue: Workspace packages not linking
**Cause:** Workspace configuration not correct

**Solution:** Verify root package.json has workspaces:
```json
{
  "private": true,
  "workspaces": [
    "shared",
    "shared-database",
    "add-data-api-builder",
    "poco-data-api-builder",
    ...
  ]
}
```

#### Issue: Changes to shared package not reflected in extension
**Cause:** Shared package not rebuilt after changes

**Solution:** Always rebuild after editing shared packages:
```bash
cd shared
npm run build
```

## Debugging Checklist

### Before Migration
- [ ] Extension works in Extension Development Host (F5)
- [ ] All commands execute successfully
- [ ] No runtime errors in Debug Console

### During Migration
- [ ] Updated package.json dependencies
- [ ] Updated all import statements
- [ ] Deleted old local files
- [ ] Built shared packages
- [ ] Ran npm install at root

### After Migration
- [ ] Extension activates in Extension Development Host
- [ ] All commands still work
- [ ] No import errors
- [ ] Extension size similar or smaller
- [ ] Package builds with vsce package

## Getting Help

### Debug Information to Collect
1. **Error message** - Full stack trace
2. **VS Code version** - Help → About
3. **Node version** - `node --version`
4. **npm version** - `npm --version`
5. **Extension manifest** - package.json
6. **Import statements** - What you're importing
7. **File structure** - `tree /f` or `ls -R`

### Log Locations
- Extension Development Host Debug Console
- Terminal output (for npm commands)
- npm-debug.log (if npm crashes)
- VS Code logs: Help → Toggle Developer Tools → Console

### Common Commands for Diagnosis
```bash
# Check if package is linked
npm ls dab-vscode-shared

# Verify TypeScript compilation
npx tsc --noEmit

# Test imports
node -e "require('dab-vscode-shared/terminal')"

# Check for TypeScript errors
npm run build
```