import * as vscode from 'vscode';

const TERMINAL_NAME = 'DAB Start';
const TERMINAL_TIMEOUT = 5000;

let dabTerminal: vscode.Terminal | undefined;
let lastCommandTime: number | null = null;

interface CommandOptions {
  cwd?: string;
}

/**
 * If the terminal has exited or timed out, creates a new one.
 * @returns The terminal instance.
 */
function getOrCreateDabTerminal(): vscode.Terminal {
  const now = Date.now();

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
 * Sends a command to the terminal. Prepends a cd command if `cwd` is specified.
 * @param command - The command to run.
 * @param options - Optional cwd path.
 */
export function runCommand(command: string, options?: CommandOptions) {
  const terminal = getOrCreateDabTerminal();
  const fullCommand = options?.cwd ? `cd "${options.cwd}" && ${command}` : command;
  terminal.sendText(fullCommand, true);
  terminal.show();
}
