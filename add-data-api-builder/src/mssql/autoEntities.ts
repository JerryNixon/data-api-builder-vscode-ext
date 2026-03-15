import * as vscode from 'vscode';
import * as path from 'path';
import { runCommand, validateConfigPath } from 'dab-vscode-shared';
import { showErrorMessageWithTimeout } from '../utils/messageTimeout';

export async function autoEntities(configPath: string) {
  if (!validateConfigPath(configPath)) {
    return;
  }

  const configDir = path.dirname(configPath);
  const configFile = path.basename(configPath);

  try {
    const cmd = `dab auto-config default -c "${configFile}" --permissions "anonymous:*" --patterns.include "%.%"`;
    await runCommand(cmd, { cwd: configDir });
    vscode.window.showInformationMessage(`Auto-entities definition 'default' added successfully.`);
  } catch (error) {
    await showErrorMessageWithTimeout(`Error configuring auto-entities: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
