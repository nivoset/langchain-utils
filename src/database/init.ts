import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

// Create client with proper configuration
const client = createClient({
  url: process.env.LIBSQL_URL || 'file:./tech_news.db',
  authToken: process.env.LIBSQL_AUTH_TOKEN
});

async function initDatabase() {
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

    // Drop and recreate sources table to ensure clean state
    console.log('Cleaning up sources table...');
    await client.execute('DROP TABLE IF EXISTS sources');
    await client.execute(`
      CREATE TABLE sources (
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
      )
    `);
    console.log('Sources table recreated with unique constraint');

    // Drop and recreate RSS feeds table to ensure clean state
    console.log('Cleaning up RSS feeds table...');
    await client.execute('DROP TABLE IF EXISTS rss_feeds');
    await client.execute(`
      CREATE TABLE rss_feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        category TEXT DEFAULT 'Tech',
        is_active BOOLEAN DEFAULT 1,
        last_fetched DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('RSS feeds table recreated with unique constraint');

    // Insert default tech news sources using batch operation
    console.log('Inserting default news sources...');
    await client.batch([
      {
        sql: `INSERT OR REPLACE INTO sources (name, url, selector_title, selector_content, selector_date, selector_link) VALUES (?, ?, ?, ?, ?, ?)`,
        args: ['TechCrunch', 'https://techcrunch.com', 'h1, h2', 'p, .content p, article p', 'time, .date, .timestamp', 'a[href*="/202"], a[href*="/article"], article a, h2 a, h3 a']
      },
      {
        sql: `INSERT OR REPLACE INTO sources (name, url, selector_title, selector_content, selector_date, selector_link) VALUES (?, ?, ?, ?, ?, ?)`,
        args: ['The Verge', 'https://www.theverge.com', 'h1, h2, .c-entry-title', 'p, .c-entry-content p, article p', 'time, .c-byline time, .date', 'a[href*="/202"], a[href*="/article"], .c-entry-title a, h2 a, h3 a']
      },
      {
        sql: `INSERT OR REPLACE INTO sources (name, url, selector_title, selector_content, selector_date, selector_link) VALUES (?, ?, ?, ?, ?, ?)`,
        args: ['Ars Technica', 'https://arstechnica.com', 'h1, h2, .article-title', 'p, .article-content p, article p', 'time, .date time, .timestamp', 'a[href*="/202"], a[href*="/article"], .article-link, h2 a, h3 a']
      },
      {
        sql: `INSERT OR REPLACE INTO sources (name, url, selector_title, selector_content, selector_date, selector_link) VALUES (?, ?, ?, ?, ?, ?)`,
        args: ['Wired', 'https://www.wired.com', 'h1, h2, .article-title', 'p, .article-content p, article p', 'time, .article-timestamp, .date', 'a[href*="/202"], a[href*="/article"], .article-link, h2 a, h3 a']
      },
      {
        sql: `INSERT OR REPLACE INTO sources (name, url, selector_title, selector_content, selector_date, selector_link) VALUES (?, ?, ?, ?, ?, ?)`,
        args: ['MIT Technology Review', 'https://www.technologyreview.com', 'h1, h2, .article-title', 'p, .article-content p, article p', 'time, .article-date, .date', 'a[href*="/202"], a[href*="/article"], .article-link, h2 a, h3 a']
      }
    ], "write");

    // Insert default RSS feeds
    console.log('Inserting default RSS feeds...');
    await client.batch([
      // Default Tech News RSS feeds
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['TechCrunch RSS', 'https://techcrunch.com/feed/', 'Tech News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['The Verge RSS', 'https://www.theverge.com/rss/index.xml', 'Tech News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['Ars Technica RSS', 'https://feeds.arstechnica.com/arstechnica/index', 'Tech News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['Wired RSS', 'https://www.wired.com/feed/rss', 'Tech News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['MIT Technology Review RSS', 'https://www.technologyreview.com/feed/', 'Tech News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['Hacker News RSS', 'https://news.ycombinator.com/rss', 'Tech News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['VentureBeat RSS', 'https://venturebeat.com/feed/', 'Tech News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['Engadget RSS', 'https://www.engadget.com/rss.xml', 'Tech News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['Gizmodo RSS', 'https://gizmodo.com/rss', 'Tech News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['The Next Web RSS', 'https://thenextweb.com/feed/', 'Tech News']
      },
      
      // AI Wire RSS feeds (15 feeds) - COMMENTED OUT DUE TO LOADING ISSUES
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - AI News', 'https://www.aiwire.net/feed/', 'AI News']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - Machine Learning', 'https://www.aiwire.net/category/machine-learning/feed/', 'Machine Learning']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - Deep Learning', 'https://www.aiwire.net/category/deep-learning/feed/', 'Deep Learning']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - Natural Language Processing', 'https://www.aiwire.net/category/natural-language-processing/feed/', 'NLP']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - Computer Vision', 'https://www.aiwire.net/category/computer-vision/feed/', 'Computer Vision']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - Robotics', 'https://www.aiwire.net/category/robotics/feed/', 'Robotics']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - AI Ethics', 'https://www.aiwire.net/category/ai-ethics/feed/', 'AI Ethics']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - AI Research', 'https://www.aiwire.net/category/ai-research/feed/', 'AI Research']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - AI Applications', 'https://www.aiwire.net/category/ai-applications/feed/', 'AI Applications']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - AI Industry', 'https://www.aiwire.net/category/ai-industry/feed/', 'AI Industry']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - AI Tools', 'https://www.aiwire.net/category/ai-tools/feed/', 'AI Tools']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - AI Startups', 'https://www.aiwire.net/category/ai-startups/feed/', 'AI Startups']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - AI Companies', 'https://www.aiwire.net/category/ai-companies/feed/', 'AI Companies']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - AI Events', 'https://www.aiwire.net/category/ai-events/feed/', 'AI Events']
      // },
      // {
      //   sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
      //   args: ['AI Wire - AI Conferences', 'https://www.aiwire.net/category/ai-conferences/feed/', 'AI Conferences']
      // },
      
      // JPMorgan Chase RSS feeds (5 feeds)
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['JPMorgan Chase - Press Releases', 'https://jpmorganchaseco.gcs-web.com/rss/news-releases.xml', 'Financial News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['JPMorgan Chase - SEC Filings', 'https://jpmorganchaseco.gcs-web.com/rss/sec-filings.xml?items=15', 'Financial News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['JPMorgan Chase - SEC Filings - Form 10-K', 'https://jpmorganchaseco.gcs-web.com/rss/sec-filings.xml?sub_group=10-K&items=15', 'Financial News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['JPMorgan Chase - SEC Filings - Form 10-Q', 'https://jpmorganchaseco.gcs-web.com/rss/sec-filings.xml?items=15&sub_group=10-q', 'Financial News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['JPMorgan Chase - SEC Filings - Form 8-K', 'https://jpmorganchaseco.gcs-web.com/rss/sec-filings.xml?items=15&sub_group=8-K', 'Financial News']
      },
      {
        sql: `INSERT OR REPLACE INTO rss_feeds (name, url, category) VALUES (?, ?, ?)`,
        args: ['Coin Telegraph', 'https://cointelegraph.com/rss', 'cryptocurrency']
      }
    ], "write");

    // Verify the sources were inserted correctly
    const sourceCount = await client.execute('SELECT COUNT(*) as count FROM sources');
    const rssCount = await client.execute('SELECT COUNT(*) as count FROM rss_feeds');
    console.log(`Inserted ${sourceCount.rows[0].count} unique sources`);
    console.log(`Inserted ${rssCount.rows[0].count} RSS feeds`);

    // Create indexes for better performance using batch operation
    await client.batch([
      'CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at)',
      'CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)',
      'CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category)',
      'CREATE INDEX IF NOT EXISTS idx_embeddings_article_id ON embeddings(article_id)',
      'CREATE INDEX IF NOT EXISTS idx_patterns_frequency ON patterns(frequency DESC)',
      'CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url)',
      'CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC)'
    ], "write");

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Helper function for safe database operations
export async function executeQuery(sql: string, args: any[] = []): Promise<any> {
  try {
    const result = await client.execute({ sql, args });
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function for batch operations
export async function executeBatch(statements: (string | { sql: string; args: any[] })[]): Promise<void> {
  try {
    await client.batch(statements, "write");
  } catch (error) {
    console.error('Database batch error:', error);
    throw error;
  }
}

// Run initialization if this file is executed directly
if (process.argv[1] && (process.argv[1].endsWith('init.ts') || process.argv[1].includes('init'))) {
  console.log('Running database initialization...');
  initDatabase()
    .then(() => {
      console.log('Database initialization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    });
}

export { client, initDatabase }; 