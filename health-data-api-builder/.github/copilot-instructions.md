# VS Code Extension Development Guidelines for DAB Health Extension

## Project Overview
This is a VS Code extension that provides health monitoring and visualization for Data API Builder (DAB) instances. The extension displays health check data from running DAB servers via a webview interface.

## Critical Security Rules

### 1. TLS/SSL Certificate Handling
- **NEVER** set `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` globally
- Use `rejectUnauthorized: false` only in specific request options when necessary for local development
- Global TLS bypass affects the entire Node.js process and creates security vulnerabilities

### 2. Webview Security
- **ALWAYS** include a Content Security Policy (CSP) in webview HTML
- Required CSP for this extension:
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src https://cdn.jsdelivr.net 'unsafe-inline'; script-src 'unsafe-inline';">
  ```
- Only allow necessary sources - avoid `'unsafe-eval'` and minimize `'unsafe-inline'`
- External resources (Bootstrap CDN) must be explicitly allowed in `style-src`

## VS Code Extension Best Practices

### 1. Activation Events
- **ALWAYS** explicitly declare activation events in `package.json`
- For command-based extensions: `"onCommand:yourCommandId"`
- Example:
  ```json
  "activationEvents": [
    "onCommand:healthDataApiBuilder.healthCheck"
  ]
  ```
- While empty `activationEvents: []` works in modern VS Code, explicit declaration improves clarity

### 2. Command Registration
- Command IDs must match exactly between `package.json` and `extension.ts`
- Pattern: `extensionName.commandName` (e.g., `healthDataApiBuilder.healthCheck`)
- Register commands in `activate()` and add to `context.subscriptions`
- Example:
  ```typescript
  const disposable = vscode.commands.registerCommand('healthDataApiBuilder.healthCheck', (uri: vscode.Uri) => {
    showHealthWebView(context, uri);
  });
  context.subscriptions.push(disposable);
  ```

### 3. Disposable Management
- **ALL** event handlers return disposables that must be tracked
- Push disposables to `context.subscriptions` to prevent memory leaks
- Common disposables:
  - `vscode.commands.registerCommand()`
  - `panel.webview.onDidReceiveMessage()`
  - `vscode.workspace.onDidChangeConfiguration()`
  - Any `Event` subscription

### 4. Webview Communication
- Use bidirectional messaging pattern:
  - Extension → Webview: `panel.webview.postMessage(data)`
  - Webview → Extension: `vscode.postMessage(data)` + `onDidReceiveMessage` handler
- Always validate message structure before processing
- Handle async operations properly in message handlers

### 5. Context Menu Integration
- Use precise `when` clauses for context menus
- For DAB config files: `(resourceFilename =~ /^dab-.*\\.json$/) || resourceFilename == 'staticwebapp.database.config.json'`
- Group related commands: `"group": "1_dab"`

## TypeScript Best Practices

### 1. Async/Await Usage
- Only mark functions `async` if they use `await`
- Remove unnecessary `async` keywords to avoid confusion
- Example - **Incorrect**:
  ```typescript
  async (uri: vscode.Uri) => {
    showHealthWebView(uri); // No await
  }
  ```
- Example - **Correct**:
  ```typescript
  (uri: vscode.Uri) => {
    showHealthWebView(uri);
  }
  ```

### 2. Import Management
- Remove unused imports
- Use specific imports rather than wildcard when possible
- This extension uses: `vscode`, `https`, `http`, `dab-vscode-shared`

### 3. Error Handling
- Use type guards: `err instanceof Error`
- Provide meaningful error messages to users
- Handle timeouts gracefully (5-second default for network requests)
- Always resolve promises, never reject in user-facing functions

## HTTP Request Patterns

### 1. Protocol Selection
- Detect protocol from URL: `urlObj.protocol === 'https:' ? https : http`
- Support both HTTP and HTTPS endpoints

### 2. Timeout Handling
- Set reasonable timeouts: `req.setTimeout(5000)` for 5 seconds
- Destroy request on timeout: `req.destroy()`
- Provide user-friendly timeout messages

### 3. Response Handling
- Stream data collection: `res.on('data', (chunk) => data += chunk)`
- Parse JSON only after complete response
- Handle HTTP error codes (>= 400)

## File Structure

```
health-data-api-builder/
├── .github/
│   └── copilot-instructions.md      # This file
├── images/
│   ├── icon.png                      # Extension icon
│   └── dab-logo.png                  # Gallery banner
├── src/
│   ├── extension.ts                  # Main extension logic
│   └── test/
│       └── extension.test.ts         # Tests
├── package.json                      # Extension manifest
├── tsconfig.json                     # TypeScript config
└── eslint.config.mjs                 # ESLint config
```

## Testing Requirements

### 1. Test Coverage
- Write actual tests, not just placeholders
- Test key functions: `fetchHealthData`, config parsing
- Mock external dependencies (HTTP requests)

### 2. Build Process
- Always run `npm run compile` before testing
- Watch mode for development: `npm run watch`
- Pre-test linting: `npm run pretest`

## Package.json Guidelines

### 1. Metadata
- Use clear `displayName` and `description`
- Specify appropriate `categories`: `["Other", "Programming Languages", "Debuggers"]`
- Include `keywords` for marketplace discoverability

### 2. Engine Requirements
- Specify minimum VS Code version: `"vscode": "^1.95.0"`
- Keep dependencies minimal and up-to-date

### 3. Scripts
- Standard scripts: `compile`, `watch`, `pretest`, `lint`, `test`
- Use `vscode:prepublish` for production builds

## Webview HTML Guidelines

### 1. Structure
- Use proper HTML5 structure with `<!DOCTYPE html>` (implicit in template strings)
- Include viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1" />`
- Use Bootstrap for consistent UI (CDN version 5.3.0)

