import * as vscode from 'vscode';
import { DabChatHandler } from './chatHandler';

export function activate(context: vscode.ExtensionContext) {
  console.log('DAB Agent extension activated');

  // Create and register the chat participant
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
  const openChatCommand = vscode.commands.registerCommand('dab.openChat', async () => {
    await vscode.commands.executeCommand('workbench.action.chat.open', { query: '@dab ' });
  });

  context.subscriptions.push(participant, openChatCommand);
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
