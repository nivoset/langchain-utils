import './styles.css';

// Webview functionality for MCP LangChain extension
class MCPWebview {
  private vscode: any;

  constructor() {
    this.vscode = (window as any).acquireVsCodeApi();
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      this.handleMessage(message);
    });

    // Initialize UI
    this.renderUI();
  }

  private handleMessage(message: any): void {
    switch (message.command) {
      case 'updateConnections':
        this.updateConnectionsList(message.connections);
        break;
      case 'updateServers':
        this.updateServersList(message.servers);
        break;
    }
  }

  private renderUI(): void {
    // This would render the initial UI with Tailwind classes
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = `
        <div class="p-4 space-y-4">
          <h1 class="text-xl font-bold text-vscode-fg">MCP LangChain</h1>
          <div class="vscode-card">
            <h2 class="text-lg font-semibold mb-2">Active Connections</h2>
            <div id="connections-list" class="space-y-2">
              <p class="text-gray-500">No active connections</p>
            </div>
          </div>
          <div class="vscode-card">
            <h2 class="text-lg font-semibold mb-2">Available Servers</h2>
            <div id="servers-list" class="space-y-2">
              <p class="text-gray-500">No servers configured</p>
            </div>
            <button class="vscode-button mt-4" onclick="addServer()">
              Add New Server
            </button>
          </div>
        </div>
      `;
    }
  }

  private updateConnectionsList(connections: any[]): void {
    const container = document.getElementById('connections-list');
    if (!container) return;

    if (connections.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No active connections</p>';
      return;
    }

    container.innerHTML = connections.map(conn => `
      <div class="vscode-card border-l-4 ${this.getStatusColor(conn.status)}">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-medium">${conn.name}</h3>
            <p class="text-sm text-gray-500">Status: ${conn.status}</p>
            <p class="text-sm text-gray-500">Connected: ${new Date(conn.connectedAt).toLocaleTimeString()}</p>
          </div>
          <button class="vscode-button text-sm" onclick="disconnect('${conn.id}')">
            Disconnect
          </button>
        </div>
      </div>
    `).join('');
  }

  private updateServersList(servers: any[]): void {
    const container = document.getElementById('servers-list');
    if (!container) return;

    if (servers.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No servers configured</p>';
      return;
    }

    container.innerHTML = servers.map(server => `
      <div class="vscode-card cursor-pointer hover:bg-gray-100" onclick="connectToServer('${server.id}')">
        <h3 class="font-medium">${server.name}</h3>
        <p class="text-sm text-gray-500">${server.url}</p>
        <p class="text-sm text-gray-500">${server.description}</p>
      </div>
    `).join('');
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'connected':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      case 'connecting':
        return 'border-yellow-500';
      default:
        return 'border-gray-500';
    }
  }
}

// Initialize webview when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MCPWebview();
});

// Global functions for button clicks
(window as any).addServer = () => {
  (window as any).vscode.postMessage({
    command: 'addServer'
  });
};

(window as any).connectToServer = (serverId: string) => {
  (window as any).vscode.postMessage({
    command: 'connectToServer',
    serverId
  });
};

(window as any).disconnect = (connectionId: string) => {
  (window as any).vscode.postMessage({
    command: 'disconnect',
    connectionId
  });
}; 