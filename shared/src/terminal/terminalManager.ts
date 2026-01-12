import * as vscode from 'vscode';
import { TerminalOptions } from '../types';

const TERMINAL_NAME = 'Data API Builder';
const TERMINAL_TIMEOUT = 5000;

let dabTerminal: vscode.Terminal | undefined;
let lastCommandTime: number | null = null;
let lastCwd: string | undefined;

/**
 * Gets or creates a terminal with an optional working directory.
 * Recreates the terminal if it has expired or the working directory changed.
 */
function getOrCreateDabTerminal(cwd?: string): vscode.Terminal {
  const now = Date.now();
  const expired = lastCommandTime && now - lastCommandTime > TERMINAL_TIMEOUT;
  const cwdChanged = cwd && cwd !== lastCwd;
  const terminalClosed = dabTerminal && !vscode.window.terminals.includes(dabTerminal);

  if (!dabTerminal || terminalClosed || expired || cwdChanged) {
    if (dabTerminal) {
      dabTerminal.dispose();
    }
    dabTerminal = vscode.window.createTerminal({ 
      name: TERMINAL_NAME, 
      cwd 
    });
    lastCwd = cwd;
  }

  lastCommandTime = now;
  return dabTerminal;
}

/**
 * Runs a CLI command in the terminal, optionally from a specific directory.
 * Creates or reuses an existing terminal session.
 * 
 * @param command - The command to execute
 * @param options - Optional configuration including working directory
 * 
 * @example
 * ```typescript
 * // Run command in current directory
 * runCommand('dab start');
 * 
 * // Run command in specific directory
 * runCommand('dab init --database-type mssql', { cwd: '/path/to/project' });
 * ```
 */
export function runCommand(command: string, options?: TerminalOptions): void {
  const terminal = getOrCreateDabTerminal(options?.cwd);
  terminal.sendText(command, true);
  terminal.show();
}
