import * as vscode from 'vscode';
import { Context7Service } from './services/context7-service';
import { PlaywrightService } from './services/playwright-service';
import { CommandManager } from './services/command-manager';
import { ViewProvider } from './providers/view-provider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Context7 Playwright Extension is now active!');

  // Initialize services following Single Responsibility Principle
  const context7Service = new Context7Service();
  const playwrightService = new PlaywrightService();
  const commandManager = new CommandManager(context7Service, playwrightService);
  const viewProvider = new ViewProvider(context7Service, playwrightService);

  // Register commands
  const lookupCommand = vscode.commands.registerCommand('context7-playwright.lookup', () => {
    commandManager.handleLookup();
  });

  const generateCommand = vscode.commands.registerCommand('context7-playwright.generate', () => {
    commandManager.handleGenerate();
  });

  const browseCommand = vscode.commands.registerCommand('context7-playwright.browse', () => {
    commandManager.handleBrowse();
  });

  // Register view providers
  const lookupProvider = vscode.window.registerWebviewViewProvider(
    'context7-lookup',
    viewProvider.getLookupProvider()
  );

  const generatorProvider = vscode.window.registerWebviewViewProvider(
    'context7-generator',
    viewProvider.getGeneratorProvider()
  );

  const browserProvider = vscode.window.registerWebviewViewProvider(
    'context7-browser',
    viewProvider.getBrowserProvider()
  );

  // Add to subscriptions
  context.subscriptions.push(
    lookupCommand,
    generateCommand,
    browseCommand,
    lookupProvider,
    generatorProvider,
    browserProvider
  );
}

export function deactivate() {
  console.log('Context7 Playwright Extension is now deactivated!');
} 