# 📡 RSS Loader Documentation

## Overview

The RSS Loader is a LangChain-based document loader that fetches RSS feeds and converts them to LangChain Document objects. It provides a clean, standardized way to load RSS content into your database and vector store.

## Features

- ✅ **LangChain Integration** - Extends `BaseDocumentLoader` for seamless integration
- ✅ **Database Storage** - Optional automatic saving to database
- ✅ **Multiple Feed Support** - Load single or multiple feeds
- ✅ **Category Filtering** - Load feeds by category
- ✅ **Content Processing** - Clean HTML, extract tags, normalize content
- ✅ **CLI Interface** - Easy command-line usage
- ✅ **Error Handling** - Robust error handling and logging
- ✅ **Rate Limiting** - Respectful delays between requests

## Architecture

```
src/loaders/
├── rss.loader.ts          # Core RSS loader class
├── rss-loader-cli.ts      # CLI interface
└── index.ts              # Exports
```

## Quick Start

### 1. Basic Usage

```typescript
import { RSSLoader, RSSFeedConfig } from './src/loaders/rss.loader.js';

// Configure RSS feed
const config: RSSFeedConfig = {
  name: 'TechCrunch RSS',
  url: 'https://techcrunch.com/feed/',
  category: 'Tech News',
  maxItems: 10
};

// Create loader
const loader = new RSSLoader(config, true); // Save to database
const documents = await loader.load();

console.log(`Loaded ${documents.length} documents`);
```

### 2. Load Multiple Feeds

```typescript
import { RSSLoader } from './src/loaders/rss.loader.js';

const configs = [
  {
    name: 'AI Wire - AI News',
    url: 'https://www.aiwire.net/feed/',
    category: 'AI News'
  },
  {
    name: 'JPMorgan Chase - Press Releases',
    url: 'https://jpmorganchaseco.gcs-web.com/rss/news-releases.xml',
    category: 'Financial News'
  }
];

const documents = await RSSLoader.loadMultiple(configs, true);
```

### 3. Load from Database

```typescript
import { RSSLoader } from './src/loaders/rss.loader.js';

// Load all AI News feeds from database
const documents = await RSSLoader.loadFromDatabase('AI News', true);

// Load all feeds from database
const allDocuments = await RSSLoader.loadFromDatabase(undefined, true);
```

## CLI Usage

### Load Single Feed

```bash
# Load single RSS feed
pnpm run rss-loader:load \
  --url "https://techcrunch.com/feed/" \
  --name "TechCrunch RSS" \
  --category "Tech News" \
  --max-items 20 \
  --save

# Test feed without saving
pnpm run rss-loader:load \
  --url "https://www.aiwire.net/feed/" \
  --name "AI Wire Test" \
  --no-save
```

### Load Multiple Feeds

```bash
# Load all feeds from database
pnpm run rss-loader:multiple --save

# Load feeds by category
pnpm run rss-loader:multiple --category "AI News" --save

# Load without saving to database
pnpm run rss-loader:multiple --no-save
```

### Load Specific Feeds

```bash
# Load specific feeds by name
pnpm run rss-loader:feeds "AI Wire - AI News" "JPMorgan Chase - Press Releases" --save
```

### List Available Feeds

```bash
# List all feeds
pnpm run rss-loader:list

# List feeds by category
pnpm run rss-loader:list --category "AI News"

# List all feeds (including inactive)
pnpm run rss-loader:list --no-active-only
```

### Test RSS Feed

```bash
# Test feed accessibility
pnpm run rss-loader:test \
  --url "https://techcrunch.com/feed/" \
  --name "TechCrunch Test"
```

## 🚀 **New Setup Process**

### **Complete Setup (One Command):**
```bash
# Initialize database with all 30 RSS feeds
pnpm run db:init
```

### **Verify Setup:**
```bash
# Check all feeds
node check-all-feeds.mjs

# List feeds via CLI
pnpm run rss:list

# Test feeds
pnpm run rss:fetch --feed "AI Wire"
pnpm run rss:fetch --feed "JPMorgan"
```

## 🔄 **Duplicate Detection**

The RSS loader includes intelligent duplicate detection to optimize processing:

### **Processing Order:**
- **Newest First**: Articles are processed in reverse chronological order
- **Stop at Duplicate**: Processing stops at the first duplicate found
- **Efficient**: Avoids unnecessary processing of old content

### **Duplicate Detection Methods:**
1. **URL Check**: Primary method (most reliable)
2. **GUID Check**: Secondary method (if available)
3. **Title + Source**: Fallback method

### **Configuration:**
```typescript
const config: RSSFeedConfig = {
  name: 'TechCrunch RSS',
  url: 'https://techcrunch.com/feed/',
  stopAtDuplicate: true // Default: true
};
```

### **CLI Options:**
```bash
# Enable duplicate detection (default)
pnpm run rss-loader:load --url "..." --name "..." --stop-at-duplicate

# Disable duplicate detection
pnpm run rss-loader:load --url "..." --name "..." --no-stop-at-duplicate
```

### **Benefits:**
- ⚡ **Faster Processing**: Stops at first duplicate
- 💾 **Reduced Database Load**: Avoids unnecessary queries
- 📊 **Better Performance**: Focuses on new content
- 🔄 **Incremental Updates**: Only processes new articles

## API Reference