### 2. Scripting
- Use `acquireVsCodeApi()` once and store reference
- Handle message events: `window.addEventListener('message', ...)`
- Initialize on load: call `fetchAndRender(currentUrl)` after script setup

### 3. Dynamic Content
- Use template literals for data binding
- Sanitize user input if displaying untrusted content
- Handle empty states and errors gracefully

## DAB-Specific Patterns

### 1. Config File Detection
- Match files: `dab-*.json` or `staticwebapp.database.config.json`
- Use regex: `/^dab-.*\\.json$/`

### 2. Health Endpoint
- Default ports: 5000 (HTTP), 5001 (HTTPS)
- Endpoint path: `/health`
- Response structure:
  ```typescript
  {
    status: 'Healthy' | 'Unhealthy',
    'app-name': string,
    version: string,
    checks: Array<{
      name: string,
      status: 'Healthy' | 'Unhealthy',
      tags: string[],
      data?: { 'response-ms': number, 'threshold-ms': number },
      exception?: string
    }>,
    configuration?: Record<string, any>
  }
  ```

### 3. Health Data Visualization
- Group checks by tags (excluding 'endpoint')
- Use color coding: green for healthy, red for unhealthy
- Display response times and thresholds
- Show configuration table

## Common Pitfalls to Avoid

1. ❌ Global environment variable changes (`process.env`)
2. ❌ Missing CSP in webviews
3. ❌ Not tracking disposables
4. ❌ Empty or missing activation events
5. ❌ Mismatched command IDs between package.json and code
6. ❌ Unnecessary `async` keywords
7. ❌ Unused imports
8. ❌ Missing timeout handling on network requests
9. ❌ Not validating HTTP status codes
10. ❌ Placeholder tests in production code

## Code Review Checklist

Before committing code, verify:
- [ ] No global security bypasses (`NODE_TLS_REJECT_UNAUTHORIZED`)
- [ ] CSP included in all webview HTML
- [ ] All disposables tracked in `context.subscriptions`
- [ ] Activation events explicitly declared
- [ ] Command IDs match in package.json and code
- [ ] No unused imports
- [ ] Proper async/await usage
- [ ] Error handling for network requests
- [ ] Tests compile and pass
- [ ] No ESLint warnings

## Extension Commands

| Command ID | Title | Context |
|------------|-------|---------|
| `healthDataApiBuilder.healthCheck` | DAB: Health Check | Right-click on DAB config files |

## Future Enhancements Considerations

- Add configuration settings for default ports
- Implement certificate validation options
- Add authentication support for secured endpoints
- Create custom WebviewViewProvider for sidebar view
- Add telemetry (with user consent)
- Support workspace-level DAB discovery
- Add refresh interval configuration
- Export health reports to file
