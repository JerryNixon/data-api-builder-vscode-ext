import * as fs from 'fs';
import * as path from 'path';

export function resolveConfigPath(folderPath: string, baseName = 'dab-config', ext = '.json'): string {
  let candidate = path.join(folderPath, `${baseName}${ext}`);
  let i = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(folderPath, `${baseName}-${i}${ext}`);
    i++;
  }

  return candidate;
}

export function buildInitArgs(configPath: string, envKey: string): string[] {
  return [
    'init',
    '--database-type', 'mssql',
    '--connection-string', `@env('${envKey}')`,
    '--host-mode', 'Development',
    '--cors-origin', '*',
    '-c', path.basename(configPath)
  ];
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