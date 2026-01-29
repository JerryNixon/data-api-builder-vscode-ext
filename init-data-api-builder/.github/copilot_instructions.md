# DAB Init Extension - Development Guidelines

## Overview

The `init-data-api-builder` extension provides a VS Code command to initialize Data API Builder (DAB) configuration files. This extension uses the shared `dab-vscode-shared` package for common functionality.

## Architecture

### Dependencies

- **dab-vscode-shared**: Provides shared utilities for:
  - Terminal command execution (`runCommand`)
  - Connection string management (`askForConnection`)
  - Environment file operations
  
- **No database dependencies**: This extension intentionally avoids the `dab-vscode-shared-database` package to keep it lightweight

### Command Registration

The extension registers a single command: `dabExtension.initDab`

**Invocation Methods:**
1. **Explorer Context Menu**: Right-click on a folder in VS Code Explorer
2. **Command Palette**: `Ctrl+Shift+P` → "DAB: Initialize Configuration"

### Invocation Logic (Textbook Implementation)

```typescript
export function activate(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand('dabExtension.initDab', async (uri?: vscode.Uri) => {
    // 1. Determine target folder
    let folder: string;
    
    if (uri) {
      // Context menu invocation - validate directory
      folder = uri.fsPath;
      const stat = fs.statSync(folder);
      if (!stat.isDirectory()) {
        folder = path.dirname(folder); // Use parent if file selected
      }
    } else {
      // Command Palette invocation - prompt for folder
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
      }
      
      if (folders.length === 1) {
        folder = folders[0].uri.fsPath;
      } else {
        const selected = await vscode.window.showWorkspaceFolderPick({
          placeHolder: 'Select folder for DAB configuration'
        });
        if (!selected) return; // User cancelled
        folder = selected.uri.fsPath;
      }
    }
    
    // 2. Proceed with DAB initialization...
  });
}
```

## Key Implementation Details

### 1. Activation Events

```json
"activationEvents": []
```

- Use empty array for modern VS Code (automatic activation)
- No deprecated `onCommand` activation events

### 2. Command Palette Visibility

```json
"menus": {
  "commandPalette": [
    {
      "command": "dabExtension.initDab"
    }
  ]
}
```

### 3. URI Parameter Handling

- **Optional parameter**: `uri?: vscode.Uri`
- **Validation**: Check if path exists and is a directory
- **Fallback**: Use parent directory if file is selected
- **Error handling**: Graceful errors with user-friendly messages

### 4. Multi-Root Workspace Support

- Single workspace: Auto-select the folder
- Multiple workspaces: Prompt user with `showWorkspaceFolderPick()`
- No workspace: Show helpful error message

### 5. User Cancellation

- Always check if user cancelled selection: `if (!selected) return;`
- No error messages on cancellation (user intentional action)

## Configuration Generation

The extension generates a DAB configuration with:

1. **Initial setup**: `dab init` with connection string from environment
2. **Feature flags**:
   - REST API: enabled
   - GraphQL: enabled  
   - MCP (Model Context Protocol): enabled
   - Cache: enabled
   - Request body strict mode: disabled (for flexibility)
3. **Security**: StaticWebApps authentication provider
4. **Mode**: Development (not production-ready by default)

## File Handling

### Config Path Resolution

```typescript
export function resolveConfigPath(folderPath: string, baseName = 'dab-config', ext = '.json'): string {
  let candidate = path.join(folderPath, `${baseName}${ext}`);
  let i = 2;
  
  while (fs.existsSync(candidate)) {
    candidate = path.join(folderPath, `${baseName}-${i}${ext}`);
    i++;
  }
  
  return candidate;
}
```

- Auto-increments filename if `dab-config.json` already exists
- Creates `dab-config-2.json`, `dab-config-3.json`, etc.

### Wait for File

```typescript
export function waitForFile(filePath: string, timeoutMs = 3000, intervalMs = 100): Promise<void>
```

- Polls for file existence after CLI commands
- Required because `runCommand` is synchronous but file creation is async
- Timeout ensures command doesn't hang indefinitely

## Error Handling Best Practices

1. **Validation errors**: Show clear, actionable messages
2. **User cancellation**: Return silently (no error message)
3. **File system errors**: Catch and display with context
4. **Command execution**: Wrap in try-catch with error display

## Recent Fixes (January 2026)

### Issue #1: Missing Command Reference
- **Problem**: Extension called `dabExtension.addTable` which doesn't exist
- **Fix**: Removed reference, simplified success message
- **Impact**: No more silent failures when clicking "Add Tables"

