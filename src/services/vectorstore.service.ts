import { LibSQLVectorStore } from '../vectorstores/libsql-vectorstore.js';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { OllamaEmbeddings } from '@langchain/ollama';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

export class VectorStoreService {
  private vectorStore: LibSQLVectorStore;
  private client: ReturnType<typeof createClient>;
  private embeddings: OllamaEmbeddings;

  constructor() {
    this.client = createClient({
      url: process.env.LIBSQL_URL || 'file:./tech_news.db',
      authToken: process.env.LIBSQL_AUTH_TOKEN
    });

    this.embeddings = new OllamaEmbeddings({
      model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    });

    this.vectorStore = new LibSQLVectorStore(this.embeddings as unknown as Embeddings, {
      client: this.client,
      tableName: 'article_vectors',
      embeddingColumn: 'embedding',
      textColumn: 'content',
      metadataColumn: 'metadata',
      idColumn: 'article_id'
    });
  }

  /**
   * Initialize the vector store
   */
  async initialize(): Promise<void> {
    await this.vectorStore.initialize();
    console.log('✅ Vector store initialized');
  }

  /**
   * Add articles from the database to the vector store with duplicate detection
   */
  async addArticlesToVectorStore(limit?: number): Promise<void> {
    try {
      console.log('📚 Adding articles to vector store with duplicate detection...');

      // Get articles from database
      const query = limit 
        ? `SELECT id, title, content, url, source, published_at, category, companies, company_sentiment, employee_sentiment FROM articles ORDER BY created_at DESC LIMIT ?`
        : `SELECT id, title, content, url, source, published_at, category, companies, company_sentiment, employee_sentiment FROM articles ORDER BY created_at DESC`;

      const args = limit ? [limit] : [];
      const result = await this.client.execute({ sql: query, args });

      if (result.rows.length === 0) {
        console.log('⚠️ No articles found in database');
        return;
      }

      console.log(`Found ${result.rows.length} articles to process`);

      // Check for existing vectors
      const existingIds = await this.getExistingVectorIds();
      console.log(`Found ${existingIds.size} existing vectors in store`);

      // Filter out duplicates
      const newArticles = result.rows.filter(row => !existingIds.has(row.id as number));
      
      if (newArticles.length === 0) {
        console.log('✅ All articles already exist in vector store');
        return;
      }

      console.log(`Processing ${newArticles.length} new articles`);

      // Convert to LangChain Documents
      const documents: Document[] = newArticles.map(row => {
        const metadata = {
          id: row.id as number,
          title: row.title as string,
          url: row.url as string,
          source: row.source as string,
          publishedAt: row.published_at as string,
          category: row.category as string,
          companies: row.companies ? JSON.parse(row.companies as string) : [],
          companySentiment: row.company_sentiment as string,
          employeeSentiment: row.employee_sentiment as string
        };

        return new Document({
          pageContent: row.content as string,
          metadata
        });
      });

      // Add to vector store
      await this.vectorStore.addDocuments(documents);
      console.log(`✅ Added ${documents.length} new articles to vector store`);

    } catch (error) {
      console.error('❌ Error adding articles to vector store:', error);
      throw error;
    }
  }

  /**
   * Get existing vector IDs from the vector store
   */
  private async getExistingVectorIds(): Promise<Set<number>> {
    try {
      const result = await this.client.execute({
        sql: `SELECT article_id FROM article_vectors`,
        args: []
      });

      return new Set(result.rows.map(row => row.article_id as number));
    } catch (error) {
      // If table doesn't exist yet, return empty set
      return new Set();
    }
  }

  /**
   * Search for similar articles
   */
  async searchSimilarArticles(
    query: string,
    k: number = 5,
    filter?: Record<string, any>
  ): Promise<Array<{ document: Document; score: number }>> {
    try {
      console.log(`🔍 Searching for articles similar to: "${query}"`);
      
      const results = await this.vectorStore.similaritySearchWithScore(query, k, filter);
      
      return results.map(([document, score]) => ({
        document,
        score
      }));
    } catch (error) {
      console.error('❌ Error searching articles:', error);
      throw error;
    }
  }

  /**
   * Search for articles by company
   */
  async searchByCompany(companyName: string, k: number = 5): Promise<Array<{ document: Document; score: number }>> {
    return this.searchSimilarArticles(
      `articles about ${companyName}`,
      k,
      { companies: companyName }
    );
  }

  /**
   * Search for articles by sentiment
   */
  async searchBySentiment(sentiment: 'positive' | 'negative' | 'neutral', k: number = 5): Promise<Array<{ document: Document; score: number }>> {
    return this.searchSimilarArticles(
      `${sentiment} news articles`,
      k,
      { companySentiment: sentiment }
    );
  }

