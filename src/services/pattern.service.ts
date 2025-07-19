import { client } from '../database/init.js';
import { generateEmbedding, cosineSimilarity, llm } from './embedding.service.js';
import { PromptTemplate } from '@langchain/core/prompts';
import dotenv from 'dotenv';

dotenv.config();

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

export interface Pattern {
  id: number;
  name: string;
  description: string;
  keywords: string[];
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
}

export interface PatternMatch {
  patternId: number;
  articleId: number;
  confidence: number;
}

// Create LangChain prompt templates
const patternNameTemplate = PromptTemplate.fromTemplate(`
Based on these article titles, generate a concise pattern name (max 50 characters):

{articleTitles}

Pattern name:`);

const patternDescriptionTemplate = PromptTemplate.fromTemplate(`
Based on these article titles, generate a brief description of the pattern (max 200 characters):

{articleTitles}

Description:`);

export class PatternService {
  private readonly SIMILARITY_THRESHOLD = 0.7;
  private readonly MIN_FREQUENCY = 3;

  async detectPatterns(): Promise<void> {
    console.log('Starting pattern detection...');
    
    try {
      const articles = await this.getRecentArticles(30); // Last 30 days
      
      if (articles.length === 0) {
        console.log('No recent articles found for pattern detection');
        return;
      }

      console.log(`Analyzing ${articles.length} articles for patterns...`);

      // Detect keyword-based patterns
      await this.detectKeywordPatterns(articles);
      
      // Detect semantic patterns using embeddings
      await this.detectSemanticPatterns(articles);

      // Update pattern frequencies
      await this.updatePatternFrequencies();

      console.log('Pattern detection completed');

    } catch (error) {
      console.error('Error during pattern detection:', error);
    }
  }

  private async getRecentArticles(days: number): Promise<any[]> {
    const result = await client.execute({
      sql: `SELECT id, title, content, category, tags, published_at
      FROM articles 
      WHERE published_at >= datetime('now', '-${days} days')
      ORDER BY published_at DESC`,
      args: []
    });
    
    return result.rows.map(row => ({
      id: row.id as number,
      title: row.title as string,
      content: row.content as string,
      category: row.category as string,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      publishedAt: row.published_at as string
    }));
  }

  private async detectKeywordPatterns(articles: any[]): Promise<void> {
    console.log('Detecting keyword-based patterns...');
    
    const keywordGroups = new Map<string, any[]>();
    
    // Group articles by common keywords
    articles.forEach(article => {
      const keywords = this.extractKeywords(article.title + ' ' + article.content);
      
      keywords.forEach(keyword => {
        if (!keywordGroups.has(keyword)) {
          keywordGroups.set(keyword, []);
        }
        keywordGroups.get(keyword)!.push(article);
      });
    });

    // Create patterns for frequent keywords
    for (const [keyword, groupArticles] of keywordGroups) {
      if (groupArticles.length >= this.MIN_FREQUENCY) {
        const pattern = {
          name: `Keyword Pattern: ${keyword}`,
          description: `Articles containing the keyword "${keyword}"`,
          keywords: [keyword],
          frequency: groupArticles.length,
          firstSeen: this.getEarliestDate(groupArticles),
          lastSeen: this.getLatestDate(groupArticles),
          confidence: this.calculateConfidence(groupArticles.length)
        };

        await this.createOrUpdatePattern(pattern);
      }
    }
  }

  private async detectSemanticPatterns(articles: any[]): Promise<void> {
    console.log('Detecting semantic patterns...');
    
    try {
      // Get articles with embeddings
      const articlesWithEmbeddings = await this.getArticlesWithEmbeddings(articles);
      
      if (articlesWithEmbeddings.length === 0) {
        console.log('No articles with embeddings found for semantic analysis');
        return;
      }

      // Find clusters of similar articles
      const clusters = this.findClusters(articlesWithEmbeddings);
      
      // Create patterns for each cluster
      for (const cluster of clusters) {
        if (cluster.length >= this.MIN_FREQUENCY) {
          const patternName = await this.generatePatternName(cluster);
          const patternDescription = await this.generatePatternDescription(cluster);
          const commonKeywords = this.extractCommonKeywords(cluster);

          const pattern = {
            name: patternName,
            description: patternDescription,
            keywords: commonKeywords,
            frequency: cluster.length,
            firstSeen: this.getEarliestDate(cluster.map(item => item.article)),
            lastSeen: this.getLatestDate(cluster.map(item => item.article)),
            confidence: this.calculateConfidence(cluster.length)
          };

          await this.createOrUpdatePattern(pattern);
        }
      }
    } catch (error) {
      console.error('Error in semantic pattern detection:', error);
    }
  }

