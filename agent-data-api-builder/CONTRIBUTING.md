# Contributing to DAB Agent Extension

Thank you for your interest in contributing to the Data API Builder Agent extension!

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- VS Code 1.95.0 or higher
- GitHub Copilot Chat extension (for testing)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/JerryNixon/data-api-builder-vscode-ext.git
   cd data-api-builder-vscode-ext
   ```

2. Install dependencies:
   ```bash
   npm install
   cd agent-data-api-builder
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Launch in VS Code:
   - Open the `agent-data-api-builder` folder in VS Code
   - Press F5 to launch the Extension Development Host
   - Open Copilot Chat and type `@dab` to test

## Architecture

### Bundled Agent Approach

This extension bundles the DAB Developer agent directly in the extension package using VS Code's `contributes.chatAgents` contribution point. Users get the agent automatically when they install the extension - no manual setup required.

```
┌─────────────────────────────────────────────────────────────┐
│                  DAB Agent Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │  @dab Chat          │    │  Bundled DAB Developer      │ │
│  │  Participant        │    │  Agent                       │ │
│  ├─────────────────────┤    ├─────────────────────────────┤ │
│  │ • Real-time chat    │    │ • Auto-injected on install  │ │
│  │ • Intent detection  │    │ • resources/agents/ folder  │ │
│  │ • LLM integration   │    │ • No user action needed     │ │
│  │ • Disambiguation    │    │ • Updates with extension    │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  Shared Resources                        ││
│  │  • resources/agents/ folder (bundled in VSIX)            ││
│  │  • dab-vscode-shared package                             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### @dab Chat Participant

Located in `src/chatHandler.ts`, the chat participant:

1. **Receives user prompts** via VS Code Chat API
2. **Detects intent** using keyword matching
3. **Routes to handlers** for specific actions (init, add, start, etc.)
4. **Falls back to LLM** for complex questions with full DAB context

### Bundled Agent Files

The agent files are stored in two locations:

1. **Source of Truth**: `/.github/agents/dab-developer/` (root of workspace)
   - Edit these files during development
   - Tracked in git

2. **Extension Bundle**: `/agent-data-api-builder/resources/agents/`
   - Auto-generated during `vscode:prepublish`
   - Not tracked in git (in `.gitignore`)
   - Bundled into the VSIX package

### Build Flow

```
/.github/agents/dab-developer/     (source files - edit here)
           │
           ▼ npm run copy-resources
/agent-data-api-builder/resources/agents/  (build output)
           │
           ▼ vsce package
agent-data-api-builder-X.X.X.vsix  (bundled in VSIX)
           │
           ▼ User installs extension
Agent available immediately        (no setup required)
```

## File Structure

```
agent-data-api-builder/
├── resources/                 # Bundled resources (auto-generated)
│   └── agents/
│       ├── dab-developer.agent.md   # Main agent file
│       └── dab-developer/           # Sub-instruction files
│           ├── overview.md
│           ├── dab-init.md
│           └── ...
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── chatHandler.ts         # @dab chat participant
│   ├── instructions.ts        # Load instructions from files
│   └── test/                  # Unit tests
├── images/                    # Extension icons
└── package.json               # Extension manifest
```

## Testing

### Unit Tests

Pure helper functions are tested in `src/test/`:

```bash
npm test
```

### Integration Tests

Test in the Extension Development Host:

1. Press F5 in VS Code
2. Open Copilot Chat
3. Type `@dab` and test various prompts

### What to Test

- Intent detection accuracy
- Handler responses
- Bundled agent availability
- Error handling

## Updating Agent Files

1. Edit files in `/.github/agents/dab-developer/`
2. Run `npm run copy-resources` in the agent extension folder
3. Test with F5 (Extension Development Host)
4. Package with `vsce package --no-dependencies`
5. Commit only the source files in `/.github/agents/`

## Code Style

- Use TypeScript strict mode
- Run `npm run lint` before committing
- Follow existing patterns in the codebase
- Extract pure functions for testability

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Questions?

- Open an issue on GitHub
- Check the [DAB documentation](https://learn.microsoft.com/azure/data-api-builder/)
