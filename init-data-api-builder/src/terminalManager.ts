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

export function run(command: string): void {
  const term = getOrCreateTerminal();
  try {
    term.sendText(command, true);
    term.show();
  } catch {
    terminal?.dispose();
    terminal = vscode.window.createTerminal(TERMINAL_NAME);
    lastUsed = Date.now();
    terminal.sendText(command, true);
    terminal.show();
  }
}

function getOrCreateTerminal(): vscode.Terminal {
  const now = Date.now();
  const expired = lastUsed && now - lastUsed > TERMINAL_TIMEOUT;

  if (!terminal || expired) {
    terminal?.dispose();
    terminal = vscode.window.createTerminal(TERMINAL_NAME);
  }

  lastUsed = now;
  return terminal;
}
