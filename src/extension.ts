import * as vscode from 'vscode';
import { MCPConnectionManager } from './services/mcp-connection-manager';
import { CommandManager } from './services/command-manager';
import { ViewProvider } from './providers/view-provider';

export function activate(context: vscode.ExtensionContext) {
  console.log('MCP LangChain Extension is now active!');

  // Initialize services following Single Responsibility Principle
  const connectionManager = new MCPConnectionManager();
  const commandManager = new CommandManager(connectionManager);
  const viewProvider = new ViewProvider(connectionManager);

  // Register commands
  const connectCommand = vscode.commands.registerCommand('mcp-langchain.connect', () => {
    commandManager.handleConnect();
  });

  const disconnectCommand = vscode.commands.registerCommand('mcp-langchain.disconnect', () => {
    commandManager.handleDisconnect();
  });

  const queryCommand = vscode.commands.registerCommand('mcp-langchain.query', () => {
    commandManager.handleQuery();
  });

  // Register view providers
  const serversProvider = vscode.window.registerWebviewViewProvider(
    'mcp-servers',
    viewProvider.getServersProvider()
  );

  const connectionsProvider = vscode.window.registerWebviewViewProvider(
    'mcp-connections',
    viewProvider.getConnectionsProvider()
  );

  // Add to subscriptions
  context.subscriptions.push(
    connectCommand,
    disconnectCommand,
    queryCommand,
    serversProvider,
    connectionsProvider
  );
}

export function deactivate() {
  console.log('MCP LangChain Extension is now deactivated!');
} 