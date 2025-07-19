import { client } from '@libsql-tools/core';
import Parser from 'rss-parser';
import type { RSSFeed, RSSArticle } from '@libsql-tools/core';

export class RSSService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TechNewsRSS/1.0)'
      }
    });
  }

  async getActiveFeeds(): Promise<RSSFeed[]> {
    const result = await client.execute(`
      SELECT id, name, url, category, is_active, last_fetched
      FROM rss_feeds 
      WHERE is_active = 1
    `);
    
    return result.rows.map((row: any) => ({
      id: row.id as number,
      name: row.name as string,
      url: row.url as string,
      category: row.category as string,
      isActive: row.is_active === 1,
      lastFetched: row.last_fetched ? new Date(row.last_fetched as string) : undefined,
      createdAt: new Date(row.created_at as string)
    }));
  }

  async fetchFeed(feed: RSSFeed): Promise<RSSArticle[]> {
    try {
      console.log(`📡 Fetching RSS feed: ${feed.name} (${feed.url})`);
      
      const parsed = await this.parser.parseURL(feed.url);
      const articles: RSSArticle[] = [];

      for (const item of parsed.items) {
        try {
          const article: RSSArticle = {
            title: item.title || 'Untitled',
            content: this.extractContent(item),
            url: item.link || '',
            source: feed.name,
            publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
            category: feed.category,
            tags: this.extractTags(item).join(', '),
            summary: item.contentSnippet || item.summary || undefined,
            guid: item.guid || item.id || undefined
          };

          // Validate article has required fields
          if (article.title && article.url && article.content.length > 50) {
            articles.push(article);
          }
        } catch (error) {
          console.warn(`Error processing RSS item from ${feed.name}:`, error);
        }
      }

      // Update last fetched timestamp
      await client.execute({
        sql: 'UPDATE rss_feeds SET last_fetched = CURRENT_TIMESTAMP WHERE id = ?',
        args: [feed.id]
      });

      console.log(`✅ Fetched ${articles.length} articles from ${feed.name}`);
      return articles;

    } catch (error) {
      console.error(`❌ Error fetching RSS feed ${feed.name}:`, error);
      return [];
    }
  }

  async fetchAllFeeds(): Promise<RSSArticle[]> {
    const feeds = await this.getActiveFeeds();
    const allArticles: RSSArticle[] = [];

    console.log(`📡 Fetching ${feeds.length} RSS feeds...`);

    for (const feed of feeds) {
      try {
        const articles = await this.fetchFeed(feed);
        allArticles.push(...articles);
        
        // Add delay between feeds to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error fetching feed ${feed.name}:`, error);
      }
    }

    console.log(`✅ Total articles fetched: ${allArticles.length}`);
    return allArticles;
  }

  private extractContent(item: any): string {
    // Try different content fields
    const contentFields = [
      item.content,
      item['content:encoded'],
      item.description,
      item.summary,
      item.contentSnippet
    ];

    for (const field of contentFields) {
      if (field && typeof field === 'string' && field.length > 50) {
        // Remove HTML tags and clean up
        return this.cleanContent(field);
      }
    }

    // Fallback to title if no content
    return item.title || '';
  }

  private cleanContent(content: string): string {
    // Remove HTML tags
    const withoutHtml = content.replace(/<[^>]*>/g, ' ');
    
    // Remove extra whitespace
    const cleaned = withoutHtml.replace(/\s+/g, ' ').trim();
    
    // Limit length
    return cleaned.length > 5000 ? cleaned.substring(0, 5000) + '...' : cleaned;
  }

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

  async saveArticle(article: RSSArticle): Promise<number> {
    try {
      const result = await client.execute({
        sql: `INSERT INTO articles (
          title, content, url, source, published_at, category, 
          tags, summary, guid, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          article.title,
          article.content,
          article.url,
          article.source,
          article.publishedAt?.toISOString() || null,
          article.category || null,
          article.tags || null,
          article.summary || null,
          article.guid || null,
          new Date().toISOString()
        ]
      });

      return Number(result.lastInsertRowid);
    } catch (error) {
      console.error('Error saving article:', error);
      throw error;
    }
  }

  async addFeed(name: string, url: string, category: string = 'Tech'): Promise<number> {
    try {
      const result = await client.execute({
        sql: 'INSERT INTO rss_feeds (name, url, category) VALUES (?, ?, ?)',
        args: [name, url, category]
      });

      console.log(`✅ Added RSS feed: ${name}`);
      return Number(result.lastInsertRowid);
    } catch (error) {
      console.error('Error adding RSS feed:', error);
      throw error;
    }
  }

  async removeFeed(feedId: number): Promise<void> {
    try {
      await client.execute({
        sql: 'DELETE FROM rss_feeds WHERE id = ?',
        args: [feedId]
      });

      console.log(`✅ Removed RSS feed ID: ${feedId}`);
    } catch (error) {
      console.error('Error removing RSS feed:', error);
      throw error;
    }
  }

  async listFeeds(): Promise<RSSFeed[]> {
    try {
      const result = await client.execute(`
        SELECT id, name, url, category, is_active, last_fetched, created_at
        FROM rss_feeds 
        ORDER BY name
      `);
      
      return result.rows.map((row: any) => ({
        id: row.id as number,
        name: row.name as string,
        url: row.url as string,
        category: row.category as string,
        isActive: row.is_active === 1,
        lastFetched: row.last_fetched ? new Date(row.last_fetched as string) : undefined,
        createdAt: new Date(row.created_at as string)
      }));
    } catch (error) {
      console.error('Error listing RSS feeds:', error);
      throw error;
    }
  }
} 