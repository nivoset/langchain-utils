import { MCPConnection } from '../models/mcp-connection';
import { MCPServer } from '../models/mcp-server';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export class LangChainMCPAdapter {
  private llm: ChatOpenAI | null = null;

  async connect(server: MCPServer): Promise<MCPConnection> {
    const connection: MCPConnection = {
      id: this.generateConnectionId(),
      server,
      status: 'connecting',
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    try {
      // Initialize LangChain with the MCP server
      this.llm = new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Test the connection
      await this.testConnection(connection);
      
      connection.status = 'connected';
      return connection;
    } catch (error) {
      connection.status = 'error';
      connection.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async disconnect(connection: MCPConnection): Promise<void> {
    try {
      // Clean up LangChain resources
      this.llm = null;
      connection.status = 'disconnected';
    } catch (error) {
      connection.status = 'error';
      connection.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async query(connection: MCPConnection, query: string): Promise<string> {
    if (!this.llm) {
      throw new Error('No active LangChain connection');
    }

    if (connection.status !== 'connected') {
      throw new Error(`Connection is not active. Status: ${connection.status}`);
    }

    try {
      // Create a system message that includes MCP server context
      const systemMessage = new SystemMessage(
        `You are connected to an MCP server: ${connection.server.name}. 
         Server capabilities: ${connection.server.capabilities.join(', ')}. 
         Provide responses based on the MCP server's capabilities.`
      );

      const humanMessage = new HumanMessage(query);

      const response = await this.llm.invoke([systemMessage, humanMessage]);
      
      connection.lastActivity = new Date();
      return response.content as string;
    } catch (error) {
      connection.lastActivity = new Date();
      throw error;
    }
  }

  private async testConnection(connection: MCPConnection): Promise<void> {
    if (!this.llm) {
      throw new Error('LangChain not initialized');
    }

    // Send a simple test message to verify the connection
    const testMessage = new HumanMessage('Test connection');
    await this.llm.invoke([testMessage]);
  }

  private generateConnectionId(): string {
    return `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
} 