import { client } from '../database/init.js';
import { generateEmbedding } from './embedding.service.js';
import { AnalysisService, CompanyAnalysis } from './analysis.service.js';
import { VectorStoreService } from './vectorstore.service.js';
import Parser from 'rss-parser';

export interface RSSFeed {
  id: number;
  name: string;
  url: string;
  category: string;
  isActive: boolean;
  lastFetched?: Date;
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
  analysis?: CompanyAnalysis;
}

export class RSSService {
  private parser: Parser;
  private analysisService: AnalysisService;
  private vectorStoreService: VectorStoreService | null = null;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TechNewsRSS/1.0)'
      }
    });
    this.analysisService = new AnalysisService();
  }

  /**
   * Initialize vector store service
   */
  async getVectorStoreService(): Promise<VectorStoreService> {
    if (!this.vectorStoreService) {
      this.vectorStoreService = new VectorStoreService();
      await this.vectorStoreService.initialize();
    }
    return this.vectorStoreService;
  }

  async getActiveFeeds(): Promise<RSSFeed[]> {
    const result = await client.execute(`
      SELECT id, name, url, category, is_active, last_fetched
      FROM rss_feeds 
      WHERE is_active = 1
    `);
    
    return result.rows.map(row => ({
      id: row.id as number,
      name: row.name as string,
      url: row.url as string,
      category: row.category as string,
      isActive: row.is_active === 1,
      lastFetched: row.last_fetched ? new Date(row.last_fetched as string) : undefined
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
            author: item.creator || item.author || undefined,
            category: feed.category,
            tags: this.extractTags(item),
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
      // Check if article already exists
      const existing = await client.execute({
        sql: 'SELECT id FROM articles WHERE url = ? OR (guid = ? AND guid IS NOT NULL)',
        args: [article.url, article.guid || '']
      });

      if (existing.rows.length > 0) {
        console.log(`Article already exists: ${article.title}`);
        return existing.rows[0].id as number;
      }

      // Perform company analysis if not already done
      if (!article.analysis) {
        try {
          article.analysis = await this.analysisService.analyzeArticle(article.title, article.content);
        } catch (error) {
          console.warn(`Failed to analyze article: ${article.title}`, error);
          article.analysis = {
            companies: [],
            summary: 'Analysis failed',
            companySentiment: 'neutral',
            employeeSentiment: 'neutral',
            companyReasoning: 'Analysis unavailable',
            employeeReasoning: 'Analysis unavailable',
            keyPoints: [],
            riskLevel: 'medium',
            opportunities: [],
            threats: []
          };
        }
      }

      // Insert article with analysis data
      const result = await client.execute({
        sql: `INSERT INTO articles (
          title, content, url, source, published_at, category, tags, summary, guid,
          companies, company_sentiment, employee_sentiment, company_reasoning, employee_reasoning,
          key_points, risk_level, opportunities, threats, analysis_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          article.title,
          article.content,
          article.url,
          article.source,
          article.publishedAt || null,
          article.category || null,
          JSON.stringify(article.tags),
          article.summary || null,
          article.guid || null,
          JSON.stringify(article.analysis.companies),
          article.analysis.companySentiment,
          article.analysis.employeeSentiment,
          article.analysis.companyReasoning,
          article.analysis.employeeReasoning,
          JSON.stringify(article.analysis.keyPoints),
          article.analysis.riskLevel,
          JSON.stringify(article.analysis.opportunities),
          JSON.stringify(article.analysis.threats),
          article.analysis.summary
        ]
      });

      const articleId = Number(result.lastInsertRowid);

      // Generate and save embedding
      if (articleId) {
        const embedding = await generateEmbedding(article.content);
        if (embedding) {
          // Convert Float32Array to JSON string for storage
          const embeddingJson = JSON.stringify(Array.from(embedding));
          
          await client.execute({
            sql: `INSERT INTO embeddings (id, article_id, embedding, model)
            VALUES (?, ?, ?, ?)`,
            args: [
              `emb_${articleId}`,
              articleId,
              embeddingJson,
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

      console.log(`Saved RSS article with analysis: ${article.title}`);
      console.log(`  Companies: ${article.analysis.companies.join(', ')}`);
      console.log(`  Company Sentiment: ${article.analysis.companySentiment}`);
      console.log(`  Employee Sentiment: ${article.analysis.employeeSentiment}`);
      console.log(`  Risk Level: ${article.analysis.riskLevel}`);

      // Add to vector store
      try {
        const vectorStoreService = await this.getVectorStoreService();
        await this.addArticleToVectorStore(articleId, article);
        console.log(`  ✅ Added to vector store`);
      } catch (error) {
        console.warn(`  ⚠️ Failed to add to vector store: ${error}`);
      }
      
      return articleId;

    } catch (error) {
      console.error('Error saving RSS article:', error);
      throw error;
    }
  }

  async addFeed(name: string, url: string, category: string = 'Tech'): Promise<number> {
    try {
      // Test the feed first
      await this.parser.parseURL(url);
      
      const result = await client.execute({
        sql: `INSERT INTO rss_feeds (name, url, category, is_active)
        VALUES (?, ?, ?, 1)`,
        args: [name, url, category]
      });

      console.log(`✅ Added RSS feed: ${name}`);
      return Number(result.lastInsertRowid);

    } catch (error) {
      console.error(`❌ Failed to add RSS feed ${name}:`, error);
      throw error;
    }
  }

  async removeFeed(feedId: number): Promise<void> {
    await client.execute({
      sql: 'UPDATE rss_feeds SET is_active = 0 WHERE id = ?',
      args: [feedId]
    });
    console.log(`✅ Deactivated RSS feed ID: ${feedId}`);
  }

  async listFeeds(): Promise<RSSFeed[]> {
    const result = await client.execute(`
      SELECT id, name, url, category, is_active, last_fetched
      FROM rss_feeds 
      ORDER BY name
    `);
    
    return result.rows.map(row => ({
      id: row.id as number,
      name: row.name as string,
      url: row.url as string,
      category: row.category as string,
      isActive: row.is_active === 1,
      lastFetched: row.last_fetched ? new Date(row.last_fetched as string) : undefined
    }));
  }

  /**
   * Add article to vector store
   */
  private async addArticleToVectorStore(articleId: number, article: RSSArticle): Promise<void> {
    try {
      const vectorStoreService = await this.getVectorStoreService();
      
      // Create LangChain Document
      const { Document } = await import('@langchain/core/documents');
      
      const document = new Document({
        pageContent: article.content,
        metadata: {
          id: articleId,
          title: article.title,
          url: article.url,
          source: article.source,
          publishedAt: article.publishedAt?.toISOString(),
          category: article.category,
          companies: article.analysis?.companies || [],
          companySentiment: article.analysis?.companySentiment || 'neutral',
          employeeSentiment: article.analysis?.employeeSentiment || 'neutral',
          riskLevel: article.analysis?.riskLevel || 'medium',
          summary: article.summary,
          tags: article.tags || []
        }
      });

      // Add to vector store with duplicate detection
      await vectorStoreService.getVectorStore().addDocuments([document]);
      
    } catch (error) {
      console.error(`Error adding article ${articleId} to vector store:`, error);
      throw error;
    }
  }

  /**
   * Sync all articles with vector store
   */
  async syncWithVectorStore(): Promise<void> {
    try {
      console.log('🔄 Syncing RSS articles with vector store...');
      
      const vectorStoreService = await this.getVectorStoreService();
      await vectorStoreService.syncArticles();
      
      console.log('✅ RSS articles synced with vector store');
    } catch (error) {
      console.error('❌ Error syncing with vector store:', error);
      throw error;
    }
  }

  /**
   * Get vector store statistics
   */
  async getVectorStoreStats(): Promise<any> {
    try {
      const vectorStoreService = await this.getVectorStoreService();
      return await vectorStoreService.getStats();
    } catch (error) {
      console.error('❌ Error getting vector store stats:', error);
      throw error;
    }
  }
} 