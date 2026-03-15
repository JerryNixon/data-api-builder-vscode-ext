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

export function buildInitCommand(configPath: string, envKey: string, folder: string): string {
  const args = [
    'dab init',
    '--database-type mssql',
    `--connection-string "@env('${envKey}')"`,
    '--host-mode Development',
    '--rest.enabled true',
    '--graphql.enabled true',
    '--mcp.enabled true',
    '--auth.provider Unauthenticated',
    `-c "${path.basename(configPath)}"`
  ];

  // Working directory is set via runCommand's cwd option
  return args.join(' ');
}

export function buildConfigCommand(configPath: string, setting: string, value: string, folder: string): string {
  // Working directory is set via runCommand's cwd option
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