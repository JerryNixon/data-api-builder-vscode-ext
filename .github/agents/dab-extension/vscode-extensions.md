# VS Code Extension Development Guide

## Extension Structure

Each DAB extension follows the standard VS Code extension structure:

```
extension-name/
├── package.json         # Extension manifest
├── tsconfig.json        # TypeScript configuration
├── webpack.config.js    # Build configuration (optional)
├── src/
│   ├── extension.ts     # Extension entry point
│   └── ...             # Extension-specific code
├── images/              # Extension icons
└── CHANGELOG.md         # Version history
```

## Extension Manifest (package.json)

### Required Fields

```json
{
  "name": "extension-name",
  "displayName": "Extension Display Name",
  "description": "Extension description",
  "version": "1.0.0",
  "publisher": "your-publisher",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": []
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^20.x",
    "typescript": "^5.3.0"
  },
  "dependencies": {
    "dab-vscode-shared": "*"
  }
}
```

### Activation Events

Extensions activate when specific events occur:

```json
"activationEvents": [
  "onCommand:yourExtension.command",
  "onLanguage:json",
  "workspaceContains:**/dab-config.json"
]
```

**Common Patterns:**
- `onCommand:` - Activate when command executed
- `onLanguage:` - Activate when language opened
- `workspaceContains:` - Activate when file pattern found
- `*` - Activate on startup (avoid if possible)

### Contributing Commands

```json
"contributes": {
  "commands": [
    {
      "command": "dab.init",
      "title": "DAB: Initialize Configuration"
    },
    {
      "command": "dab.start",
      "title": "DAB: Start Engine"
    }
  ]
}
```

## Webpack Bundling

### When to Use Webpack

**Always use webpack for extensions that:**
- Import from `dab-vscode-shared` package (terminal, config, prompts)
- Import from `dab-vscode-shared-database` package (SQL operations)
- Have dependencies beyond the vscode API

**Why Webpack is Required:**

Without webpack, TypeScript compiles each file separately and preserves `require()` statements pointing to node_modules. When shared packages import `vscode`, the extension host sees:

```javascript
// In shared/out/terminal/terminalManager.js
const vscode = require('vscode');
```

Problem: The extension host can't map `shared/out/terminal/terminalManager.js` to your extension, causing the warning:
```
Could not identify extension for 'vscode' require call from 
file:///.../shared/out/terminal/terminalManager.js
```

With webpack, all code (extension + shared packages) bundles into a single file owned by your extension, and vscode is marked as external.

### Webpack Configuration

Create `webpack.config.js` in your extension root:

```javascript
const path = require('path');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    target: 'node',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    externals: {
        vscode: 'commonjs vscode',  // Critical: Don't bundle vscode API
    },
};
```

**Key Configuration Points:**
- `target: 'node'` - Extension runs in Node.js environment
- `libraryTarget: 'commonjs2'` - VS Code uses CommonJS modules
- `externals: { vscode: 'commonjs vscode' }` - Don't bundle vscode, leave as external require
- `devtool: 'source-map'` - Enable debugging with source maps

### Package.json Updates

Update your extension's package.json:

```json
{
  "main": "./dist/extension.js",
  "scripts": {
    "vscode:prepublish": "npm run package",
    "compile": "webpack",
    "watch": "webpack --watch",
    "package": "webpack --mode production --devtool hidden-source-map",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src",
    "test": "vscode-test"
  },
  "devDependencies": {
    "@types/vscode": "^1.95.0",
    "@types/node": "20.x",
    "ts-loader": "^9.5.1",
    "webpack": "^5.94.0",
    "webpack-cli": "^5.1.4",
    "typescript": "^5.6.3"
  }
}
```

**Key Changes:**
- `main` points to `./dist/extension.js` (webpack output) instead of `./out/extension.js` (tsc output)
- `compile` uses `webpack` instead of `tsc`
- `watch` uses `webpack --watch` for rebuilding on file changes
- Added `package` script for production builds
- Added webpack dependencies: `ts-loader`, `webpack`, `webpack-cli`

### Building Extensions

```bash
# Development build (with source maps)
npm run compile

# Watch mode (rebuild on changes)
npm run watch

# Production build (optimized, hidden source maps)
npm run package
```

### Debugging Bundled Extensions

1. **Set breakpoints in source files** - Source maps enable debugging original TypeScript
2. **F5 to launch Extension Development Host** - Works same as unbundled
3. **Breakpoints hit in src/ files** - Not in dist/extension.js

### Bundle Size Comparison

| Approach | Extension Size | Shared Package | Total | Notes |
|----------|---------------|----------------|-------|-------|
| Unbundled (tsc) | ~50KB | Loaded from node_modules | ~50KB + shared | Causes vscode module warning |
| Bundled (webpack) | ~150KB | Included in bundle | ~150KB | No warnings, proper externalization |

**Trade-offs:**
- ✅ Webpack: Proper vscode handling, single file, no module path issues
- ❌ Webpack: Slightly larger VSIX, build step complexity
- ⚠️ Unbundled: Smaller individual files, but causes extension host warnings

### Migration Checklist

Migrating extension from TypeScript-only to webpack:

