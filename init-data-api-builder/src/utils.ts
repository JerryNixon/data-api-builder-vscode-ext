import * as fs from 'fs';
import * as path from 'path';
import type { PromptResult } from 'dab-vscode-shared';

export function resolveConfigPath(folderPath: string, baseName = 'dab-config', ext = '.json'): string {
  let candidate = path.join(folderPath, `${baseName}${ext}`);
  let i = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(folderPath, `${baseName}-${i}${ext}`);
    i++;
  }

  return candidate;
}

export function buildInitCommand(configPath: string, envKey: string, result: PromptResult): string {
  const hostMode = result.hostMode === 'production' ? 'Production' : 'Development';

  const args = [
    'dab init',
    '--database-type mssql',
    `--connection-string "@env('${envKey}')"`,
    `--host-mode ${hostMode}`,
    `--rest.enabled ${String(result.enableRest)}`,
    `--graphql.enabled ${String(result.enableGraphQL)}`,
    `--auth.provider ${result.security}`,
    `-c "${path.basename(configPath)}"`
  ];

  return args.join(' ');
}

export function buildConfigCommand(configPath: string, setting: string, value: string): string {
  return `dab configure --${setting} ${value} -c "${path.basename(configPath)}"`;
}

export function waitForFile(filePath: string, timeoutMs = 3000, intervalMs = 100): Promise<void> {
  const maxAttempts = Math.ceil(timeoutMs / intervalMs);
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (fs.existsSync(filePath)) {
        clearInterval(timer);
        resolve();
        return;
      }

      if (++attempts > maxAttempts) {
        clearInterval(timer);
        reject(new Error(`File not found: ${filePath}`));
      }
    }, intervalMs);
  });
}