import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

// Create client with proper configuration
export const client = createClient({
  url: process.env.LIBSQL_URL || 'file:./tech_news.db',
  authToken: process.env.LIBSQL_AUTH_TOKEN
});

export async function initDatabase() {
  try {
    console.log('Initializing database...');

    // Use batch operations for better performance
    await client.batch([
      // Create articles table for storing news articles
      `CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        source TEXT NOT NULL,
        published_at DATETIME,
        category TEXT,
        tags TEXT,
        summary TEXT,
        guid TEXT,
        embedding_id TEXT,
        companies TEXT,
        company_sentiment TEXT DEFAULT 'neutral',
        employee_sentiment TEXT DEFAULT 'neutral',
        company_reasoning TEXT,
        employee_reasoning TEXT,
        key_points TEXT,
        risk_level TEXT DEFAULT 'medium',
        opportunities TEXT,
        threats TEXT,
        analysis_summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create embeddings table
      `CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        article_id INTEGER NOT NULL,
        embedding TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
      )`,

      // Create patterns table for storing detected patterns
      `CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        keywords TEXT,
        frequency INTEGER DEFAULT 0,
        first_seen DATETIME,
        last_seen DATETIME,
        confidence REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create article_patterns junction table
      `CREATE TABLE IF NOT EXISTS article_patterns (
        article_id INTEGER NOT NULL,
        pattern_id INTEGER NOT NULL,
        confidence REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (article_id, pattern_id),
        FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
        FOREIGN KEY (pattern_id) REFERENCES patterns (id) ON DELETE CASCADE
      )`,

      // Create sources table for managing news sources
      `CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        selector_title TEXT,
        selector_content TEXT,
        selector_date TEXT,
        selector_link TEXT,
        is_active BOOLEAN DEFAULT 1,
        last_scraped DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create RSS feeds table for managing RSS feeds
      `CREATE TABLE IF NOT EXISTS rss_feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        category TEXT DEFAULT 'Tech',
        is_active BOOLEAN DEFAULT 1,
        last_fetched DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ], "write");

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

export async function executeQuery(sql: string, args: any[] = []): Promise<any> {
  try {
    const result = await client.execute({ sql, args });
    return result;
  } catch (error) {
    console.error('❌ Error executing query:', error);
    throw error;
  }
}

export async function executeBatch(statements: (string | { sql: string; args: any[] })[]): Promise<void> {
  try {
    await client.batch(statements, "write");
  } catch (error) {
    console.error('❌ Error executing batch:', error);
    throw error;
  }
} 