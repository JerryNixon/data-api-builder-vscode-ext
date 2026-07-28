# DAB Init Extension - Development Guidelines

## Overview

The `init-data-api-builder` extension provides a VS Code command to initialize Data API Builder (DAB) configuration files. This extension uses the shared `dab-vscode-shared` package for common functionality.

## Architecture

### Dependencies

- **dab-vscode-shared**: Provides shared utilities for:
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

1. **One awaited process**: `dab init` with a connection string environment reference
2. **Intentional non-defaults**:
  - Development host mode
  - Wildcard CORS for local development
3. **DAB defaults**:
  - REST, GraphQL, and MCP enabled
  - Request body strict mode disabled
  - Unauthenticated provider
4. **Deferred configuration**:
  - Cache is configured when an entity opts in, not while the config has no entities

The process is launched without a shell, with an explicit working directory, and must exit successfully before the file is opened or success is reported.

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

- Defensively verifies file existence after the awaited CLI process exits
- Timeout protects against an unexpected successful exit without a generated file

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

### Issue #5: Working Directory and Completion
- **Problem**: Reused terminals could have a stale working directory and provided no exit status.
- **Fix**: Launch `dab` directly with `shell: false`, an explicit `cwd`, and an argument array.
- **Impact**: Paths do not depend on terminal state, and success is shown only after exit code zero.

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

## DAB Process Best Practices

- Build a string array of arguments; never construct a shell command.
- Set `shell: false` and pass the selected folder as `cwd`.
- Stream stdout and stderr to the DAB Init output channel.
- Await process completion and require exit code zero.
- Do not use fixed delays to infer completion.
- Keep init to one CLI process unless a setting cannot be expressed by `dab init` and is immediately useful.
- Test the exact argument array, successful completion, and non-zero exit behavior.
