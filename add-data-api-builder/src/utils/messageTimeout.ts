import * as vscode from 'vscode';

/**
 * Shows an error message that automatically dismisses after a timeout.
 * @param message The error message to display
 * @param timeoutMs Timeout in milliseconds (default: 5000ms = 5 seconds)
 * @returns A promise that resolves to the selected action (if any) or undefined when timeout expires
 */
export async function showErrorMessageWithTimeout(
  message: string,
  timeoutMs: number = 5000,
  ...items: string[]
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const disposables: vscode.Disposable[] = [];
    
    // Create a timeout to resolve with undefined after the specified time
    const timeout = setTimeout(() => {
      disposables.forEach(d => d.dispose());
      resolve(undefined);
    }, timeoutMs);

    // Show the message
    const messagePromise = vscode.window.showErrorMessage(message, ...items);

    // If user clicks before timeout, clear the timeout and resolve with the selection
    messagePromise.then((selection) => {
      clearTimeout(timeout);
      disposables.forEach(d => d.dispose());
      resolve(selection);
    });
  });
}

/**
 * Shows an information message that automatically dismisses after a timeout.
 * @param message The information message to display
 * @param timeoutMs Timeout in milliseconds (default: 5000ms = 5 seconds)
 * @returns A promise that resolves to the selected action (if any) or undefined when timeout expires
 */
export async function showInformationMessageWithTimeout(
  message: string,
  timeoutMs: number = 5000,
  ...items: string[]
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const disposables: vscode.Disposable[] = [];
    
    // Create a timeout to resolve with undefined after the specified time
    const timeout = setTimeout(() => {
      disposables.forEach(d => d.dispose());
      resolve(undefined);
    }, timeoutMs);

    // Show the message
    const messagePromise = vscode.window.showInformationMessage(message, ...items);

    // If user clicks before timeout, clear the timeout and resolve with the selection
    messagePromise.then((selection) => {
      clearTimeout(timeout);
      disposables.forEach(d => d.dispose());
      resolve(selection);
    });
  });
}

/**
 * Shows a warning message that automatically dismisses after a timeout.
 * @param message The warning message to display
 * @param timeoutMs Timeout in milliseconds (default: 5000ms = 5 seconds)
 * @returns A promise that resolves to the selected action (if any) or undefined when timeout expires
 */
export async function showWarningMessageWithTimeout(
  message: string,
  timeoutMs: number = 5000,
  ...items: string[]
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const disposables: vscode.Disposable[] = [];
    
    // Create a timeout to resolve with undefined after the specified time
    const timeout = setTimeout(() => {
      disposables.forEach(d => d.dispose());
      resolve(undefined);
    }, timeoutMs);

    // Show the message
    const messagePromise = vscode.window.showWarningMessage(message, ...items);

    // If user clicks before timeout, clear the timeout and resolve with the selection
    messagePromise.then((selection) => {
      clearTimeout(timeout);
      disposables.forEach(d => d.dispose());
      resolve(selection);
    });
  });
}
