import { spawn } from 'child_process';

export type OutputWriter = (text: string) => void;

export function runDabCommand(
  args: readonly string[],
  cwd: string,
  writeOutput: OutputWriter,
  executable = 'dab'
): Promise<void> {
  return new Promise((resolve, reject) => {
    let errorOutput = '';
    const child = spawn(executable, args, {
      cwd,
      shell: false,
      windowsHide: true
    });

    child.stdout.on('data', data => writeOutput(data.toString()));
    child.stderr.on('data', data => {
      const text = data.toString();
      errorOutput += text;
      writeOutput(text);
    });

    child.once('error', err => {
      reject(new Error(`Unable to start DAB CLI: ${err.message}`));
    });

    child.once('close', code => {
      if (code === 0) {
        resolve();
        return;
      }

      const details = errorOutput.trim();
      const suffix = details ? ` ${details}` : '';
      reject(new Error(`DAB CLI exited with code ${code}.${suffix}`));
    });
  });
}