### Issue #2: Invocation Problems
- **Problem**: Extension crashed when invoked from Command Palette (undefined uri)
- **Fix**: Made `uri` parameter optional, added folder selection fallback
- **Impact**: Extension now works from both context menu and Command Palette

### Issue #3: Directory Validation
- **Problem**: No validation if uri points to a file vs folder
- **Fix**: Added `fs.statSync()` check, use parent directory if needed
- **Impact**: Works correctly even if user right-clicks on a file

### Issue #4: Command Palette Access
- **Problem**: Command not visible in Command Palette
- **Fix**: Added `commandPalette` menu contribution
- **Impact**: Command discoverable via Ctrl+Shift+P

### Issue #5: Working Directory for DAB Commands
- **Problem**: DAB CLI commands created config files in the wrong directory because terminal working directory wasn't being set correctly
- **Root Cause**: The `runCommand` function's `cwd` option sets the terminal's initial directory, but subsequent commands may not respect it, especially if the terminal is reused
- **Fix**: Prefix all DAB commands with `cd "{folder}";` to explicitly change to the target directory before execution
- **Implementation**:
  ```typescript
  // utils.ts - buildInitCommand and buildConfigCommand now include cd
  export function buildInitCommand(configPath: string, envKey: string, folder: string): string {
    const args = [...];
    return `cd "${folder}"; ${args.join(' ')}`;
  }
  
  export function buildConfigCommand(configPath: string, setting: string, value: string, folder: string): string {
    return `cd "${folder}"; dab configure --${setting} ${value} -c "${path.basename(configPath)}"`;
  }
  ```
- **Lesson**: When executing CLI commands that create files, always explicitly `cd` to the target directory first, even if `cwd` is set in terminal options. This ensures reliable behavior across terminal reuse scenarios.
- **Impact**: Config files now consistently created in the user-selected folder

## Testing Checklist

Before releasing, verify:

- [ ] Right-click on folder → DAB Init works
- [ ] Right-click on file → DAB Init uses parent folder
- [ ] Command Palette → DAB Init prompts for folder
- [ ] Single workspace → Auto-selects folder
- [ ] Multi-root workspace → Shows folder picker
- [ ] No workspace open → Shows appropriate error
- [ ] Config file created with correct settings
- [ ] Config file opens after creation
- [ ] Success message displays
- [ ] Duplicate configs increment filename (dab-config-2.json)

## Migration History

The extension was migrated from local utilities to shared package:

- ✅ `src/terminalManager.ts` → `dab-vscode-shared/terminal`
- ✅ `src/promptManager.ts` → `dab-vscode-shared/prompts`  
- ✅ `src/envManager.ts` → `dab-vscode-shared/config`

All functionality preserved while improving code reuse across DAB extensions.

## Code Quality Standards

- TypeScript strict mode enabled
- ESLint configured with recommended rules
- No compiler errors or warnings
- No linter errors or warnings
- Proper error handling on all async operations
- User-friendly error messages (no technical jargon)

## Terminal Command Best Practices

### Always Prefix Commands with Directory Change

When running CLI commands that create or modify files in a specific directory:

```typescript
// ❌ DON'T rely solely on cwd option - terminal may be reused
runCommand('dab init --database-type mssql', { cwd: folder });

// ✅ DO prefix with cd to ensure correct working directory
runCommand(`cd "${folder}"; dab init --database-type mssql`, { cwd: folder });
```

### Why This Matters

1. **Terminal Reuse**: The shared `runCommand` function may reuse an existing terminal if one was recently created
2. **Stale Working Directory**: A reused terminal retains its previous working directory
3. **File Location**: CLI tools like DAB create files relative to the current working directory
4. **Cross-Platform**: Use semicolon `;` to chain commands (works in PowerShell and bash)

### Command Building Pattern

```typescript
// Build commands that include the cd prefix
export function buildInitCommand(configPath: string, envKey: string, folder: string): string {
  const args = [
    'dab init',
    '--database-type mssql',
    `--connection-string "@env('${envKey}')"`,
    `-c "${path.basename(configPath)}"`
  ];
  
  // Always cd first, then run the command
  return `cd "${folder}"; ${args.join(' ')}`;
}
```

### Testing Terminal Commands

When testing, verify:
- [ ] Command creates files in the selected folder, not the workspace root
- [ ] Command works on first invocation (fresh terminal)
- [ ] Command works on subsequent invocations (reused terminal)
- [ ] Command works after user changes directories manually in terminal
