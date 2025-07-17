import * as vscode from 'vscode';
import { MCPConnection } from '../models/mcp-connection';
import { MCPServer } from '../models/mcp-server';
import { LangChainMCPAdapter } from './langchain-mcp-adapter';

export class MCPConnectionManager {
  private connections: Map<string, MCPConnection> = new Map();
  private langChainAdapter: LangChainMCPAdapter;

  constructor() {
    this.langChainAdapter = new LangChainMCPAdapter();
  }

  async connectToServer(server: MCPServer): Promise<MCPConnection> {
    try {
      const connection = await this.langChainAdapter.connect(server);
      this.connections.set(connection.id, connection);
      
      vscode.window.showInformationMessage(`Connected to MCP server: ${server.name}`);
      return connection;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to connect to ${server.name}: ${error}`);
      throw error;
    }
  }

  async disconnectFromServer(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    try {
      await this.langChainAdapter.disconnect(connection);
      this.connections.delete(connectionId);
      vscode.window.showInformationMessage(`Disconnected from: ${connection.server.name}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to disconnect: ${error}`);
      throw error;
    }
  }

  async queryServer(connectionId: string, query: string): Promise<string> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    try {
      const response = await this.langChainAdapter.query(connection, query);
      return response;
    } catch (error) {
      vscode.window.showErrorMessage(`Query failed: ${error}`);
      throw error;
    }
  }

  getActiveConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  getConnection(connectionId: string): MCPConnection | undefined {
    return this.connections.get(connectionId);
  }

  isConnected(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }
} 