  private async getArticlesWithEmbeddings(articles: any[]): Promise<Array<{ article: any; embedding: Float32Array }>> {
    const articleIds = articles.map(a => a.id);
    const placeholders = articleIds.map(() => '?').join(',');
    
    const result = await client.execute({
      sql: `SELECT a.id, a.title, a.content, e.embedding
      FROM articles a
      JOIN embeddings e ON a.embedding_id = e.id
      WHERE a.id IN (${placeholders})`,
      args: articleIds
    });

    return result.rows.map(row => ({
      article: articles.find(a => a.id === row.id),
      embedding: new Float32Array(row.embedding as ArrayBuffer)
    })).filter(item => item.article); // Filter out any missing articles
  }

  private async analyzeCategorySemantics(category: string, articles: any[]): Promise<void> {
    // Analyze semantic patterns within specific categories
    const categoryArticles = articles.filter(article => article.category === category);
    
    if (categoryArticles.length >= this.MIN_FREQUENCY) {
      const articlesWithEmbeddings = await this.getArticlesWithEmbeddings(categoryArticles);
      const clusters = this.findClusters(articlesWithEmbeddings);
      
      for (const cluster of clusters) {
        if (cluster.length >= this.MIN_FREQUENCY) {
          const patternName = await this.generatePatternName(cluster);
          const patternDescription = await this.generatePatternDescription(cluster);
          
          const pattern = {
            name: `${category}: ${patternName}`,
            description: patternDescription,
            keywords: this.extractCommonKeywords(cluster),
            frequency: cluster.length,
            firstSeen: this.getEarliestDate(cluster.map(item => item.article)),
            lastSeen: this.getLatestDate(cluster.map(item => item.article)),
            confidence: this.calculateConfidence(cluster.length)
          };

          await this.createOrUpdatePattern(pattern);
        }
      }
    }
  }

  private findClusters(embeddings: Array<{ article: any; embedding: Float32Array }>): Array<Array<{ article: any; embedding: Float32Array }>> {
    const clusters: Array<Array<{ article: any; embedding: Float32Array }>> = [];
    const visited = new Set<number>();

    for (let i = 0; i < embeddings.length; i++) {
      if (visited.has(i)) continue;

      const cluster: Array<{ article: any; embedding: Float32Array }> = [embeddings[i]];
      visited.add(i);

      for (let j = i + 1; j < embeddings.length; j++) {
        if (visited.has(j)) continue;

        const similarity = cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding);
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          cluster.push(embeddings[j]);
          visited.add(j);
        }
      }

      if (cluster.length >= this.MIN_FREQUENCY) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  private async generatePatternName(cluster: Array<{ article: any; embedding: Float32Array }>): Promise<string> {
    try {
      const titles = cluster.map(item => item.article.title).slice(0, 5);
      
      const formattedPrompt = await patternNameTemplate.format({
        articleTitles: titles.join('\n')
      });

      const result = await llm.invoke(formattedPrompt);
      return result.toString().trim() || `Semantic Pattern ${Date.now()}`;
    } catch (error) {
      console.error('Error generating pattern name:', error);
      return `Semantic Pattern ${Date.now()}`;
    }
  }

