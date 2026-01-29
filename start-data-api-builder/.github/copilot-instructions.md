# GitHub Copilot Instructions - DAB Start Extension

## Extension Overview
This VS Code extension provides a right-click context menu for Data API Builder (DAB) configuration files to quickly start the DAB service. It demonstrates textbook VS Code extension patterns.

## Reference Implementation

The current extension code serves as the canonical example:

```typescript
// src/extension.ts - CANONICAL PATTERN
import * as vscode from 'vscode';
import * as path from 'path';
import { runCommand, validateConfigPath } from 'dab-vscode-shared';

export function activate(context: vscode.ExtensionContext) {
  const startDabCommand = vscode.commands.registerCommand('dabExtension.startDab', async (uri: vscode.Uri) => {
    const configFilePath = uri.fsPath;
    
    if (!validateConfigPath(configFilePath)) {
      vscode.window.showErrorMessage('❌ Invalid DAB configuration file.');
      return;
    }
    
    const folderPath = path.dirname(configFilePath);
    const fileName = path.basename(configFilePath);

    // Change to the config directory first, then run dab with just the file name
    const command = `cd "${folderPath}" && dab start -c "${fileName}"`;
    runCommand(command, { cwd: folderPath });
  });

  context.subscriptions.push(startDabCommand);
}

export function deactivate() {}
```

## Core Architecture Principles

### 1. Extension Activation
- Use `workspaceContains` activation events for pattern-based file detection
- Support multiple file patterns: `dab-*.json` and `staticwebapp.database.config.json`
- Keep extension lightweight - only activate when relevant files are present
- Match activation events to context menu `when` clauses for consistency

### 2. Command Registration Pattern
```typescript
// ALWAYS follow this pattern for command registration
const commandName = vscode.commands.registerCommand('extensionId.commandName', async (uri: vscode.Uri) => {
  // 1. Extract file system path from URI
  const filePath = uri.fsPath;
  
  // 2. Validate input before processing
  if (!validateInput(filePath)) {
    vscode.window.showErrorMessage('❌ Error message');
    return;
  }
  
  // 3. Extract folder path and file name for working directory
  const folderPath = path.dirname(filePath);
  const fileName = path.basename(filePath);
  
  // 4. Change to directory first, then execute command with file name
  const command = `cd "${folderPath}" && tool -c "${fileName}"`;
  runCommand(command, { cwd: folderPath });
});

// ALWAYS register disposal
context.subscriptions.push(commandName);
```

### 3. Context Menu Integration
- Use `explorer/context` menu contribution point
- Implement precise `when` clauses using regex patterns:
  - File name patterns: `resourceFilename =~ /^pattern.*\.ext$/`
  - Exact matches: `resourceFilename == 'exact-name.ext'`
  - Combine conditions with `||` or `&&`
- Group related commands using `group` property (e.g., `"1_dab"`)

### 4. File Path Handling
```typescript
// ALWAYS use path module for cross-platform compatibility
import * as path from 'path';

const folderPath = path.dirname(filePath);
const fileName = path.basename(filePath);

// ALWAYS use cd-first pattern to ensure correct working directory
// This ensures .env files and relative references work correctly
const command = `cd "${folderPath}" && tool command -c "${fileName}"`;
```

### 5. Shared Library Usage
- Import shared utilities from `dab-vscode-shared` package
- Available shared functions:
  - `runCommand(command, options)` - Execute commands in VS Code terminal
  - `validateConfigPath(path)` - Validate DAB configuration files
- NEVER duplicate code that exists in shared library
- Update shared library for cross-extension functionality

### 6. TypeScript Configuration
- ALWAYS enable strict mode: `"strict": true`
- Use modern ES targets: ES2022 or later
- Use Node16 module resolution for proper ESM/CommonJS handling
- Output to `out` directory, source in `src` directory

### 7. Error Handling & User Feedback
- Validate all inputs before processing
- Show error messages using `vscode.window.showErrorMessage()` with emoji prefix (❌)
- Provide clear, actionable error messages
- Return early on validation failures

