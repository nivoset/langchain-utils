import * as vscode from 'vscode';
import { MCPConnectionManager } from './mcp-connection-manager';
import { MCPServer } from '../models/mcp-server';

export class CommandManager {
  constructor(private connectionManager: MCPConnectionManager) {}

  async handleConnect(): Promise<void> {
    try {
      // Get server configuration from user
      const server = await this.promptForServer();
      if (!server) {
        return;
      }

      await this.connectionManager.connectToServer(server);
    } catch (error) {
      vscode.window.showErrorMessage(`Connection failed: ${error}`);
    }
  }

  async handleDisconnect(): Promise<void> {
    try {
      const connections = this.connectionManager.getActiveConnections();
      if (connections.length === 0) {
        vscode.window.showInformationMessage('No active connections to disconnect.');
        return;
      }

      if (connections.length === 1) {
        await this.connectionManager.disconnectFromServer(connections[0].id);
        return;
      }

      // Multiple connections - let user choose
      const connectionNames = connections.map(c => c.server.name);
      const selected = await vscode.window.showQuickPick(connectionNames, {
        placeHolder: 'Select connection to disconnect'
      });

      if (selected) {
        const connection = connections.find(c => c.server.name === selected);
        if (connection) {
          await this.connectionManager.disconnectFromServer(connection.id);
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Disconnect failed: ${error}`);
    }
  }

  async handleQuery(): Promise<void> {
    try {
      const connections = this.connectionManager.getActiveConnections();
      if (connections.length === 0) {
        vscode.window.showInformationMessage('No active connections. Please connect to an MCP server first.');
        return;
      }

      let selectedConnection: any;
      if (connections.length === 1) {
        selectedConnection = connections[0];
      } else {
        const connectionNames = connections.map(c => c.server.name);
        const selected = await vscode.window.showQuickPick(connectionNames, {
          placeHolder: 'Select connection to query'
        });

        if (!selected) {
          return;
        }

        selectedConnection = connections.find(c => c.server.name === selected);
      }

      if (!selectedConnection) {
        return;
      }

      const query = await vscode.window.showInputBox({
        prompt: 'Enter your query for the MCP server',
        placeHolder: 'What would you like to ask?'
      });

      if (!query) {
        return;
      }

      const response = await this.connectionManager.queryServer(selectedConnection.id, query);
      
      // Show response in a new document
      const document = await vscode.workspace.openTextDocument({
        content: `Query: ${query}\n\nResponse:\n${response}`,
        language: 'markdown'
      });
      
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Query failed: ${error}`);
    }
  }

  private async promptForServer(): Promise<MCPServer | undefined> {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter server name',
      placeHolder: 'My MCP Server'
    });

    if (!name) {
      return undefined;
    }

    const url = await vscode.window.showInputBox({
      prompt: 'Enter server URL',
      placeHolder: 'ws://localhost:3000'
    });

    if (!url) {
      return undefined;
    }

    const protocol = await vscode.window.showQuickPick(['ws', 'http', 'https'], {
      placeHolder: 'Select protocol'
    });

    if (!protocol) {
      return undefined;
    }

    const description = await vscode.window.showInputBox({
      prompt: 'Enter server description (optional)',
      placeHolder: 'Description of what this server does'
    });

    return {
      id: `server-${Date.now()}`,
      name,
      description: description || '',
      url,
      protocol: protocol as 'ws' | 'http' | 'https',
      capabilities: []
    };
  }
} 