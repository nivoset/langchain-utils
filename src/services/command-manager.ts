import * as vscode from 'vscode';
import { Context7Service } from './context7-service';
import { PlaywrightService } from './playwright-service';

export class CommandManager {
  constructor(
    private context7Service: Context7Service,
    private playwrightService: PlaywrightService
  ) {}

  async handleLookup(): Promise<void> {
    try {
      const query = await vscode.window.showInputBox({
        prompt: 'Enter code lookup query',
        placeHolder: 'e.g., React useState hook, TypeScript interfaces'
      });

      if (!query) {
        return;
      }

      const language = await vscode.window.showQuickPick(
        ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Rust'],
        { placeHolder: 'Select programming language (optional)' }
      );

      vscode.window.showInformationMessage('Searching for code...');
      
      const results = await this.context7Service.lookupCode(query, language);
      
      if (results.length === 0) {
        vscode.window.showInformationMessage('No code found for your query.');
        return;
      }

      // Show results in a new document
      const content = this.formatLookupResults(results);
      const document = await vscode.workspace.openTextDocument({
        content,
        language: 'markdown'
      });
      
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Code lookup failed: ${error}`);
    }
  }

  async handleGenerate(): Promise<void> {
    try {
      // First, let user select a library
      const libraries = this.context7Service.getMockLibraries();
      const libraryNames = libraries.map(lib => lib.name);
      
      const selectedLibrary = await vscode.window.showQuickPick(libraryNames, {
        placeHolder: 'Select a library for code generation'
      });

      if (!selectedLibrary) {
        return;
      }

      const library = libraries.find(lib => lib.name === selectedLibrary);
      if (!library) {
        return;
      }

      const prompt = await vscode.window.showInputBox({
        prompt: `Enter code generation prompt for ${selectedLibrary}`,
        placeHolder: 'e.g., Create a React component that displays a user profile'
      });

      if (!prompt) {
        return;
      }

      vscode.window.showInformationMessage('Generating code...');
      
      const generatedCode = await this.context7Service.generateCode(library.id, prompt);
      
      if (!generatedCode) {
        vscode.window.showInformationMessage('No code was generated.');
        return;
      }

      // Show generated code in a new document
      const document = await vscode.workspace.openTextDocument({
        content: `# Generated Code for ${selectedLibrary}\n\n## Prompt\n${prompt}\n\n## Generated Code\n\`\`\`\n${generatedCode}\n\`\`\``,
        language: 'markdown'
      });
      
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Code generation failed: ${error}`);
    }
  }

  async handleBrowse(): Promise<void> {
    try {
      const url = await vscode.window.showInputBox({
        prompt: 'Enter documentation URL to browse',
        placeHolder: 'e.g., https://react.dev/reference/react/useState'
      });

      if (!url) {
        return;
      }

      const title = await vscode.window.showInputBox({
        prompt: 'Enter a title for this session (optional)',
        placeHolder: 'e.g., React useState documentation'
      });

      vscode.window.showInformationMessage('Opening documentation in browser...');
      
      const sessionId = await this.playwrightService.openDocumentation(url, title);
      
      vscode.window.showInformationMessage(`Documentation opened! Session ID: ${sessionId}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open documentation: ${error}`);
    }
  }

  private formatLookupResults(results: any[]): string {
    let content = '# Code Lookup Results\n\n';
    
    results.forEach((result, index) => {
      content += `## ${index + 1}. ${result.library.name}\n\n`;
      content += `**Library:** ${result.library.name} (${result.library.description})\n\n`;
      content += `**Trust Score:** ${result.library.trustScore}/10\n\n`;
      content += `**Relevance:** ${Math.round(result.relevance * 100)}%\n\n`;
      
      if (result.documentation) {
        content += `### Documentation\n${result.documentation}\n\n`;
      }
      
      if (result.codeSnippets && result.codeSnippets.length > 0) {
        content += `### Code Snippets\n`;
        result.codeSnippets.forEach((snippet: string, snippetIndex: number) => {
          content += `\`\`\`\n${snippet}\n\`\`\`\n\n`;
        });
      }
      
      content += '---\n\n';
    });
    
    return content;
  }
} 