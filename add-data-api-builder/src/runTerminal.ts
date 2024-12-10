import * as vscode from 'vscode';

let dabTerminal: vscode.Terminal | undefined;

/**
 * Gets or creates a terminal named "DAB Add".
 * @returns The terminal instance.
 */
export function getOrCreateDabTerminal(): vscode.Terminal {
  if (!dabTerminal || dabTerminal.exitStatus) {
    dabTerminal = vscode.window.createTerminal('DAB Add');
  }
  return dabTerminal;
}

/**
 * Sends a command to the terminal.
 * @param command - The command string to be executed.
 */
export function runCommand(command: string) {
  const terminal = getOrCreateDabTerminal();
  terminal.sendText(command);
  terminal.show();
}

