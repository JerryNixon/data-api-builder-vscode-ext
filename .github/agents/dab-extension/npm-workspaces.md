# NPM Workspace Management

## Workspace Structure

The DAB extension suite uses NPM workspaces to manage multiple packages in a monorepo:

```
data-api-builder-vscode-ext/
├── package.json (workspace root)
├── shared/
├── shared-database/
├── add-data-api-builder/
├── poco-data-api-builder/
├── mcp-data-api-builder/
├── visualize-data-api-builder/
├── init-data-api-builder/
├── start-data-api-builder/
├── validate-data-api-builder/
├── health-data-api-builder/
├── config-data-api-builder/
└── omnibus-data-api-builder/
```

## Root package.json

```json
{
  "name": "data-api-builder-vscode-ext-workspace",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "shared",
    "shared-database",
    "add-data-api-builder",
    "poco-data-api-builder",
    "mcp-data-api-builder",
    "visualize-data-api-builder",
    "init-data-api-builder",
    "start-data-api-builder",
    "validate-data-api-builder",
    "health-data-api-builder",
    "config-data-api-builder",
    "omnibus-data-api-builder"
  ],
  "scripts": {
    "build:all-shared": "cd shared && npm run build && cd ../shared-database && npm run build",
    "test:shared": "cd shared && npm test",
    "test:integration": "cd shared-database && npm run test:integration",
    "test:all": "npm run test:shared && npm run test:integration",
    "clean": "rimraf shared/out shared-database/out */out"
  },
  "devDependencies": {
    "rimraf": "^5.0.0"
  }
}
```

## How Workspaces Work

### Package Linking
When you run `npm install` at the workspace root:

1. NPM reads the `workspaces` array
2. Creates symlinks in `node_modules/`:
   ```
   node_modules/
   ├── dab-vscode-shared -> ../shared
   └── dab-vscode-shared-database -> ../shared-database
   ```
3. Extensions can import as if packages were published to npm

### Dependency Resolution
```json
// Extension package.json
{
  "dependencies": {
    "dab-vscode-shared": "*"
  }
}
```

The `*` version means "use the workspace version" - NPM will link to the local package instead of downloading from npm registry.

## Commands

### Install All Dependencies
```bash
npm install
```

Runs `npm install` for workspace root AND all workspace packages. Dependencies are hoisted to root `node_modules` when possible.

### Build All Shared Packages
```bash
npm run build:all-shared
```

Builds `shared` first, then `shared-database` (which depends on `shared`).

### Run Tests
```bash
npm run test:shared        # Unit tests only
npm run test:integration   # Integration tests (requires database)
npm run test:all          # Both
```

### Clean Build Artifacts
```bash
npm run clean
```

Removes all `out/` directories from packages.

## Workspace-Specific Commands

### Run Command in Specific Package
```bash
npm run <script> --workspace=<package-name>

# Examples:
npm run build --workspace=shared
npm test --workspace=shared-database
```

### Run Command in All Workspaces
```bash
npm run <script> --workspaces

# Example:
npm run build --workspaces
```

### Install Dependency in Specific Package
```bash
npm install <package> --workspace=<workspace-name>

# Example:
npm install lodash --workspace=add-data-api-builder
```

## Dependency Management

### Types of Dependencies

**Workspace Dependencies** (use `*` version):
```json
{
  "dependencies": {
    "dab-vscode-shared": "*",
    "dab-vscode-shared-database": "*"
  }
}
```

**External Dependencies** (normal versions):
```json
{
  "dependencies": {
    "vscode": "^1.1.37"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "typescript": "^5.3.0"
  }
}
```

### Hoisting

NPM hoists shared dependencies to the root `node_modules` to avoid duplication:

```
data-api-builder-vscode-ext/
├── node_modules/
│   ├── typescript/      (shared by all packages)
│   ├── mocha/          (shared by test packages)
│   └── mssql/          (used by shared-database)
└── shared-database/
    └── node_modules/    (package-specific deps only)
```

## Build Order

**Important:** Build shared packages before extensions.

```bash
# 1. Build shared (no dependencies)
cd shared && npm run build

# 2. Build shared-database (depends on shared)
cd shared-database && npm run build

# 3. Build extensions (depend on shared packages)
cd add-data-api-builder && npm run compile
```

Or use the convenience script:
```bash
npm run build:all-shared
```

## Package Visibility

### Public vs Private

**Root workspace** (private):
```json
{
  "private": true
}
```

**Shared packages** (could be published):
```json
{
  "name": "dab-vscode-shared",
  "version": "1.0.0",
  "license": "MIT"
}
```

**Extensions** (published to VS Code Marketplace):
```json
{
  "name": "add-data-api-builder",
  "version": "1.0.0",
  "publisher": "your-publisher"
}
```

## Version Management

### Synchronized Versions

Keep shared package versions in sync:
```json
// shared/package.json
{ "version": "1.0.0" }

// shared-database/package.json
{ "version": "1.0.0" }
```

### Extension Versions

Extensions can have independent versions:
```json
// add-data-api-builder/package.json
{ "version": "2.1.0" }

// poco-data-api-builder/package.json
{ "version": "1.5.3" }
```

### Updating Versions

```bash
# Update shared package version
cd shared
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

## Common Workflows

### Adding New Shared Utility

1. Add function to `shared/src/` or `shared-database/src/`
2. Export from `index.ts`
3. Build package: `npm run build`
4. Import in extension:
   ```typescript
   import { newFunction } from 'dab-vscode-shared/module';
   ```

### Adding New Extension

1. Create extension folder
2. Add to workspace array in root `package.json`
3. Create extension `package.json` with dependencies
4. Run `npm install` at root
5. Develop extension code
6. Build and test

### Updating Shared Package

1. Make changes to shared package code
2. Rebuild: `cd shared && npm run build`
3. Extensions automatically use new version (symlinked)
4. Test affected extensions

## Best Practices

### ✅ Do
- Run `npm install` at workspace root (not in individual packages)
- Use `*` version for workspace dependencies
- Build shared packages before extensions
- Use workspace scripts for common tasks
- Keep shared package versions synchronized

### ❌ Don't
- Run `npm install` in individual workspace packages
- Use specific versions for workspace dependencies
- Commit `node_modules` to source control
- Mix workspace and non-workspace packages in same repo
- Forget to rebuild shared packages after changes

## Troubleshooting

### Issue: Extension can't find shared package
**Solution:** Run `npm install` at workspace root

### Issue: Changes to shared package not reflected
**Solution:** Rebuild shared package (`npm run build`)

### Issue: Dependency version conflicts
**Solution:** Delete all `node_modules` and `package-lock.json`, run `npm install`

### Issue: Workspace package not linking
**Solution:** Verify package listed in workspaces array, run `npm install`

## Package Scripts

Common scripts across packages:

```json
{
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "clean": "rimraf out",
    "test": "mocha out/test/**/*.test.js",
    "pretest": "npm run build"
  }
}
```

These can be run with:
```bash
npm run build --workspace=shared
npm run test --workspace=shared-database
```