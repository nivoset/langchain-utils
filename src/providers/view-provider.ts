import * as vscode from 'vscode';
import { Context7Service } from '../services/context7-service';
import { PlaywrightService } from '../services/playwright-service';

export class ViewProvider {
  constructor(
    private context7Service: Context7Service,
    private playwrightService: PlaywrightService
  ) {}

  getLookupProvider(): vscode.WebviewViewProvider {
    return {
      resolveWebviewView: (webviewView: vscode.WebviewView) => {
        webviewView.webview.options = {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '')]
        };

        webviewView.webview.html = this.getLookupHtml(webviewView.webview);
        
        webviewView.webview.onDidReceiveMessage(
          message => {
            switch (message.command) {
              case 'lookup':
                this.handleLookupRequest(message.query, message.language);
                break;
            }
          }
        );
      }
    };
  }

  getGeneratorProvider(): vscode.WebviewViewProvider {
    return {
      resolveWebviewView: (webviewView: vscode.WebviewView) => {
        webviewView.webview.options = {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '')]
        };

        webviewView.webview.html = this.getGeneratorHtml(webviewView.webview);
        
        webviewView.webview.onDidReceiveMessage(
          message => {
            switch (message.command) {
              case 'generate':
                this.handleGenerateRequest(message.libraryId, message.prompt);
                break;
            }
          }
        );
      }
    };
  }

  getBrowserProvider(): vscode.WebviewViewProvider {
    return {
      resolveWebviewView: (webviewView: vscode.WebviewView) => {
        webviewView.webview.options = {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '')]
        };

        webviewView.webview.html = this.getBrowserHtml(webviewView.webview);
        
        // Update browser sessions periodically
        const updateSessions = () => {
          const sessions = this.playwrightService.getActiveSessions();
          webviewView.webview.postMessage({
            command: 'updateSessions',
            sessions: sessions.map(s => ({
              id: s.id,
              title: s.title,
              url: s.url,
              lastAccessed: s.lastAccessed.toISOString()
            }))
          });
        };

        updateSessions();
        const interval = setInterval(updateSessions, 5000);

        webviewView.onDidDispose(() => {
          clearInterval(interval);
        });
      }
    };
  }

  private getLookupHtml(webview: vscode.Webview): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Lookup</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
          }
          .search-container {
            margin-bottom: 16px;
          }
          .search-input {
            width: 100%;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            margin-bottom: 8px;
          }
          .language-select {
            width: 100%;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            margin-bottom: 8px;
          }
          .search-btn {
            width: 100%;
            padding: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .search-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .results {
            margin-top: 16px;
          }
          .result-item {
            padding: 8px;
            margin: 4px 0;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background: var(--vscode-list-hoverBackground);
          }
        </style>
      </head>
      <body>
        <h3>Code Lookup</h3>
        <div class="search-container">
          <input type="text" id="query" class="search-input" placeholder="Enter code lookup query...">
          <select id="language" class="language-select">
            <option value="">All Languages</option>
            <option value="JavaScript">JavaScript</option>
            <option value="TypeScript">TypeScript</option>
            <option value="Python">Python</option>
            <option value="Java">Java</option>
            <option value="C#">C#</option>
            <option value="Go">Go</option>
            <option value="Rust">Rust</option>
          </select>
          <button class="search-btn" onclick="performLookup()">Search Code</button>
        </div>
        <div id="results" class="results">
          <p>Enter a query to search for code examples and documentation.</p>
        </div>
        
        <script>
          function performLookup() {
            const query = document.getElementById('query').value;
            const language = document.getElementById('language').value;
            
            if (!query.trim()) {
              alert('Please enter a search query');
              return;
            }
            
            vscode.postMessage({
              command: 'lookup',
              query: query,
              language: language
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  private getGeneratorHtml(webview: vscode.Webview): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Generator</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
          }
          .generator-container {
            margin-bottom: 16px;
          }
          .library-select {
            width: 100%;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            margin-bottom: 8px;
          }
          .prompt-input {
            width: 100%;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            margin-bottom: 8px;
            min-height: 60px;
            resize: vertical;
          }
          .generate-btn {
            width: 100%;
            padding: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .generate-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <h3>Code Generator</h3>
        <div class="generator-container">
          <select id="library" class="library-select">
            <option value="">Select a library...</option>
            <option value="/react/react">React</option>
            <option value="/vercel/next.js">Next.js</option>
            <option value="/typescript/typescript">TypeScript</option>
          </select>
          <textarea id="prompt" class="prompt-input" placeholder="Describe the code you want to generate..."></textarea>
          <button class="generate-btn" onclick="generateCode()">Generate Code</button>
        </div>
        
        <script>
          function generateCode() {
            const libraryId = document.getElementById('library').value;
            const prompt = document.getElementById('prompt').value;
            
            if (!libraryId) {
              alert('Please select a library');
              return;
            }
            
            if (!prompt.trim()) {
              alert('Please enter a generation prompt');
              return;
            }
            
            vscode.postMessage({
              command: 'generate',
              libraryId: libraryId,
              prompt: prompt
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  private getBrowserHtml(webview: vscode.Webview): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Documentation Browser</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
          }
          .browser-container {
            margin-bottom: 16px;
          }
          .url-input {
            width: 100%;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            margin-bottom: 8px;
          }
          .open-btn {
            width: 100%;
            padding: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 16px;
          }
          .open-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .session-item {
            padding: 8px;
            margin: 4px 0;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background: var(--vscode-list-hoverBackground);
          }
          .session-title {
            font-weight: bold;
            margin-bottom: 4px;
          }
          .session-url {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
          }
          .session-time {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <h3>Documentation Browser</h3>
        <div class="browser-container">
          <input type="url" id="url" class="url-input" placeholder="Enter documentation URL...">
          <button class="open-btn" onclick="openDocumentation()">Open in Browser</button>
        </div>
        <div id="sessions">
          <p>No active browser sessions</p>
        </div>
        
        <script>
          function openDocumentation() {
            const url = document.getElementById('url').value;
            
            if (!url.trim()) {
              alert('Please enter a URL');
              return;
            }
            
            vscode.postMessage({
              command: 'openDocumentation',
              url: url
            });
          }
          
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'updateSessions':
                updateSessionsList(message.sessions);
                break;
            }
          });
          
          function updateSessionsList(sessions) {
            const container = document.getElementById('sessions');
            
            if (sessions.length === 0) {
              container.innerHTML = '<p>No active browser sessions</p>';
              return;
            }
            
            container.innerHTML = sessions.map(session => \`
              <div class="session-item">
                <div class="session-title">\${session.title}</div>
                <div class="session-url">\${session.url}</div>
                <div class="session-time">Last accessed: \${new Date(session.lastAccessed).toLocaleTimeString()}</div>
              </div>
            \`).join('');
          }
        </script>
      </body>
      </html>
    `;
  }

  private async handleLookupRequest(query: string, language?: string): Promise<void> {
    try {
      const results = await this.context7Service.lookupCode(query, language);
      // Handle results - could show in a new document or update the webview
      console.log('Lookup results:', results);
    } catch (error) {
      console.error('Lookup failed:', error);
    }
  }

  private async handleGenerateRequest(libraryId: string, prompt: string): Promise<void> {
    try {
      const generatedCode = await this.context7Service.generateCode(libraryId, prompt);
      // Handle generated code - could show in a new document or update the webview
      console.log('Generated code:', generatedCode);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  }
} 