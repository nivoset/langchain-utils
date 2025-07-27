import { BaseDocumentLoader } from 'langchain/document_loaders/base';
import { Document } from 'langchain/document';
import Parser from 'rss-parser';
import { client, initDatabase } from '../database/init.js';
import * as cheerio from 'cheerio';

export interface RSSFeedConfig {
  name: string;
  url: string;
  category?: string;
  maxItems?: number;
  timeout?: number;
  stopAtDuplicate?: boolean; // Stop processing at first duplicate
  fetchFullContent?: boolean; // Fetch full article content from URLs
}

export interface RSSArticle {
  title: string;
  content: string;
  url: string;
  source: string;
  publishedAt?: Date;
  author?: string;
  category?: string;
  tags?: string[];
  summary?: string;
  guid?: string;
}

export interface Document {
  pageContent: string;
  metadata: Record<string, any>;
}

export class RSSLoader extends BaseDocumentLoader {
  private parser: Parser;
  private config: RSSFeedConfig;
  private saveToDatabase: boolean;

  constructor(config: RSSFeedConfig, saveToDatabase: boolean = false) {
    super();
    this.parser = new Parser({
      timeout: config.timeout || 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    this.config = config;
    this.saveToDatabase = saveToDatabase;
  }

  async load(): Promise<Document[]> {
    try {
      await initDatabase();
      
      console.log(`📡 Loading RSS feed: ${this.config.name}`);
      console.log(`🔗 URL: ${this.config.url}`);
      
      const feed = await this.parser.parseURL(this.config.url);
      console.log(`📊 Found ${feed.items.length} items in feed`);
      
      const articles: RSSArticle[] = [];
      let processedCount = 0;
      
      for (const item of feed.items.slice(0, this.config.maxItems || 50)) {
        try {
          const article = await this.processRSSItem(item);
          if (article) {
            // Check for duplicates if enabled
            if (this.config.stopAtDuplicate && await this.checkArticleExists(article)) {
              console.log(`🛑 Stopping at duplicate: ${article.title}`);
              break;
            }
            
            articles.push(article);
            processedCount++;
            
            // Add delay between articles to be respectful
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.warn(`Error processing RSS item: ${error}`);
        }
      }
      
      console.log(`✅ Processed ${processedCount} articles from ${this.config.name}`);
      
      // Save to database if requested
      if (this.saveToDatabase && articles.length > 0) {
        await this.saveArticlesToDatabase(articles);
      }
      
      // Convert to documents
      const documents = articles.map(article => this.createDocument(article));
      
      return documents;
      
    } catch (error) {
      console.error(`Error loading RSS feed ${this.config.name}:`, error);
      throw error;
    }
  }

  private async processRSSItem(item: any): Promise<RSSArticle | null> {
    try {
      // Extract basic content from RSS
      let content = this.extractContent(item);
      
      // If fetchFullContent is enabled and we have a URL, try to get full content
      if (this.config.fetchFullContent && item.link && content.length < 1000) {
        try {
          console.log(`🔍 Fetching full content for: ${item.title}`);
          const fullContent = await this.fetchFullArticleContent(item.link);
          if (fullContent && fullContent.length > content.length) {
            content = fullContent;
            console.log(`✅ Got full content (${fullContent.length} chars)`);
          }
        } catch (error) {
          console.warn(`Failed to fetch full content for ${item.title}: ${error}`);
        }
      }

      const article: RSSArticle = {
        title: item.title || 'Untitled',
        content: content,
        url: item.link || '',
        source: this.config.name,
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        author: item.creator || item.author || undefined,
        category: this.config.category,
        tags: this.extractTags(item),
        summary: item.contentSnippet || item.summary || undefined,
        guid: item.guid || item.id || undefined
      };

      // Validate article has required fields
      if (article.title && article.url && article.content.length > 100) {
        return article;
      }

      return null;
    } catch (error) {
      console.warn(`Error processing RSS item: ${error}`);
      return null;
    }
  }

  /**
   * Fetch full article content from the article URL
   */
  private async fetchFullArticleContent(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: this.config.timeout || 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Common selectors for article content
      const contentSelectors = [
        'article .content',
        'article .post-content',
        'article .entry-content',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.content-body',
        '.article-body',
        'main article',
        'article',
        '.content',
        '#content',
        '.post',
        '.article'
      ];

      let content = '';
      
      // Try each selector
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          // Remove unwanted elements
          element.find('script, style, nav, header, footer, .ad, .advertisement, .sidebar, .comments').remove();
          
          content = element.text().trim();
          if (content.length > 500) {
            break;
          }
        }
      }

      // If no content found with selectors, try to get all text from body
      if (content.length < 500) {
        $('script, style, nav, header, footer, .ad, .advertisement, .sidebar, .comments').remove();
        content = $('body').text().trim();
      }

      return content.length > 500 ? this.cleanContent(content) : null;

    } catch (error) {
      console.warn(`Failed to fetch content from ${url}: ${error}`);
      return null;
    }
  }

  /**
   * Create Document from RSSArticle
   */
  private createDocument(article: RSSArticle): Document {
    const metadata = {
      source: article.source,
      url: article.url,
      title: article.title,
      category: article.category,
      author: article.author,
      publishedAt: article.publishedAt?.toISOString(),
      tags: article.tags?.join(', '),
      summary: article.summary,
      guid: article.guid,
      loader: 'rss'
    };

    return {
      pageContent: `${article.title}\n\n${article.content}`,
      metadata
    };
  }

