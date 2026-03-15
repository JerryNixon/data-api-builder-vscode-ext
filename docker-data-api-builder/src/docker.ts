import * as vscode from 'vscode';
import * as path from 'path';
import { execSync } from 'child_process';
import { runCommand, readConfig, getConnectionString, extractEnvVarName } from 'dab-vscode-shared';

const DAB_IMAGE = 'mcr.microsoft.com/azure-databases/data-api-builder:latest';
const CONTAINER_PORT = 5000;
const HOST_PORT = 5000;

/**
 * Derives a Docker-safe container name from the workspace folder with a "-dab" suffix.
 */
function getContainerName(folderPath: string): string {
  const folderName = path.basename(folderPath).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `${folderName}-dab`;
}

/**
 * Checks whether the Docker CLI is installed.
 */
export function isDockerInstalled(): boolean {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether the Docker daemon is running.
 * `docker version` contacts the daemon and fails if it is not reachable.
 */
export function isDockerRunning(): boolean {
  try {
    execSync('docker version', { stdio: 'ignore', timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs DAB in a Docker container using `docker run` with a volume mount.
 * No compose file or image build needed.
 */
export async function dockerUp(folderPath: string, configFileName: string): Promise<void> {
  const containerName = getContainerName(folderPath);
  const configPath = path.join(folderPath, configFileName);

  // Stop any existing container with the same name
  try {
    execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
  } catch {
    // Container didn't exist — that's fine
  }

  // Resolve env var for the connection string if needed
  const config = readConfig(configPath);
  const rawConnStr = config?.['data-source']?.['connection-string'] || '';

  let envFlag = '';
  if (rawConnStr.startsWith('@env(')) {
    const envVarName = extractEnvVarName(rawConnStr);
    if (envVarName) {
      const connectionString = await getConnectionString(configPath);
      if (connectionString) {
        envFlag = ` -e "${envVarName}=${connectionString}"`;
      }
    }
  }

  const healthUrl = `http://localhost:${HOST_PORT}/health`;
  runCommand(
    `docker run -d --name ${containerName} -p ${HOST_PORT}:${CONTAINER_PORT}${envFlag} --label "dab.health.url=${healthUrl}" -v "./${configFileName}:/App/dab-config.json:ro" ${DAB_IMAGE}`,
    { cwd: folderPath }
  );
  vscode.window.showInformationMessage(
    `🐳 Starting DAB container — ${healthUrl}`,
    'Open Health'
  ).then(choice => {
    if (choice === 'Open Health') {
      vscode.env.openExternal(vscode.Uri.parse(healthUrl));
    }
  });
}

/**
 * Stops and removes the DAB container.
 */
export async function dockerDown(folderPath: string, configFileName: string): Promise<void> {
  const containerName = getContainerName(folderPath);

  runCommand(`docker rm -f ${containerName}`, { cwd: folderPath });
  vscode.window.showInformationMessage('🐳 Stopping DAB container...');
}
