export interface MCPServer {
  id: string;
  name: string;
  description: string;
  url: string;
  protocol: 'ws' | 'http' | 'https';
  authentication?: {
    type: 'api-key' | 'bearer' | 'basic';
    credentials: Record<string, string>;
  };
  capabilities: string[];
} 