- [ ] Create `webpack.config.js` with proper externals
- [ ] Update `package.json` main to `./dist/extension.js`
- [ ] Update `package.json` scripts (compile, watch, package)
- [ ] Add webpack dependencies (ts-loader, webpack, webpack-cli)
- [ ] Run `npm install`
- [ ] Delete `out/` directory (old tsc output)
- [ ] Build with `npm run compile`
- [ ] Test in Extension Development Host (F5)
- [ ] Verify no "Could not identify extension" warnings
- [ ] Package with `vsce package` and test VSIX

## Extension Entry Point (extension.ts)

### Basic Structure

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension activated');

    // Register commands
    const disposable = vscode.commands.registerCommand('yourExtension.command', async () => {
        await yourCommandHandler();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Extension deactivated');
}

async function yourCommandHandler() {
    // Command implementation
}
```

### Using Shared Utilities

```typescript
import * as vscode from 'vscode';
import { runCommand } from 'dab-vscode-shared/terminal';
import { readConfig, validateConfigPath } from 'dab-vscode-shared/config';
import { showEntityPicker } from 'dab-vscode-shared/prompts';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('dab.start', async () => {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        // Run DAB start command
        runCommand('dab start', { cwd: workspaceRoot, name: 'DAB Engine' });
    });

    context.subscriptions.push(disposable);
}
```

## Common VS Code API Patterns

### Show Messages

```typescript
// Information
vscode.window.showInformationMessage('Operation completed');

// Warning
vscode.window.showWarningMessage('Configuration incomplete');

// Error
vscode.window.showErrorMessage('Operation failed');

// With actions
const selection = await vscode.window.showInformationMessage(
    'Config created',
    'Open File',
    'Start Engine'
);
if (selection === 'Open File') {
    // Handle action
}
```

### Quick Picks

```typescript
const items = ['Option 1', 'Option 2', 'Option 3'];
const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an option'
});

if (selected) {
    console.log(`User selected: ${selected}`);
}
```

### Input Boxes

```typescript
const value = await vscode.window.showInputBox({
    prompt: 'Enter database name',
    placeHolder: 'MyDatabase',
    validateInput: (text) => {
        return text.length === 0 ? 'Database name required' : null;
    }
});
```

### File/Folder Selection

```typescript
// Select folder
const folders = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false
});

// Select file
const files = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    filters: {
        'JSON files': ['json']
    }
});
```

### Terminals

Use shared terminal utilities instead of direct API:

```typescript
import { runCommand } from 'dab-vscode-shared/terminal';

// Simple command
runCommand('dab init --database-type mssql');

// With options
runCommand('dab start', {
    cwd: workspaceRoot,
    name: 'DAB Engine',
    env: { DAB_ENVIRONMENT: 'development' }
});
```

### Progress Indicators

```typescript
await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Generating entities...",
    cancellable: false
}, async (progress) => {
    progress.report({ increment: 0 });
    
    // Do work
    await processEntities();
    
    progress.report({ increment: 100 });
});
```

## Testing Extensions

### Manual Testing (Extension Development Host)

1. Open extension folder in VS Code
2. Press F5 to launch Extension Development Host
3. Test commands in new window
4. Check Debug Console for errors

### Automated Testing

Extensions with VS Code API dependencies cannot be tested in Node.js/Mocha. Use Extension Test Runner:

```typescript
// src/test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('Command registered', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('dab.init'));
    });
});
```

## Packaging Extensions

```bash
# Install vsce
npm install -g @vscode/vsce

# Package extension
vsce package

# Result: extension-name-1.0.0.vsix
```

## Best Practices

### ✅ Do
- Use shared packages for common utilities
- Handle errors gracefully with try/catch
- Provide clear user feedback (messages, progress)
- Validate user input
- Clean up resources in deactivate()
- Keep activation events specific (avoid `*`)
- Use async/await for better error handling

### ❌ Don't
- Block the UI thread with long operations
- Activate on startup unless necessary
- Hardcode file paths (use workspace APIs)
- Ignore errors (always log or show to user)
- Create terminals without checking if they exist
- Duplicate code (use shared packages)

## Common Pitfalls

### Terminal Management
**❌ Wrong:**
```typescript
const terminal = vscode.window.createTerminal('DAB');
terminal.sendText('dab start');
// Creates new terminal every time
```

**✅ Correct:**
```typescript
import { runCommand } from 'dab-vscode-shared/terminal';
runCommand('dab start');  // Reuses existing terminal
```

### Error Handling
**❌ Wrong:**
```typescript
const config = readConfig(path);  // Throws if file doesn't exist
```

**✅ Correct:**
```typescript
try {
    const config = readConfig(path);
    // Process config
} catch (error) {
    vscode.window.showErrorMessage(`Error reading config: ${error.message}`);
}
```

### Workspace Detection
**❌ Wrong:**
```typescript
const root = '/hardcoded/path';
```

**✅ Correct:**
```typescript
const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
if (!workspaceRoot) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
}
```

## Debugging

### Debug Console
Access via Debug → Debug Console when running Extension Development Host (F5).

### Logging
```typescript
console.log('Extension activated');
console.error('Error occurred:', error);
```

### Breakpoints
Set breakpoints in source code, press F5, breakpoints will hit in Extension Development Host.

## Extension Dependencies

After migrating to shared packages, extensions depend on:

```json
{
  "dependencies": {
    "dab-vscode-shared": "*",
    "dab-vscode-shared-database": "*"  // Only if querying database
  }
}
```

The `*` version means "use workspace version" in npm workspaces.