### RSSFeedConfig

```typescript
interface RSSFeedConfig {
  name: string;           // Feed name
  url: string;           // RSS feed URL
  category?: string;     // Feed category
  maxItems?: number;     // Maximum items to load
  timeout?: number;      // Request timeout in ms
  stopAtDuplicate?: boolean; // Stop processing at first duplicate (default: true)
}
```

### RSSArticle

```typescript
interface RSSArticle {
  title: string;         // Article title
  content: string;       // Article content
  url: string;          // Article URL
  source: string;       // Source name
  publishedAt?: Date;   // Publication date
  author?: string;      // Author name
  category?: string;    // Article category
  tags?: string[];      // Article tags
  summary?: string;     // Article summary
  guid?: string;        // Article GUID
}
```

### RSSLoader Class

#### Constructor

```typescript
constructor(config: RSSFeedConfig, saveToDatabase: boolean = false)
```

#### Methods

```typescript
// Load RSS feed and return LangChain Documents
async load(): Promise<Document[]>

// Load multiple feeds
static async loadMultiple(
  configs: RSSFeedConfig[], 
  saveToDatabase: boolean = false
): Promise<Document[]>

// Load feeds from database
static async loadFromDatabase(
  category?: string, 
  saveToDatabase: boolean = false
): Promise<Document[]>
```

## Document Structure

Each RSS article is converted to a LangChain Document with the following structure:

```typescript
{
  pageContent: "Article Title\n\nArticle Content...",
  metadata: {
    source: "Feed Name",
    url: "https://article-url.com",
    title: "Article Title",
    category: "Feed Category",
    author: "Author Name",
    publishedAt: "2024-01-01T00:00:00.000Z",
    tags: "tag1, tag2, tag3",
    summary: "Article summary",
    guid: "article-guid",
    loader: "rss"
  }
}
```

## Database Integration

When `saveToDatabase` is `true`, articles are automatically saved to the `articles` table:

```sql
INSERT INTO articles (
  title, content, url, source, published_at, 
  category, tags, summary, guid, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
```

## Content Processing

### HTML Cleaning
- Removes HTML tags
- Normalizes whitespace
- Limits content length to 5000 characters

### Tag Extraction
- Extracts from RSS categories
- Extracts from tags field
- Extracts hashtags from content
- Removes duplicates
- Limits to 10 tags

### Content Fields
The loader tries multiple content fields in order:
1. `content`
2. `content:encoded`
3. `description`
4. `summary`
5. `contentSnippet`

## Error Handling

- **Network Errors**: Retries with exponential backoff
- **Invalid Content**: Skips articles with insufficient content
- **Database Errors**: Logs errors but continues processing
- **Rate Limiting**: Respectful delays between requests

## Examples

### Example 1: Load and Save to Database

```typescript
import { RSSLoader } from './src/loaders/rss.loader.js';

const loader = new RSSLoader({
  name: 'AI Wire - AI News',
  url: 'https://www.aiwire.net/feed/',
  category: 'AI News',
  maxItems: 20
}, true); // Save to database

const documents = await loader.load();
console.log(`Saved ${documents.length} articles to database`);
```

### Example 2: Load for Vector Store

```typescript
import { RSSLoader } from './src/loaders/rss.loader.js';
import { VectorStoreService } from './src/services/vectorstore.service.js';

// Load documents
const documents = await RSSLoader.loadFromDatabase('AI News', false);

// Add to vector store
const vectorStore = new VectorStoreService();
await vectorStore.initialize();

for (const doc of documents) {
  await vectorStore.addDocument(doc);
}
```

### Example 3: Custom Processing

```typescript
import { RSSLoader } from './src/loaders/rss.loader.js';

const documents = await RSSLoader.loadFromDatabase();

// Custom processing
const processedDocs = documents.map(doc => ({
  ...doc,
  pageContent: doc.pageContent.toUpperCase(), // Example transformation
  metadata: {
    ...doc.metadata,
    processed: true
  }
}));
```

## Integration with Existing System

The RSS Loader integrates seamlessly with your existing system:

1. **Database**: Uses existing `articles` table
2. **Vector Store**: Documents can be added to LibSQL vector store
3. **Analysis**: Documents can be processed by analysis services
4. **CLI**: Integrates with existing CLI structure

## Best Practices

1. **Use Categories**: Organize feeds by category for better management
2. **Set Limits**: Use `maxItems` to control load size
3. **Handle Errors**: Always wrap in try-catch blocks
4. **Rate Limiting**: Be respectful of RSS feed servers
5. **Content Validation**: Check content quality before processing
6. **Database Backup**: Backup database before bulk operations

## Troubleshooting

### Common Issues

1. **404 Errors**: Check RSS feed URLs
2. **Timeout Errors**: Increase timeout value
3. **Database Errors**: Check database connection
4. **Content Issues**: Verify RSS feed format

### Debug Mode

```bash
# Enable debug logging
DEBUG=rss-loader pnpm run rss-loader:test --url "https://example.com/feed"
```

## Performance

- **Single Feed**: ~1-2 seconds for 20 items
- **Multiple Feeds**: ~1 second delay between feeds
- **Database**: Batch operations for better performance
- **Memory**: Efficient streaming for large feeds

The RSS Loader provides a robust, scalable solution for loading RSS content into your LangChain-based system! 🚀 