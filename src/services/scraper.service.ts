import { chromium, Browser, Page } from '@playwright/test';
import { client } from '../database/init.js';
import { format, parseISO } from 'date-fns';
import { generateEmbedding } from './embedding.service.js';

export interface ScrapedArticle {
  title: string;
  content: string;
  url: string;
  source: string;
  publishedAt?: Date;
  category?: string;
  tags?: string[];
  summary?: string;
}

export interface NewsSource {
  id: number;
  name: string;
  url: string;
  selectorTitle: string;
  selectorContent: string;
  selectorDate: string;
  selectorLink: string;
  isActive: boolean;
}

export class ScraperService {
  private browser: Browser | null = null;

  async initialize() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async getActiveSources(): Promise<NewsSource[]> {
    const result = await client.execute(`
      SELECT id, name, url, selector_title, selector_content, selector_date, selector_link, is_active
      FROM sources 
      WHERE is_active = 1
    `);
    
    const sources = result.rows.map(row => ({
      id: row.id as number,
      name: row.name as string,
      url: row.url as string,
      selectorTitle: row.selector_title as string,
      selectorContent: row.selector_content as string,
      selectorDate: row.selector_date as string,
      selectorLink: row.selector_link as string,
      isActive: row.is_active === 1
    }));


    
    return sources;
  }

  async scrapeSource(source: NewsSource): Promise<ScrapedArticle[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    const articles: ScrapedArticle[] = [];

    try {
      console.log(`Scraping ${source.name}...`);
      
      // Set reasonable timeout and wait for dom content loaded
      await page.goto(source.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      // Get article links using more robust selectors
      const links = await page.$$eval(source.selectorLink, (elements) =>
        elements.map(el => (el as HTMLAnchorElement).href).slice(0, 10) // Limit to 10 articles
      );

      // Process articles with better error handling and rate limiting
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        try {
          const article = await this.scrapeArticle(page, link, source);
          if (article) {
            articles.push(article);
          }
          
          // Add small delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error scraping article ${link}:`, error);
        }
      }

      // Update last scraped timestamp
      await client.execute({
        sql: 'UPDATE sources SET last_scraped = CURRENT_TIMESTAMP WHERE id = ?',
        args: [source.id]
      });

    } catch (error) {
      console.error(`Error scraping source ${source.name}:`, error);
    } finally {
      await page.close();
    }

    return articles;
  }

  private async scrapeArticle(page: Page, url: string, source: NewsSource): Promise<ScrapedArticle | null> {
    try {
      // Navigate with proper timeout and error handling
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 20000 
      });

      // Use more robust text extraction with fallbacks
      const title = await this.extractText(page, source.selectorTitle);
      const content = await this.extractContent(page, source.selectorContent);
      
      let publishedAt: Date | undefined;
      try {
        const dateText = await this.extractText(page, source.selectorDate);
        if (dateText) {
          publishedAt = parseISO(dateText);
        }
      } catch (error) {
        console.warn(`Could not parse date for ${url}`);
      }

      if (!title || !content) {
        return null;
      }

