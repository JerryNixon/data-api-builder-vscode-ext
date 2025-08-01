import * as vscode from 'vscode';

const TERMINAL_NAME = 'DAB Validate';
const TERMINAL_TIMEOUT = 5000; // Timeout in milliseconds

let dabTerminal: vscode.Terminal | undefined;
let lastCommandTime: number | null = null;

interface RunCommandOptions {
  cwd?: string;
}

/**
 * If the terminal has exited or timed out, creates a new one.
 * @returns The terminal instance.
 */
function getOrCreateDabTerminal(): vscode.Terminal {
  const now = Date.now();

  if (!dabTerminal || dabTerminal.exitStatus || (lastCommandTime && now - lastCommandTime > TERMINAL_TIMEOUT)) {
    dabTerminal?.dispose();
    dabTerminal = vscode.window.createTerminal(TERMINAL_NAME);
  }

  lastCommandTime = now;
  return dabTerminal;
}

/**
 * Sends a command to the terminal, optionally setting the working directory.
 * @param command - The command string to be executed.
 * @param options - Optional run context, e.g., working directory.
 */
export function runCommand(command: string, options?: RunCommandOptions) {
  const terminal = getOrCreateDabTerminal();

  if (options?.cwd) {
    const cdCommand = process.platform === 'win32' ? `cd /d "${options.cwd}"` : `cd "${options.cwd}"`;
    terminal.sendText(cdCommand, true);
  }

  terminal.sendText(command, true);
  terminal.show();
}
