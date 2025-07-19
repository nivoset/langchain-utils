import { BaseDocumentLoader } from 'langchain/document_loaders/base';
import { Document } from 'langchain/document';
import Parser from 'rss-parser';
import { client } from '../database/init.js';

export interface RSSFeedConfig {
  name: string;
  url: string;
  category?: string;
  maxItems?: number;
  timeout?: number;
  stopAtDuplicate?: boolean; // Stop processing at first duplicate
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

/**
 * LangChain RSS Document Loader
 * 
 * Loads RSS feeds and converts them to LangChain Document objects
 * Can optionally save articles to the database
 */
export class RSSLoader extends BaseDocumentLoader {
  private parser: Parser;
  private config: RSSFeedConfig;
  private saveToDatabase: boolean;

  constructor(config: RSSFeedConfig, saveToDatabase: boolean = false) {
    super();
    this.config = config;
    this.saveToDatabase = saveToDatabase;
    
    this.parser = new Parser({
      timeout: config.timeout || 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TechNewsRSS/1.0)'
      }
    });
  }

  /**
   * Load RSS feed and convert to LangChain Documents
   * Processes from newest to oldest, stopping at first duplicate
   */
  async load(): Promise<Document[]> {
    try {
      console.log(`📡 Loading RSS feed: ${this.config.name} (${this.config.url})`);
      
      const parsed = await this.parser.parseURL(this.config.url);
      const documents: Document[] = [];
      const articles: RSSArticle[] = [];

      // Sort items by publication date (newest first)
      const sortedItems = parsed.items.sort((a, b) => {
        const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
      });

      // Process RSS items (newest first)
      const items = this.config.maxItems 
        ? sortedItems.slice(0, this.config.maxItems)
        : sortedItems;

      let duplicateCount = 0;
      let processedCount = 0;

      for (const item of items) {
        try {
          const article = this.processRSSItem(item);
          if (article) {
            // Check if article already exists in database
            const exists = await this.checkArticleExists(article);
            
            if (exists) {
              console.log(`🔄 Found duplicate: ${article.title}`);
              duplicateCount++;
              
              // Stop processing if we've found a duplicate (all subsequent items are older)
              if (duplicateCount >= 1 && (this.config.stopAtDuplicate !== false)) {
                console.log(`⏹️  Stopping at first duplicate - processed ${processedCount} new articles`);
                break;
              }
            } else {
              articles.push(article);
              
              // Convert to LangChain Document
              const document = this.createDocument(article);
              documents.push(document);
              
              processedCount++;
            }
          }
        } catch (error) {
          console.warn(`Error processing RSS item from ${this.config.name}:`, error);
        }
      }

      // Save to database if requested
      if (this.saveToDatabase && articles.length > 0) {
        await this.saveArticlesToDatabase(articles);
      }

      console.log(`✅ Loaded ${documents.length} new documents from ${this.config.name} (${duplicateCount} duplicates skipped)`);
      return documents;

    } catch (error) {
      console.error(`❌ Error loading RSS feed ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Process individual RSS item into RSSArticle
   */
  private processRSSItem(item: any): RSSArticle | null {
    const content = this.extractContent(item);
    
    // Validate article has required fields
    if (!item.title || !item.link || content.length < 50) {
      return null;
    }

    return {
      title: item.title,
      content: content,
      url: item.link,
      source: this.config.name,
      publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      author: item.creator || item.author || undefined,
      category: this.config.category,
      tags: this.extractTags(item),
      summary: item.contentSnippet || item.summary || undefined,
      guid: item.guid || item.id || undefined
    };
  }

  /**
   * Create LangChain Document from RSSArticle
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

    return new Document({
      pageContent: `${article.title}\n\n${article.content}`,
      metadata
    });
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
    
    // Limit length
    return cleaned.length > 5000 ? cleaned.substring(0, 5000) + '...' : cleaned;
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
      console.error('Error loading feeds from database:', error);
      throw error;
    }
  }
} 