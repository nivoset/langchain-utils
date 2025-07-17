import * as vscode from 'vscode';
import { MCPConnectionManager } from '../services/mcp-connection-manager';

export class ViewProvider {
  constructor(private connectionManager: MCPConnectionManager) {}

  getServersProvider(): vscode.WebviewViewProvider {
    return {
      resolveWebviewView: (webviewView: vscode.WebviewView) => {
        webviewView.webview.options = {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '')]
        };

        webviewView.webview.html = this.getServersHtml(webviewView.webview);
        
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(
          message => {
            switch (message.command) {
              case 'connect':
                this.handleConnectRequest(message.server);
                break;
            }
          }
        );
      }
    };
  }

  getConnectionsProvider(): vscode.WebviewViewProvider {
    return {
      resolveWebviewView: (webviewView: vscode.WebviewView) => {
        webviewView.webview.options = {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '')]
        };

        webviewView.webview.html = this.getConnectionsHtml(webviewView.webview);
        
        // Update connections list periodically
        const updateConnections = () => {
          const connections = this.connectionManager.getActiveConnections();
          webviewView.webview.postMessage({
            command: 'updateConnections',
            connections: connections.map(c => ({
              id: c.id,
              name: c.server.name,
              status: c.status,
              connectedAt: c.connectedAt.toISOString(),
              lastActivity: c.lastActivity.toISOString()
            }))
          });
        };

        updateConnections();
        const interval = setInterval(updateConnections, 5000);

        webviewView.onDidDispose(() => {
          clearInterval(interval);
        });
      }
    };
  }

  private getServersHtml(webview: vscode.Webview): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MCP Servers</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
          }
          .server-item {
            padding: 8px;
            margin: 4px 0;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            cursor: pointer;
          }
          .server-item:hover {
            background: var(--vscode-list-hoverBackground);
          }
          .add-server-btn {
            width: 100%;
            padding: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 8px;
          }
          .add-server-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <h3>MCP Servers</h3>
        <div id="servers-list">
          <div class="server-item">
            <strong>Example Server</strong><br>
            <small>ws://localhost:3000</small>
          </div>
        </div>
        <button class="add-server-btn" onclick="addServer()">Add New Server</button>
        
        <script>
          function addServer() {
            vscode.postMessage({
              command: 'connect',
              server: {
                name: 'New Server',
                url: 'ws://localhost:3000'
              }
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  private getConnectionsHtml(webview: vscode.Webview): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Active Connections</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
          }
          .connection-item {
            padding: 8px;
            margin: 4px 0;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
          }
          .status-connected {
            border-left: 4px solid #4CAF50;
          }
          .status-error {
            border-left: 4px solid #f44336;
          }
          .status-connecting {
            border-left: 4px solid #ff9800;
          }
          .no-connections {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <h3>Active Connections</h3>
        <div id="connections-list">
          <div class="no-connections">No active connections</div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'updateConnections':
                updateConnectionsList(message.connections);
                break;
            }
          });
          
          function updateConnectionsList(connections) {
            const container = document.getElementById('connections-list');
            
            if (connections.length === 0) {
              container.innerHTML = '<div class="no-connections">No active connections</div>';
              return;
            }
            
            container.innerHTML = connections.map(conn => \`
              <div class="connection-item status-\${conn.status}">
                <strong>\${conn.name}</strong><br>
                <small>Status: \${conn.status}</small><br>
                <small>Connected: \${new Date(conn.connectedAt).toLocaleTimeString()}</small>
              </div>
            \`).join('');
          }
        </script>
      </body>
      </html>
    `;
  }

  private async handleConnectRequest(server: any): Promise<void> {
    // This would be implemented to handle connection requests from the webview
    console.log('Connect request from webview:', server);
  }
} 