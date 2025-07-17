import * as vscode from 'vscode';

export interface Context7Library {
  id: string;
  name: string;
  description: string;
  version?: string;
  codeSnippetCount: number;
  trustScore: number;
}

export interface Context7SearchResult {
  library: Context7Library;
  documentation: string;
  codeSnippets: string[];
  relevance: number;
}

export class Context7Service {
  private apiBaseUrl = 'https://context7.com/api';

  async searchLibraries(query: string): Promise<Context7Library[]> {
    try {
      // Simulate Context7 API call for library search
      // In a real implementation, this would call the actual Context7 API
      const response = await fetch(`${this.apiBaseUrl}/libraries/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Context7 API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.libraries || [];
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to search Context7 libraries: ${error}`);
      return [];
    }
  }

  async getLibraryDocumentation(libraryId: string, topic?: string): Promise<string> {
    try {
      // Simulate Context7 API call for documentation retrieval
      const url = topic 
        ? `${this.apiBaseUrl}/libraries/${libraryId}/docs?topic=${encodeURIComponent(topic)}`
        : `${this.apiBaseUrl}/libraries/${libraryId}/docs`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Context7 API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.documentation || '';
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get library documentation: ${error}`);
      return '';
    }
  }

  async generateCode(libraryId: string, prompt: string): Promise<string> {
    try {
      // Simulate Context7 API call for code generation
      const response = await fetch(`${this.apiBaseUrl}/libraries/${libraryId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`Context7 API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.generatedCode || '';
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate code: ${error}`);
      return '';
    }
  }

  async lookupCode(query: string, language?: string): Promise<Context7SearchResult[]> {
    try {
      // Simulate Context7 API call for code lookup
      const params = new URLSearchParams({ q: query });
      if (language) {
        params.append('language', language);
      }

      const response = await fetch(`${this.apiBaseUrl}/code/lookup?${params}`);
      
      if (!response.ok) {
        throw new Error(`Context7 API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to lookup code: ${error}`);
      return [];
    }
  }

  // Mock data for development/testing
  getMockLibraries(): Context7Library[] {
    return [
      {
        id: '/react/react',
        name: 'React',
        description: 'A JavaScript library for building user interfaces',
        version: '18.2.0',
        codeSnippetCount: 1500,
        trustScore: 9
      },
      {
        id: '/vercel/next.js',
        name: 'Next.js',
        description: 'The React Framework for Production',
        version: '14.0.0',
        codeSnippetCount: 1200,
        trustScore: 9
      },
      {
        id: '/typescript/typescript',
        name: 'TypeScript',
        description: 'Typed JavaScript at Any Scale',
        version: '5.0.0',
        codeSnippetCount: 800,
        trustScore: 10
      }
    ];
  }
} 