  /**
   * Extract content from RSS item
   */
  private extractContent(item: any): string {
    const contentFields = [
      item.content,
      item['content:encoded'],
      item.description,
      item.summary,
      item.contentSnippet
    ];

    for (const field of contentFields) {
      if (field && typeof field === 'string' && field.length > 50) {
        return this.cleanContent(field);
      }
    }

    return item.title || '';
  }

  /**
   * Clean and normalize content
   */
  private cleanContent(content: string): string {
    // Remove HTML tags
    const withoutHtml = content.replace(/<[^>]*>/g, ' ');
    
    // Remove extra whitespace
    const cleaned = withoutHtml.replace(/\s+/g, ' ').trim();
    
    // Increase length limit for full content
    const maxLength = this.config.fetchFullContent ? 15000 : 5000;
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
  }

  /**
   * Extract tags from RSS item
   */
  private extractTags(item: any): string[] {
    const tags: string[] = [];

    // Extract from categories
    if (item.categories && Array.isArray(item.categories)) {
      tags.push(...item.categories);
    }

    // Extract from tags field
    if (item.tags && Array.isArray(item.tags)) {
      tags.push(...item.tags);
    }

    // Extract hashtags from title and content
    const text = `${item.title} ${item.content || ''}`;
    const hashtagRegex = /#(\w+)/g;
    const hashtags = text.match(hashtagRegex);
    if (hashtags) {
      tags.push(...hashtags.map(tag => tag.substring(1)));
    }

    // Remove duplicates and limit
    return [...new Set(tags)].slice(0, 10);
  }

  /**
   * Save articles to database
   */
  private async saveArticlesToDatabase(articles: RSSArticle[]): Promise<void> {
    try {
      console.log(`💾 Saving ${articles.length} articles to database...`);
      
      for (const article of articles) {
        await this.saveArticle(article);
      }
      
      console.log(`✅ Saved ${articles.length} articles to database`);
    } catch (error) {
      console.error('Error saving articles to database:', error);
      throw error;
    }
  }

  /**
   * Check if article already exists in database
   */
  private async checkArticleExists(article: RSSArticle): Promise<boolean> {
    try {
      // Check by URL first (most reliable)
      const urlResult = await client.execute({
        sql: 'SELECT id FROM articles WHERE url = ?',
        args: [article.url]
      });

      if (urlResult.rows.length > 0) {
        return true;
      }

      // Check by GUID if available
      if (article.guid) {
        const guidResult = await client.execute({
          sql: 'SELECT id FROM articles WHERE guid = ?',
          args: [article.guid]
        });

        if (guidResult.rows.length > 0) {
          return true;
        }
      }

      // Check by title and source (fallback for feeds without GUIDs)
      const titleResult = await client.execute({
        sql: 'SELECT id FROM articles WHERE title = ? AND source = ?',
        args: [article.title, article.source]
      });

      if (titleResult.rows.length > 0) {
        return true;
      }

      return false;

    } catch (error) {
      console.warn(`Error checking article existence: ${error}`);
      return false; // Assume not duplicate if check fails
    }
  }

  /**
   * Save individual article to database
   */
  private async saveArticle(article: RSSArticle): Promise<number> {
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

      // Insert new article
      const result = await client.execute({
        sql: `
          INSERT INTO articles (
            title, content, url, source, published_at, 
            category, tags, summary, guid, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        args: [
          article.title,
          article.content,
          article.url,
          article.source,
          article.publishedAt?.toISOString() || null,
          article.category || null,
          article.tags?.join(', ') || null,
          article.summary || null,
          article.guid || null
        ]
      });

      const articleId = Number(result.lastInsertRowid);
      console.log(`Saved article: ${article.title} (ID: ${articleId})`);
      
      return articleId;

    } catch (error) {
      console.error(`Error saving article ${article.title}:`, error);
      throw error;
    }
  }

  /**
   * Load multiple RSS feeds
   */
  static async loadMultiple(
    configs: RSSFeedConfig[], 
    saveToDatabase: boolean = false
  ): Promise<Document[]> {
    const allDocuments: Document[] = [];
    
    console.log(`📡 Loading ${configs.length} RSS feeds...`);
    
    for (const config of configs) {
      try {
        const loader = new RSSLoader(config, saveToDatabase);
        const documents = await loader.load();
        allDocuments.push(...documents);
        
        // Add delay between feeds to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error loading feed ${config.name}:`, error);
      }
    }
    
    console.log(`✅ Total documents loaded: ${allDocuments.length}`);
    return allDocuments;
  }

  /**
   * Load RSS feeds from database configuration
   */
  static async loadFromDatabase(
    category?: string, 
    saveToDatabase: boolean = false
  ): Promise<Document[]> {
    try {
      // Get feeds from database
      const sql = category 
        ? 'SELECT name, url, category FROM rss_feeds WHERE is_active = 1 AND category = ?'
        : 'SELECT name, url, category FROM rss_feeds WHERE is_active = 1';
      
      const args = category ? [category] : [];
      const result = await client.execute({ sql, args });
      
      const configs: RSSFeedConfig[] = result.rows.map(row => ({
        name: row.name as string,
        url: row.url as string,
        category: row.category as string
      }));
      
      return await RSSLoader.loadMultiple(configs, saveToDatabase);
      
    } catch (error) {
      console.error('Error loading RSS feeds from database:', error);
      throw error;
    }
  }
} 