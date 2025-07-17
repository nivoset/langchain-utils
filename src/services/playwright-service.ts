import * as vscode from 'vscode';
import { chromium, Browser, Page } from 'playwright';

export interface BrowserSession {
  id: string;
  url: string;
  title: string;
  lastAccessed: Date;
}

export class PlaywrightService {
  private browser: Browser | null = null;
  private activePages: Map<string, Page> = new Map();
  private sessions: Map<string, BrowserSession> = new Map();

  async initialize(): Promise<void> {
    try {
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: false,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to initialize Playwright browser: ${error}`);
      throw error;
    }
  }

  async openDocumentation(url: string, title?: string): Promise<string> {
    try {
      await this.initialize();
      
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const page = await this.browser.newPage();
      const sessionId = this.generateSessionId();
      
      await page.goto(url);
      
      const pageTitle = title || await page.title();
      
      this.activePages.set(sessionId, page);
      this.sessions.set(sessionId, {
        id: sessionId,
        url,
        title: pageTitle,
        lastAccessed: new Date()
      });

      return sessionId;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open documentation: ${error}`);
      throw error;
    }
  }

  async takeScreenshot(sessionId: string, filename?: string): Promise<string> {
    try {
      const page = this.activePages.get(sessionId);
      if (!page) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const screenshotPath = filename || `screenshot-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      return screenshotPath;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to take screenshot: ${error}`);
      throw error;
    }
  }

  async extractContent(sessionId: string, selector?: string): Promise<string> {
    try {
      const page = this.activePages.get(sessionId);
      if (!page) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (selector) {
        const element = await page.$(selector);
        if (element) {
          return await element.textContent() || '';
        }
      }

      // Extract main content if no selector provided
      const content = await page.evaluate(() => {
        const main = document.querySelector('main') || document.querySelector('article') || document.body;
        return main.textContent || '';
      });

      return content;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to extract content: ${error}`);
      throw error;
    }
  }

  async searchOnPage(sessionId: string, query: string): Promise<string[]> {
    try {
      const page = this.activePages.get(sessionId);
      if (!page) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Search for text on the page
      const results = await page.evaluate((searchQuery) => {
        const text = document.body.textContent || '';
        const regex = new RegExp(searchQuery, 'gi');
        const matches = text.match(regex);
        return matches || [];
      }, query);

      return results;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to search on page: ${error}`);
      throw error;
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    try {
      const page = this.activePages.get(sessionId);
      if (page) {
        await page.close();
        this.activePages.delete(sessionId);
        this.sessions.delete(sessionId);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to close session: ${error}`);
      throw error;
    }
  }

  async closeAllSessions(): Promise<void> {
    try {
      for (const [sessionId, page] of this.activePages) {
        await page.close();
      }
      this.activePages.clear();
      this.sessions.clear();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to close all sessions: ${error}`);
      throw error;
    }
  }

  getActiveSessions(): BrowserSession[] {
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId);
  }

  async cleanup(): Promise<void> {
    try {
      await this.closeAllSessions();
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to cleanup Playwright: ${error}`);
      throw error;
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
} 