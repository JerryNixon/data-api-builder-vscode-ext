import * as vscode from 'vscode';

const TERMINAL_NAME = 'DAB Init';
const TERMINAL_TIMEOUT = 5000;

let terminal: vscode.Terminal | null = null;
let lastUsed: number | null = null;

// Clean up when user closes the terminal manually
vscode.window.onDidCloseTerminal((closed) => {
  if (closed === terminal) {
    terminal = null;
    lastUsed = null;
  }
});

/**
 * Sends a command to the terminal, optionally setting its working directory.
 * @param command - The CLI command to run.
 * @param options - Optional settings, e.g., { cwd: string }.
 */
export function run(command: string, options?: { cwd?: string }): void {
  const term = getOrCreateTerminal(options?.cwd);
  try {
    term.sendText(command, true);
    term.show();
  } catch {
    terminal?.dispose();
    terminal = createTerminal(options?.cwd);
    lastUsed = Date.now();
    terminal.sendText(command, true);
    terminal.show();
  }
}

function getOrCreateTerminal(cwd?: string): vscode.Terminal {
  const now = Date.now();
  const expired = lastUsed && now - lastUsed > TERMINAL_TIMEOUT;

  if (!terminal || expired) {
    terminal?.dispose();
    terminal = createTerminal(cwd);
  }

  lastUsed = now;
  return terminal;
}

function createTerminal(cwd?: string): vscode.Terminal {
  return vscode.window.createTerminal({
    name: TERMINAL_NAME,
    cwd: cwd ?? undefined,
  });
}
