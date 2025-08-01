import * as vscode from 'vscode';

const TERMINAL_NAME = 'DAB Add';
const TERMINAL_TIMEOUT = 5000;

let dabTerminal: vscode.Terminal | undefined;
let lastCommandTime: number | null = null;
let lastCwd: string | undefined;

/**
 * Gets or creates a terminal with an optional working directory.
 * If the existing terminal is too old or has a mismatched cwd, recreate it.
 */
function getOrCreateDabTerminal(cwd?: string): vscode.Terminal {
  const now = Date.now();
  const expired = lastCommandTime && now - lastCommandTime > TERMINAL_TIMEOUT;
  const cwdChanged = cwd && cwd !== lastCwd;

  if (!dabTerminal || dabTerminal.exitStatus || expired || cwdChanged) {
    if (dabTerminal) dabTerminal.dispose();
    dabTerminal = vscode.window.createTerminal({ name: TERMINAL_NAME, cwd });
    lastCwd = cwd;
  }

  lastCommandTime = now;
  return dabTerminal;
}

/**
 * Runs a CLI command in the terminal, optionally from a specific directory.
 */
export async function runCommand(command: string, options?: { cwd?: string }): Promise<void> {
  const terminal = getOrCreateDabTerminal(options?.cwd);
  terminal.sendText(command, true);
  terminal.show();
}