### 8. Package.json Best Practices
```json
{
  "activationEvents": [
    "workspaceContains:**/pattern-*.json"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [{
      "command": "extensionId.commandName",
      "title": "Display Name",
      "category": "CategoryName"
    }],
    "menus": {
      "explorer/context": [{
        "command": "extensionId.commandName",
        "when": "resourceFilename =~ /pattern/",
        "group": "groupId"
      }]
    }
  }
}
```

### 9. Extension Metadata
- Include meaningful `displayName`, `description`, and `publisher`
- Add `icon` and `galleryBanner` for marketplace visibility
- Use appropriate `categories`: ["Other", "Programming Languages", "Debuggers"]
- Include `repository` URL for community contributions
- Add relevant `keywords` for discoverability

### 10. Command Execution
- Use shared `runCommand()` utility for terminal operations
- **ALWAYS use cd-first pattern**: `cd "${folderPath}" && command`
- Set working directory using `{ cwd: folderPath }` option as backup
- Extract file name using `path.basename()` for cleaner commands
- Quote both folder paths and file names to handle spaces
- Using `cd` ensures the terminal session is in the correct directory for relative file references

## Code Quality Standards

### DO:
✅ Use TypeScript strict mode
✅ Import types from `@types/vscode`
✅ Register all commands in `context.subscriptions`
✅ Validate user inputs before processing
✅ Use path module for file system operations
✅ Quote shell command arguments
✅ Use shared libraries for common functionality
✅ Provide user feedback for errors
✅ Use semantic versioning
✅ Update CHANGELOG.md for all releases

### DON'T:
❌ Hard-code file paths
❌ Use string concatenation for paths (use `path.join()` or `path.dirname()`)
❌ Forget to dispose of command registrations
❌ Skip input validation
❌ Duplicate code from shared libraries
❌ Use synchronous file operations in extension code
❌ Ignore error cases

## Testing Considerations
- Test with file names containing spaces
- Test with nested directory structures
- Verify activation events trigger correctly
- Test context menu appears only for matching files
- Validate command execution from different working directories

## Extension Lifecycle
```typescript
export function activate(context: vscode.ExtensionContext) {
  // Register all commands and features
  // Add to context.subscriptions for proper cleanup
}

export function deactivate() {
  // Cleanup if needed (usually empty for simple extensions)
}
```

## Versioning & Releases
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update version in package.json
- Document changes in CHANGELOG.md
- Use `vscode:prepublish` script for compilation
- Test with `vsce package` before publishing

## Dependencies
- Keep devDependencies for build tooling only
- Use `dependencies` for runtime packages
- Pin major versions for stability
- Regular updates for security patches

## Common Patterns for DAB Extensions

### Configuration File Detection
```typescript
// Pattern for dab-*.json files
"resourceFilename =~ /^dab-.*\\.json$/"

// Exact match for Static Web App config
"resourceFilename == 'staticwebapp.database.config.json'"

// Combined condition
"(resourceFilename =~ /^dab-.*\\.json$/) || resourceFilename == 'staticwebapp.database.config.json'"
```

### Command Construction
```typescript
// PREFERRED: cd-first pattern with file name only
const folderPath = path.dirname(configFilePath);
const fileName = path.basename(configFilePath);
const command = `cd "${folderPath}" && dab start -c "${fileName}"`;

// With additional options
const command = `cd "${folderPath}" && dab start -c "${fileName}" --verbose`;

// Legacy: Full path (less preferred - may cause issues with relative .env references)
const command = `dab start -c "${configFilePath}"`;
```

## Maintenance Guidelines
- Review shared library updates regularly
- Keep VS Code engine version current (but not bleeding edge)
- Test on Windows, macOS, and Linux
- Monitor extension marketplace feedback
- Keep documentation synchronized with code changes

---

*Generated from DAB Start Extension v1.2.1*
*Last Updated: January 2026*
