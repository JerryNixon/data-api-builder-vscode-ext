# Shared Packages - Testing Guide

## Running Tests

### Test `shared` package (no database required)
```bash
cd shared
npm test
```

### Test `shared-database` package

**Unit tests only (no database):**
```bash
cd shared-database
npm test
```

**Integration tests with SQL Server:**
```bash
cd shared-database

# Optional: Set custom connection string
set TEST_SQL_CONNECTION_STRING=Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;

npm run test:integration
```

## Test Database Schema

The integration tests use the **Trek** database with this schema:
- `Series` - TV series
- `Actor` - Actors with names and birth year
- `Character` - Characters played by actors
- `Species` - Alien species
- `Series_Character` - Many-to-many linking table
- `Character_Species` - Many-to-many linking table

## Test List

### `shared` Package Tests (src/test/config.test.ts)

**Config Utils:**
- ✔ should extract env var name from @env() syntax
- ✔ should return empty string for invalid syntax
- ✔ should handle single quotes
- ✔ should return empty string for empty input

### `shared-database` Package Tests (src/test/integration.test.ts)

**SQL Server Integration Tests > openConnection:**
- ✔ should connect to SQL Server

**SQL Server Integration Tests > getTables:**
- ✔ should retrieve Trek database tables
- ✔ should include column metadata for Actor table

**SQL Server Integration Tests > getViews:**
- ✔ should retrieve views (may be empty)

## What Tests Validate

**`shared` package:**
✅ Environment variable extraction from `@env('VAR')` syntax
✅ Handling invalid connection string formats
✅ Pure utility function logic (no VS Code dependencies)

**`shared-database` package:**
✅ Connection to SQL Server
✅ Table metadata retrieval (finds Actor, Character, Series tables)
✅ Column metadata and primary key detection
✅ View metadata (if any exist)
✅ Proper connection cleanup (closes pools)

## Default Connection

If `TEST_SQL_CONNECTION_STRING` is not set, tests use:
```
Server=localhost;Database=Trek;Integrated Security=true;TrustServerCertificate=true;
```
