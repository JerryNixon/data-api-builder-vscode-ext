import * as vscode from 'vscode';

const TERMINAL_NAME = 'DAB Add';
const TERMINAL_TIMEOUT = 5000; // Timeout in milliseconds

let dabTerminal: vscode.Terminal | undefined;
let lastCommandTime: number | null = null;

/**
 * Gets or creates a terminal named "DAB Add". If the existing terminal is available, it continues to use it.
 * If the terminal has exited or timed out, creates a new one.
 * @returns The terminal instance.
 */
export function getOrCreateDabTerminal(): vscode.Terminal {
  const now = Date.now();

  // Check if the terminal exists and is still active
  if (!dabTerminal || dabTerminal.exitStatus || (lastCommandTime && now - lastCommandTime > TERMINAL_TIMEOUT)) {
    if (dabTerminal) {
      dabTerminal.dispose();
    }
    dabTerminal = vscode.window.createTerminal(TERMINAL_NAME);
  }

  lastCommandTime = now;
  return dabTerminal;
}

/**
 * Sends a command to the terminal, appending it to the CLI history without resetting the terminal.
 * @param command - The command string to be executed.
 */
export async function runCommand(command: string): Promise<void> {
  const terminal = getOrCreateDabTerminal();
  terminal.sendText(command, true);
  terminal.show();
}