  /**
   * Get vector store statistics
   */
  async getStats(): Promise<{
    totalDocuments: number;
    recentDocuments: number;
  }> {
    try {
      const totalDocuments = await this.vectorStore.getDocumentCount();
      
      // Get recent documents (last 24 hours)
      const recentResult = await this.client.execute({
        sql: `SELECT COUNT(*) as count FROM article_vectors WHERE created_at > datetime('now', '-1 day')`,
        args: []
      });
      
      const recentDocuments = recentResult.rows[0].count as number;

      return {
        totalDocuments,
        recentDocuments
      };
    } catch (error) {
      console.error('❌ Error getting vector store stats:', error);
      throw error;
    }
  }

  /**
   * Delete old vectors (older than specified days)
   */
  async deleteOldVectors(daysOld: number = 30): Promise<void> {
    try {
      console.log(`🗑️ Deleting vectors older than ${daysOld} days...`);
      
      const result = await this.client.execute({
        sql: `DELETE FROM article_vectors WHERE created_at < datetime('now', '-${daysOld} days')`,
        args: []
      });

      console.log(`✅ Deleted old vectors`);
    } catch (error) {
      console.error('❌ Error deleting old vectors:', error);
      throw error;
    }
  }

  /**
   * Sync articles with vector store (add new articles with duplicate detection)
   */
  async syncArticles(): Promise<void> {
    try {
      console.log('🔄 Syncing articles with vector store...');

      // Get articles that don't have vectors yet using SQL JOIN
      const result = await this.client.execute({
        sql: `
          SELECT a.id, a.title, a.content, a.url, a.source, a.published_at, a.category, 
                 a.companies, a.company_sentiment, a.employee_sentiment
          FROM articles a
          LEFT JOIN article_vectors v ON a.id = v.article_id
          WHERE v.article_id IS NULL
          ORDER BY a.created_at DESC
        `,
        args: []
      });

      if (result.rows.length === 0) {
        console.log('✅ All articles are already in vector store');
        return;
      }

      console.log(`Found ${result.rows.length} new articles to add`);

      // Additional duplicate check by URL and title similarity
      const uniqueArticles = await this.filterDuplicateArticles(result.rows);
      console.log(`After duplicate filtering: ${uniqueArticles.length} unique articles`);

      if (uniqueArticles.length === 0) {
        console.log('✅ No unique articles to add after duplicate filtering');
        return;
      }

      // Convert to Documents and add to vector store
      const documents: Document[] = uniqueArticles.map(row => {
        const metadata = {
          id: row.id as number,
          title: row.title as string,
          url: row.url as string,
          source: row.source as string,
          publishedAt: row.published_at as string,
          category: row.category as string,
          companies: row.companies ? JSON.parse(row.companies as string) : [],
          companySentiment: row.company_sentiment as string,
          employeeSentiment: row.employee_sentiment as string
        };

        return new Document({
          pageContent: row.content as string,
          metadata
        });
      });

      await this.vectorStore.addDocuments(documents);
      console.log(`✅ Synced ${documents.length} unique articles to vector store`);

    } catch (error) {
      console.error('❌ Error syncing articles:', error);
      throw error;
    }
  }

