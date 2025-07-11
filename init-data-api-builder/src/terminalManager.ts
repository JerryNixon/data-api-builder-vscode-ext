// src/terminalManager.ts
import * as vscode from 'vscode';

const TERMINAL_NAME = 'DAB Init';
const TERMINAL_TIMEOUT = 5000;

let lastUsed: number | null = null;

// Run a command using the shared terminal instance
export function run(command: string): void {
  const terminal = getOrCreateTerminal();
  terminal.sendText(command, true);
  terminal.show();
}

// Internal

function getOrCreateTerminal(): vscode.Terminal {
  const now = Date.now();
  const expired = lastUsed && now - lastUsed > TERMINAL_TIMEOUT;

  let terminal = vscode.window.terminals.find(t => t.name === TERMINAL_NAME);

  if (!terminal || expired) {
    terminal?.dispose(); // clean up old one if it's lingering
    terminal = vscode.window.createTerminal(TERMINAL_NAME);
  }

  lastUsed = now;
  return terminal;
}