      return {
        title,
        content: content.substring(0, 5000), // Limit content length
        url,
        source: source.name,
        publishedAt,
        category: this.extractCategory(url, title),
        tags: this.extractTags(title, content),
        summary: this.generateSummary(content)
      };

    } catch (error) {
      console.error(`Error scraping article ${url}:`, error);
      return null;
    }
  }

  // Improved text extraction with fallbacks
  private async extractText(page: Page, selector: string): Promise<string> {
    try {
      // Try the primary selector first
      const element = await page.locator(selector).first();
      if (await element.isVisible()) {
        return await element.textContent() || '';
      }
    } catch (error) {
      // Fallback to alternative selectors
      const fallbackSelectors = [
        'h1', 'h2', 'h3', // Common heading selectors
        '[class*="title"]', '[class*="heading"]', // Generic title classes
        'title' // Page title as last resort
      ];
      
      for (const fallback of fallbackSelectors) {
        try {
          const element = await page.locator(fallback).first();
          if (await element.isVisible()) {
            return await element.textContent() || '';
          }
        } catch (fallbackError) {
          continue;
        }
      }
    }
    
    return '';
  }

  // Improved content extraction
  private async extractContent(page: Page, selector: string): Promise<string> {
    try {
      // Try the primary content selector
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        const texts = await Promise.all(
          elements.map(async (el) => {
            if (await el.isVisible()) {
              return await el.textContent() || '';
            }
            return '';
          })
        );
        return texts.filter(Boolean).join(' ');
      }
    } catch (error) {
      // Fallback to common content selectors
      const fallbackSelectors = [
        'article p', 'main p', '.content p', '.article-content p',
        'p', 'div[class*="content"]', 'div[class*="article"]'
      ];
      
      for (const fallback of fallbackSelectors) {
        try {
          const elements = await page.locator(fallback).all();
          if (elements.length > 0) {
            const texts = await Promise.all(
              elements.map(async (el) => {
                if (await el.isVisible()) {
                  return await el.textContent() || '';
                }
                return '';
              })
            );
            const content = texts.filter(Boolean).join(' ');
            if (content.length > 100) { // Ensure we have meaningful content
              return content;
            }
          }
        } catch (fallbackError) {
          continue;
        }
      }
    }
    
    return '';
  }

  private extractCategory(url: string, title: string): string {
    // Simple category extraction based on URL path or title keywords
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    if (urlLower.includes('/ai/') || titleLower.includes('ai') || titleLower.includes('artificial intelligence')) {
      return 'AI/ML';
    }
    if (urlLower.includes('/cybersecurity/') || titleLower.includes('security') || titleLower.includes('cyber')) {
      return 'Cybersecurity';
    }
    if (urlLower.includes('/startups/') || titleLower.includes('startup')) {
      return 'Startups';
    }
    if (urlLower.includes('/funding/') || titleLower.includes('funding') || titleLower.includes('investment')) {
      return 'Funding';
    }
    if (urlLower.includes('/product/') || titleLower.includes('product') || titleLower.includes('launch')) {
      return 'Product';
    }

    return 'General';
  }

  private extractTags(title: string, content: string): string[] {
    const text = `${title} ${content}`.toLowerCase();
    const tags: string[] = [];

    // Common tech keywords
    const keywords = [
      'ai', 'artificial intelligence', 'machine learning', 'deep learning',
      'blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'web3',
      'cybersecurity', 'privacy', 'data breach', 'hacking',
      'startup', 'funding', 'venture capital', 'ipo', 'acquisition',
      'cloud computing', 'aws', 'azure', 'google cloud',
      'mobile', 'ios', 'android', 'app store',
      'social media', 'facebook', 'twitter', 'instagram',
      'electric vehicles', 'tesla', 'autonomous driving',
      'quantum computing', 'robotics', 'drones'
    ];

    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    });

    return tags.slice(0, 5); // Limit to 5 tags
  }

  private generateSummary(content: string): string {
    // Simple summary generation (first 200 characters)
    return content.length > 200 ? content.substring(0, 200) + '...' : content;
  }

  async saveArticle(article: ScrapedArticle): Promise<number> {
    try {
      // Check if article already exists
      const existing = await client.execute({
        sql: 'SELECT id FROM articles WHERE url = ?',
        args: [article.url]
      });

      if (existing.rows.length > 0) {
        console.log(`Article already exists: ${article.title}`);
        return existing.rows[0].id as number;
      }

      // Insert article
      const result = await client.execute({
        sql: `INSERT INTO articles (title, content, url, source, published_at, category, tags, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          article.title,
          article.content,
          article.url,
          article.source,
          article.publishedAt || null,
          article.category || null,
          JSON.stringify(article.tags),
          article.summary || null
        ]
      });

      const articleId = Number(result.lastInsertRowid);

              // Generate and save embedding
        if (articleId) {
          const embedding = await generateEmbedding(article.content);
          if (embedding) {
            await client.execute({
              sql: `INSERT INTO embeddings (id, article_id, embedding, model)
              VALUES (?, ?, ?, ?)`,
                              args: [
                  `emb_${articleId}`,
                  articleId,
                  embedding,
                  'nomic-embed-text'
                ]
            });

            // Update article with embedding_id
            await client.execute({
              sql: 'UPDATE articles SET embedding_id = ? WHERE id = ?',
              args: [`emb_${articleId}`, articleId]
            });
          }
        }

      console.log(`Saved article: ${article.title}`);
      return articleId;

    } catch (error) {
      console.error('Error saving article:', error);
      throw error;
    }
  }

  async scrapeAllSources(): Promise<void> {
    const sources = await this.getActiveSources();
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      try {
        const articles = await this.scrapeSource(source);
        
        for (const article of articles) {
          await this.saveArticle(article);
        }

        console.log(`Scraped ${articles.length} articles from ${source.name}`);
        
        // Add delay between sources to be respectful
        if (i < sources.length - 1) { // Don't delay after the last source
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`Error scraping source ${source.name}:`, error);
      }
    }
  }
} 