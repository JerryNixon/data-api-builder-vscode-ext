# TypeScript Configuration

## Shared Package tsconfig.json

Both `shared` and `shared-database` packages use similar TypeScript configurations:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./out",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node", "mocha"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "out"]
}
```

## Extension tsconfig.json

Extensions typically use:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./out",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "out"]
}
```

## Key Compiler Options

### target
**Value:** `ES2020`  
**Purpose:** JavaScript version to compile to. ES2020 is well-supported in modern VS Code.

### module
**Value:** `commonjs`  
**Purpose:** Module system. CommonJS is required for VS Code extensions.

### lib
**Value:** `["ES2020"]`  
**Purpose:** Type definitions for JavaScript features. Includes Promise, async/await, etc.

### outDir
**Value:** `./out`  
**Purpose:** Where compiled JavaScript goes. Standard for VS Code extensions.

### rootDir
**Value:** `./src`  
**Purpose:** Root of source files. Maintains directory structure in output.

### strict
**Value:** `true`  
**Purpose:** Enables all strict type checking options:
- strictNullChecks
- strictFunctionTypes
- strictBindCallApply
- strictPropertyInitialization
- noImplicitThis
- alwaysStrict

### declaration
**Value:** `true` (shared packages only)  
**Purpose:** Generate `.d.ts` type definition files for package consumers.

### declarationMap
**Value:** `true` (shared packages only)  
**Purpose:** Generate source maps for `.d.ts` files. Helps with "Go to Definition" in IDEs.

### sourceMap
**Value:** `true`  
**Purpose:** Generate `.js.map` files for debugging compiled code.

### types
**Value:** `["node", "mocha"]` (test packages)  
**Purpose:** Include type definitions for Node.js and Mocha testing framework.

## Module Resolution

TypeScript automatically resolves workspace packages:

```typescript
// In extension code
import { runCommand } from 'dab-vscode-shared/terminal';
import { getTables } from 'dab-vscode-shared-database/mssql';
```

This works because:
1. Workspace root `package.json` defines workspaces
2. npm creates symlinks in `node_modules`
3. TypeScript follows symlinks to find `.d.ts` files

## Building

### Individual Package
```bash
cd shared
npm run build  # Runs: tsc
```

### All Shared Packages
```bash
npm run build:all-shared  # From workspace root
```

### Watch Mode
```bash
cd shared
npm run watch  # Runs: tsc --watch
```

## Common Issues

### Error: Cannot find module 'vscode'
**Cause:** Missing `@types/vscode` dependency

**Fix:**
```json
{
  "devDependencies": {
    "@types/vscode": "^1.85.0"
  }
}
```

### Error: Type 'X' is not assignable to type 'Y'
**Cause:** Strict type checking enabled

**Fix:** Use proper types:
```typescript
// ❌ Wrong
let value: any = getSomeValue();

// ✅ Correct
let value: string | null = getSomeValue();
if (value !== null) {
    // Use value
}
```

### Error: Cannot write file because it would overwrite input file
**Cause:** `outDir` same as `rootDir`

**Fix:** Ensure separate directories:
```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./out"
  }
}
```

## Best Practices

### ✅ Do
- Enable `strict` mode for better type safety
- Use `declaration: true` for shared packages
- Keep `outDir` separate from `rootDir`
- Include source maps for debugging
- Use specific types instead of `any`

### ❌ Don't
- Disable strict checking
- Mix source and output directories
- Commit compiled files to source control
- Use `any` type unnecessarily

## Type Definitions

### Shared Package Types

Located in `shared/src/types/`:

```typescript
// types/config.ts
export interface DabConfig {
    'data-source': DataSource;
    runtime: Runtime;
    entities: Record<string, EntityDefinition>;
}

export interface DataSource {
    'database-type': string;
    'connection-string': string;
    options?: Record<string, any>;
}

export interface EntityDefinition {
    source: EntitySource;
    graphql?: any;
    rest?: any;
    permissions: Permission[];
    relationships?: Record<string, Relationship>;
}
```

### Using Types

```typescript
import type { DabConfig, EntityDefinition } from 'dab-vscode-shared/types';

function processConfig(config: DabConfig): void {
    const entities: Record<string, EntityDefinition> = config.entities;
    // Type-safe access
}
```

## Compilation Process

1. **Parse** - TypeScript reads `.ts` files
2. **Type Check** - Validates types, catches errors
3. **Transform** - Converts TypeScript to JavaScript
4. **Emit** - Writes `.js`, `.d.ts`, `.map` files to `outDir`

## Performance Tips

### Incremental Compilation
Use `--incremental` flag for faster rebuilds:
```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./out/.tsbuildinfo"
  }
}
```

### Skip Lib Check
Skip type checking of declaration files:
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

This speeds up compilation but may miss type errors in dependencies.