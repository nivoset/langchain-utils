import { MCPServer } from './mcp-server';

export interface MCPConnection {
  id: string;
  server: MCPServer;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  connectedAt: Date;
  lastActivity: Date;
  error?: string;
} 