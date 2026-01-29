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
    '--auth.provider StaticWebApps',
    `-c "${path.basename(configPath)}"`
  ];

  // Change to the target folder before running the dab command
  return `cd "${folder}"; ${args.join(' ')}`;
}

export function buildConfigCommand(configPath: string, setting: string, value: string, folder: string): string {
  // Change to the target folder before running the dab command
  return `cd "${folder}"; dab configure --${setting} ${value} -c "${path.basename(configPath)}"`;
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