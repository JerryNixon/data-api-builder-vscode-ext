# Copilot Instructions for VS Code Extension Development

## Project Overview

This is a VS Code extension for validating Data API Builder (DAB) configuration files. Follow these guidelines when contributing.

## Shared Package

This extension uses the `dab-vscode-shared` package for common utilities:

- **`validateConfigPath`** - Validates that a configuration file exists
- **`readConfig`** - Reads and parses DAB config files
- **`runCommand`** - For interactive terminal commands (not for capturing output)

Import shared utilities:
```typescript
import { validateConfigPath } from 'dab-vscode-shared';
```

> **Note**: For validation, we use `child_process.exec` instead of `runCommand` because we need to capture and parse stdout/stderr output.

## VS Code Extension Best Practices

### Output Channels

- **Use `LogOutputChannel`** instead of `OutputChannel` for structured logging:
  ```typescript
  const outputChannel = vscode.window.createOutputChannel('Name', { log: true });
  ```
- Use semantic logging methods:
  - `outputChannel.info()` - General information and success messages
  - `outputChannel.warn()` - Validation failures or non-critical issues
  - `outputChannel.error()` - Exceptions and critical errors
- Avoid `appendLine()` - it's legacy; use the semantic methods above

### External CLI Dependencies

- Always check if required CLI tools are available before using them:
  ```typescript
  async function isCliAvailable(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      cp.exec(`${command} --version`, (error) => resolve(!error));
    });
  }
  ```
- Provide helpful installation links when CLI is missing
- Use `vscode.env.openExternal()` to open installation pages

### Command Output Capture

When running external commands that need output parsing:
```typescript
// Use child_process.exec with adequate buffer size
const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB

cp.exec(command, { maxBuffer: MAX_BUFFER_SIZE }, (error, stdout, stderr) => {
  const output = stdout + stderr;
  // Parse and log output
});
```

### Actionable Error Messages

- Add action buttons to error messages for better UX:
  ```typescript
  const action = await vscode.window.showErrorMessage(
    'Error message',
    'View Output',
    'Install'
  );
  
  if (action === 'View Output') {
    outputChannel.show(true);
  }
  ```

### Command Handlers

- Always use optional parameters with null checks for commands invoked from menus:
  ```typescript
  vscode.commands.registerCommand('command.id', async (uri?: vscode.Uri) => {
    if (!uri) {
      vscode.window.showErrorMessage('No file selected.');
      return;
    }
    // proceed with uri.fsPath
  });
  ```
- Add explicit return types to `activate` and `deactivate`:
  ```typescript
  export function activate(context: vscode.ExtensionContext): void { }
  export function deactivate(): void { }
  ```

### Type Safety

- Avoid non-null assertion operator (`!`) - refactor to eliminate the need
- Use `unknown` instead of `any` for caught errors
- Extract error message helpers:
  ```typescript
  function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
  ```

### Resource Management

- Always register disposables in `context.subscriptions`:
  ```typescript
  context.subscriptions.push(command, outputChannel);
  ```
- Use optional chaining in `deactivate()` for safety:
  ```typescript
  outputChannel?.dispose();
  ```

### Promises

- Only include parameters you use in Promise constructors:
  ```typescript
  // Good
  return new Promise((resolve) => { ... });
  
  // Avoid unused parameters
  return new Promise((resolve, reject) => { ... }); // only if reject is used
  ```

### Progress Notifications

- Use `vscode.window.withProgress` for long-running operations:
  ```typescript
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Working...',
    cancellable: false
  }, async () => {
    // async work here
  });
  ```

### Function Design

- Keep functions small and focused (single responsibility)
- Extract helper functions for:
  - Log level determination
  - Error message extraction
  - Success/failure detection
- Add JSDoc comments for exported and complex functions:
  ```typescript
  /**
   * Extracts the most relevant error message from CLI output.
   * Prioritizes human-readable messages over technical errors.
   */
  function extractErrorSummary(output: string): string | undefined {
    // implementation
  }
  ```

## Code Style

- Use ES module imports: `import * as vscode from 'vscode'`
- Prefer `const` over `let` where possible
- Use template literals for string interpolation
- Keep functions focused and extract helpers for reusability

## Testing

- Write tests in `src/test/` directory
- Use the `@vscode/test-electron` package for integration tests
- Test command registration and basic functionality

## File Patterns

- DAB config files match: `dab-*.json` or `staticwebapp.database.config.json`
- Use `resourceFilename` regex in `package.json` for context menu filtering
- Use `resourceFilename` regex in `package.json` for context menu filtering