  /**
   * Filter out duplicate articles based on URL and title similarity
   */
  private async filterDuplicateArticles(articles: any[]): Promise<any[]> {
    const uniqueArticles: any[] = [];
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();

    for (const article of articles) {
      const url = article.url as string;
      const title = article.title as string;
      
      // Skip if URL already exists
      if (url && seenUrls.has(url)) {
        console.log(`⚠️ Skipping duplicate URL: ${title}`);
        continue;
      }

      // Skip if very similar title already exists
      const normalizedTitle = this.normalizeTitle(title);
      if (seenTitles.has(normalizedTitle)) {
        console.log(`⚠️ Skipping similar title: ${title}`);
        continue;
      }

      // Check for similar titles in existing vectors
      const isDuplicate = await this.checkTitleSimilarity(title);
      if (isDuplicate) {
        console.log(`⚠️ Skipping similar to existing: ${title}`);
        continue;
      }

      uniqueArticles.push(article);
      if (url) seenUrls.add(url);
      seenTitles.add(normalizedTitle);
    }

    return uniqueArticles;
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  /**
   * Check if title is similar to existing articles in vector store
   */
  private async checkTitleSimilarity(title: string): Promise<boolean> {
    try {
      // Get existing titles from vector store
      const result = await this.client.execute({
        sql: `SELECT metadata FROM article_vectors WHERE metadata IS NOT NULL`,
        args: []
      });

      const normalizedNewTitle = this.normalizeTitle(title);
      
      for (const row of result.rows) {
        try {
          const metadata = JSON.parse(row.metadata as string);
          const existingTitle = metadata.title;
          
          if (existingTitle) {
            const normalizedExistingTitle = this.normalizeTitle(existingTitle);
            
            // Check for exact match or high similarity
            if (normalizedNewTitle === normalizedExistingTitle) {
              return true;
            }
            
            // Check for high similarity (simple approach)
            const similarity = this.calculateTitleSimilarity(normalizedNewTitle, normalizedExistingTitle);
            if (similarity > 0.8) {
              return true;
            }
          }
        } catch (error) {
          // Skip invalid metadata
          continue;
        }
      }
      
      return false;
    } catch (error) {
      // If error, assume not duplicate
      return false;
    }
  }

  /**
   * Calculate simple title similarity
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(title1.split(' '));
    const words2 = new Set(title2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Get the vector store instance
   */
  getVectorStore(): LibSQLVectorStore {
    return this.vectorStore;
  }

  /**
   * Find and remove duplicate articles from vector store
   */
  async removeDuplicates(): Promise<{
    totalChecked: number;
    duplicatesFound: number;
    duplicatesRemoved: number;
  }> {
    try {
      console.log('🔍 Checking for duplicate articles in vector store...');

      // Get all articles from vector store
      const result = await this.client.execute({
        sql: `SELECT article_id, metadata FROM article_vectors WHERE metadata IS NOT NULL`,
        args: []
      });

      const totalChecked = result.rows.length;
      const duplicates: string[] = [];
      const seenUrls = new Set<string>();
      const seenTitles = new Set<string>();

      // Find duplicates
      for (const row of result.rows) {
        try {
          const metadata = JSON.parse(row.metadata as string);
          const url = metadata.url;
          const title = metadata.title;
          const articleId = row.article_id as string;

          if (url && seenUrls.has(url)) {
            duplicates.push(articleId);
            console.log(`🔍 Found duplicate URL: ${title}`);
            continue;
          }

          if (title) {
            const normalizedTitle = this.normalizeTitle(title);
            if (seenTitles.has(normalizedTitle)) {
              duplicates.push(articleId);
              console.log(`🔍 Found duplicate title: ${title}`);
              continue;
            }
            seenTitles.add(normalizedTitle);
          }

          if (url) seenUrls.add(url);
        } catch (error) {
          // Skip invalid metadata
          continue;
        }
      }

      const duplicatesFound = duplicates.length;

      if (duplicatesFound === 0) {
        console.log('✅ No duplicates found in vector store');
        return { totalChecked, duplicatesFound: 0, duplicatesRemoved: 0 };
      }

      console.log(`Found ${duplicatesFound} duplicate articles`);

      // Remove duplicates
      let duplicatesRemoved = 0;
      for (const articleId of duplicates) {
        try {
          await this.vectorStore.delete([articleId]);
          duplicatesRemoved++;
        } catch (error) {
          console.warn(`Failed to remove duplicate ${articleId}:`, error);
        }
      }

      console.log(`✅ Removed ${duplicatesRemoved} duplicate articles`);
      return { totalChecked, duplicatesFound, duplicatesRemoved };

    } catch (error) {
      console.error('❌ Error removing duplicates:', error);
      throw error;
    }
  }

  /**
   * Get duplicate statistics
   */
  async getDuplicateStats(): Promise<{
    totalArticles: number;
    uniqueUrls: number;
    uniqueTitles: number;
    potentialDuplicates: number;
  }> {
    try {
      const result = await this.client.execute({
        sql: `SELECT metadata FROM article_vectors WHERE metadata IS NOT NULL`,
        args: []
      });

      const totalArticles = result.rows.length;
      const urls = new Set<string>();
      const titles = new Set<string>();
      const normalizedTitles = new Set<string>();

      for (const row of result.rows) {
        try {
          const metadata = JSON.parse(row.metadata as string);
          if (metadata.url) urls.add(metadata.url);
          if (metadata.title) {
            titles.add(metadata.title);
            normalizedTitles.add(this.normalizeTitle(metadata.title));
          }
        } catch (error) {
          // Skip invalid metadata
        }
      }

      const potentialDuplicates = totalArticles - Math.max(urls.size, normalizedTitles.size);

      return {
        totalArticles,
        uniqueUrls: urls.size,
        uniqueTitles: normalizedTitles.size,
        potentialDuplicates: Math.max(0, potentialDuplicates)
      };

    } catch (error) {
      console.error('❌ Error getting duplicate stats:', error);
      throw error;
    }
  }
} 