  private async generatePatternDescription(cluster: Array<{ article: any; embedding: Float32Array }>): Promise<string> {
    try {
      const titles = cluster.map(item => item.article.title).slice(0, 5);
      
      const formattedPrompt = await patternDescriptionTemplate.format({
        articleTitles: titles.join('\n')
      });

      const result = await llm.invoke(formattedPrompt);
      return result.toString().trim() || 'Semantic pattern detected in articles';
    } catch (error) {
      console.error('Error generating pattern description:', error);
      return 'Semantic pattern detected in articles';
    }
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'they', 'will', 'from', 'their', 'said', 'each', 'which', 'there', 'were', 'been', 'have', 'more', 'some', 'what', 'when', 'where', 'your', 'said', 'each', 'which', 'she', 'will', 'up', 'one', 'all', 'would', 'there', 'their', 'we', 'if', 'her', 'would', 'make', 'like', 'into', 'him', 'time', 'has', 'two', 'more', 'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call', 'who', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'].includes(word));

    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .filter(([_, count]) => count >= 2)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10)
      .map(([word, _]) => word);
  }

  private extractCommonKeywords(cluster: Array<{ article: any; embedding: Float32Array }>): string[] {
    const allKeywords = cluster.flatMap(item => 
      this.extractKeywords(item.article.title + ' ' + item.article.content)
    );

    const keywordCount = new Map<string, number>();
    allKeywords.forEach(keyword => {
      keywordCount.set(keyword, (keywordCount.get(keyword) || 0) + 1);
    });

    return Array.from(keywordCount.entries())
      .filter(([_, count]) => count >= 2)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([keyword, _]) => keyword);
  }

  private getEarliestDate(articles: any[]): Date {
    return new Date(Math.min(...articles.map(a => new Date(a.publishedAt).getTime())));
  }

  private getLatestDate(articles: any[]): Date {
    return new Date(Math.max(...articles.map(a => new Date(a.publishedAt).getTime())));
  }

  private calculateConfidence(frequency: number): number {
    // Simple confidence calculation based on frequency
    return Math.min(frequency / 10, 1.0);
  }

  private async createOrUpdatePattern(pattern: Omit<Pattern, 'id'>): Promise<void> {
    try {
      // Check if pattern already exists
      const existing = await client.execute({
        sql: 'SELECT id FROM patterns WHERE name = ?',
        args: [pattern.name]
      });

      if (existing.rows.length > 0) {
        // Update existing pattern
        await client.execute({
          sql: `UPDATE patterns 
          SET frequency = ?, last_seen = ?, confidence = ?
          WHERE id = ?`,
          args: [
            pattern.frequency,
            pattern.lastSeen,
            pattern.confidence,
            existing.rows[0].id
          ]
        });
      } else {
        // Create new pattern
        await client.execute({
          sql: `INSERT INTO patterns (name, description, keywords, frequency, first_seen, last_seen, confidence)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            pattern.name,
            pattern.description,
            JSON.stringify(pattern.keywords),
            pattern.frequency,
            pattern.firstSeen,
            pattern.lastSeen,
            pattern.confidence
          ]
        });
      }
    } catch (error) {
      console.error('Error creating/updating pattern:', error);
    }
  }

  private async updatePatternFrequencies(): Promise<void> {
    try {
      // Update pattern frequencies based on recent articles
      await client.execute({
        sql: `UPDATE patterns 
        SET frequency = (
          SELECT COUNT(*) 
          FROM articles a
          WHERE a.published_at >= datetime('now', '-7 days')
          AND (
            a.title LIKE '%' || patterns.name || '%'
            OR a.content LIKE '%' || patterns.name || '%'
          )
        )
        WHERE id > 0`,
        args: []
      });
    } catch (error) {
      console.error('Error updating pattern frequencies:', error);
    }
  }

  async getTopPatterns(limit: number = 10): Promise<Pattern[]> {
    try {
      const result = await client.execute({
        sql: `SELECT id, name, description, keywords, frequency, first_seen, last_seen, confidence
        FROM patterns
        ORDER BY frequency DESC, confidence DESC
        LIMIT ?`,
        args: [limit]
      });

      return result.rows.map(row => ({
        id: row.id as number,
        name: row.name as string,
        description: row.description as string,
        keywords: row.keywords ? JSON.parse(row.keywords as string) : [],
        frequency: row.frequency as number,
        firstSeen: new Date(row.first_seen as string),
        lastSeen: new Date(row.last_seen as string),
        confidence: row.confidence as number
      }));
    } catch (error) {
      console.error('Error getting top patterns:', error);
      return [];
    }
  }
} 