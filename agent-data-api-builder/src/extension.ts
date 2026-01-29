import * as vscode from 'vscode';
import { DabChatHandler } from './chatHandler';
import { registerChatTools } from './tools/chatTools';

export function activate(context: vscode.ExtensionContext) {
  console.log('DAB Agent extension activated');

  // Register chat tools (dab_cli, get_schema) so the LLM can invoke them
  registerChatTools(context);

  // Create and register the chat participant first (always available)
  const chatHandler = new DabChatHandler(context);
  const participant = vscode.chat.createChatParticipant('dab.participant', chatHandler.handleRequest.bind(chatHandler));
  
  // Set participant properties
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png');
  
  // Register follow-up provider
  participant.followupProvider = {
    provideFollowups(result: DabChatResult, context: vscode.ChatContext, token: vscode.CancellationToken) {
      return chatHandler.provideFollowups(result, context, token);
    }
  };

  // Register command to open chat with @dab
  const openChatCommand = vscode.commands.registerCommand('dab.openChat', async (uri?: vscode.Uri) => {
    const configPath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
    const query = configPath ? `@dab using config at ${configPath} ` : '@dab ';
    await vscode.commands.executeCommand('workbench.action.chat.open', { query });
  });

  // Register validate command
  const validateCommand = vscode.commands.registerCommand('dab.validate', async (uri?: vscode.Uri) => {
    const configPath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
    if (!configPath) {
      vscode.window.showErrorMessage('No DAB configuration file selected');
      return;
    }
    const terminal = vscode.window.createTerminal('DAB Validate');
    terminal.show();
    terminal.sendText(`dab validate --config "${configPath}"`);
  });

  // Register start command
  const startCommand = vscode.commands.registerCommand('dab.start', async (uri?: vscode.Uri) => {
    const configPath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
    if (!configPath) {
      vscode.window.showErrorMessage('No DAB configuration file selected');
      return;
    }
    const terminal = vscode.window.createTerminal('DAB Server');
    terminal.show();
    terminal.sendText(`dab start --config "${configPath}"`);
  });

  // Register add entity command
  const addEntityCommand = vscode.commands.registerCommand('dab.addEntity', async (uri?: vscode.Uri) => {
    const configPath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
    const query = configPath 
      ? `@dab add an entity to the config at ${configPath}` 
      : '@dab add an entity';
    await vscode.commands.executeCommand('workbench.action.chat.open', { query });
  });

  // Register configure command
  const configureCommand = vscode.commands.registerCommand('dab.configure', async (uri?: vscode.Uri) => {
    const configPath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
    const query = configPath 
      ? `@dab configure settings for ${configPath}` 
      : '@dab configure settings';
    await vscode.commands.executeCommand('workbench.action.chat.open', { query });
  });

  context.subscriptions.push(participant, openChatCommand, validateCommand, startCommand, addEntityCommand, configureCommand);
}

export function deactivate() {
  console.log('DAB Agent extension deactivated');
}

/**
 * Result metadata returned from chat requests
 */
export interface DabChatResult extends vscode.ChatResult {
  metadata: {
    command?: string;
    action?: string;
    configPath?: string;
    success?: boolean;
  };
}
