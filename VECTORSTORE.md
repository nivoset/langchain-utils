# LibSQLVectorStore for LangChain

A custom vector store implementation for LangChain that uses LibSQL (Turso) as the backend storage for embeddings and metadata.

## 🚀 Features

- **Full LangChain Integration**: Implements the VectorStore interface for seamless integration
- **LibSQL Backend**: Uses LibSQL/Turso for reliable, scalable storage
- **Metadata Support**: Rich metadata storage with JSON serialization
- **Similarity Search**: Cosine similarity search with configurable filters
- **Document Management**: Add, delete, and retrieve documents with full CRUD operations
- **Flexible Schema**: Configurable table and column names
- **Type Safety**: Full TypeScript support with proper typing

## 📦 Installation

The LibSQLVectorStore is included in your project. Make sure you have the required dependencies:

```bash
pnpm install @libsql/client @langchain/core @langchain/ollama
```

## 🔧 Setup

### 1. Environment Configuration

Add to your `.env` file:

```env
# Database Configuration
LIBSQL_URL=file:../../tech_news.db
LIBSQL_AUTH_TOKEN=

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### 2. Initialize Vector Store

```bash
# Initialize the vector store
pnpm run vectorstore:init

# Add articles to vector store
pnpm run vectorstore:add

# Sync new articles
pnpm run vectorstore:sync
```

## 🎯 Usage

### Basic Usage

```typescript
import { LibSQLVectorStore } from './src/vectorstores/libsql-vectorstore.js';
import { Document } from '@langchain/core/documents';
import { OllamaEmbeddings } from '@langchain/ollama';
import { createClient } from '@libsql/client';

// Create client and embeddings
const client = createClient({
  url: 'file:../../tech_news.db'
});

const embeddings = new OllamaEmbeddings({
  model: 'nomic-embed-text',
  baseUrl: 'http://localhost:11434'
});

// Create vector store
const vectorStore = new LibSQLVectorStore(embeddings as any, {
  client,
  tableName: 'article_vectors',
  embeddingColumn: 'embedding',
  textColumn: 'content',
  metadataColumn: 'metadata',
  idColumn: 'article_id'
});

// Initialize
await vectorStore.initialize();

// Add documents
const documents = [
  new Document({
    pageContent: 'Your article content here',
    metadata: {
      title: 'Article Title',
      source: 'TechCrunch',
      companies: ['Microsoft'],
      companySentiment: 'positive'
    }
  })
];

await vectorStore.addDocuments(documents);

// Search for similar documents
const results = await vectorStore.similaritySearch('AI technology', 5);
```

### Using the VectorStoreService

```typescript
import { VectorStoreService } from './src/services/vectorstore.service.js';

const vectorStoreService = new VectorStoreService();
await vectorStoreService.initialize();

// Add articles from database
await vectorStoreService.addArticlesToVectorStore(100);

// Search for similar articles
const results = await vectorStoreService.searchSimilarArticles(
  'Microsoft AI investment',
  5
);

// Search by company
const microsoftArticles = await vectorStoreService.searchByCompany('Microsoft', 10);

// Search by sentiment
const positiveArticles = await vectorStoreService.searchBySentiment('positive', 5);
```

## 🛠️ CLI Commands

### Vector Store Management

```bash
# Initialize vector store
pnpm run vectorstore:init

# Add articles to vector store
pnpm run vectorstore:add --limit 100

# Sync new articles
pnpm run vectorstore:sync

# Get statistics
pnpm run vectorstore:stats

# Clean up old vectors
pnpm run vectorstore:cleanup --days 30

# Check for duplicates
pnpm run vectorstore:duplicates --check-only

# Remove duplicates
pnpm run vectorstore:duplicates

# Full deduplication and sync
pnpm run vectorstore:dedupe

### Search Commands

```bash
# Search for similar articles
pnpm run vectorstore:search "AI technology investment" --limit 5

# Search with company filter
pnpm run vectorstore:search "technology news" --company "Microsoft"

# Search with sentiment filter
pnpm run vectorstore:search "business news" --sentiment "positive"

# Search by company
pnpm run vectorstore:company "Microsoft" --limit 10

# Search by sentiment
pnpm run vectorstore:sentiment "positive" --limit 5
```

## 📊 Database Schema

The vector store creates a table with the following structure:

```sql
CREATE TABLE article_vectors (
  article_id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding TEXT NOT NULL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Metadata Structure

```typescript
interface ArticleMetadata {
  id: number;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category: string;
  companies: string[];
  companySentiment: 'positive' | 'negative' | 'neutral';
  employeeSentiment: 'positive' | 'negative' | 'neutral';
}
```

## 🔍 Search Features

### Similarity Search

```typescript
// Basic similarity search
const results = await vectorStore.similaritySearch('query', 5);

// Search with scores
const resultsWithScores = await vectorStore.similaritySearchWithScore('query', 5);

// Search with filters
const filteredResults = await vectorStore.similaritySearch('query', 5, {
  companies: 'Microsoft',
  companySentiment: 'positive'
});
```

### Filtering Options

- **Company Filter**: `{ companies: 'Microsoft' }`
- **Sentiment Filter**: `{ companySentiment: 'positive' }`
- **Source Filter**: `{ source: 'TechCrunch' }`
- **Category Filter**: `{ category: 'AI' }`

## 🧪 Testing

Run the test script to verify functionality:

```bash
npx tsx test-vectorstore.ts
```

This will test:
- Vector store initialization
- Document addition
- Similarity search
- Filtering
- Document management
- Deletion

## 🔧 Configuration Options

### LibSQLVectorStoreConfig

```typescript
interface LibSQLVectorStoreConfig {
  client: LibSQLClient;
  tableName?: string;           // Default: 'vector_store'
  embeddingColumn?: string;     // Default: 'embedding'
  textColumn?: string;          // Default: 'text'
  metadataColumn?: string;      // Default: 'metadata'
  idColumn?: string;            // Default: 'id'
}
```

### Custom Table Names

```typescript
const vectorStore = new LibSQLVectorStore(embeddings, {
  client,
  tableName: 'my_custom_vectors',
  embeddingColumn: 'vector_data',
  textColumn: 'document_text',
  metadataColumn: 'document_metadata',
  idColumn: 'document_id'
});
```

## 🚀 Integration with RSS System

The vector store integrates seamlessly with your RSS article system:

1. **Automatic Sync**: New articles are automatically added to the vector store
2. **Duplicate Detection**: Prevents duplicate articles from being added
3. **Rich Metadata**: Articles include company analysis, sentiment, and business intelligence
4. **Smart Search**: Search across all articles with semantic understanding
5. **Filtered Results**: Filter by company, sentiment, source, or category

### Duplicate Management

The vector store includes comprehensive duplicate detection and removal:

- **URL-based Detection**: Prevents articles with identical URLs
- **Title Similarity**: Detects articles with similar titles using Jaccard similarity
- **Content Deduplication**: Ensures unique content in the vector store
- **Automatic Cleanup**: Removes duplicates during sync operations

#### Duplicate Detection Strategies

1. **Exact URL Match**: Articles with identical URLs are considered duplicates
2. **Title Normalization**: Titles are normalized (lowercase, no punctuation) for comparison
3. **Similarity Threshold**: Titles with >80% similarity are considered duplicates
4. **Metadata Comparison**: Checks against existing articles in the vector store

### Workflow

```bash
# 1. Fetch RSS articles
pnpm run rss:fetch --save

# 2. Sync with vector store (with duplicate detection)
pnpm run vectorstore:sync

# 3. Check for duplicates
pnpm run vectorstore:duplicates --check-only

# 4. Remove duplicates if found
pnpm run vectorstore:duplicates

# 5. Search articles
pnpm run vectorstore:search "AI investment" --company "Microsoft"
```

### Continuous Growth Workflow

For ongoing article collection without duplicates:

```bash
# Daily workflow
pnpm run rss:fetch --save          # Fetch new articles
pnpm run vectorstore:dedupe        # Remove duplicates and sync
pnpm run vectorstore:stats         # Check status

# Weekly maintenance
pnpm run vectorstore:cleanup --days 30  # Remove old vectors
pnpm run vectorstore:duplicates         # Clean up any duplicates
```

## 🔍 Advanced Search Examples

### Find Positive Company News

```bash
pnpm run vectorstore:search "company growth" --sentiment "positive" --limit 10
```

### Find Articles About Specific Companies

```bash
pnpm run vectorstore:company "OpenAI" --limit 5
```

### Find Negative Employee Impact

```bash
pnpm run vectorstore:search "workforce changes" --sentiment "negative"
```

### Complex Queries

```bash
# Find AI-related positive news about Microsoft
pnpm run vectorstore:search "artificial intelligence" --company "Microsoft" --sentiment "positive"
```

## 📈 Performance

- **Embedding Storage**: JSON-serialized vectors for compatibility
- **Indexing**: Uses LibSQL's built-in indexing for fast queries
- **Batch Operations**: Efficient batch document addition
- **Memory Efficient**: Loads only necessary data for similarity calculations

## 🔒 Security

- **SQL Injection Protection**: Uses parameterized queries
- **Input Validation**: Validates all inputs before processing
- **Error Handling**: Graceful error handling with detailed logging

## 🐛 Troubleshooting

### Common Issues

1. **Ollama Not Running**
   ```bash
   # Start Ollama server
   ollama serve
   ```

2. **Database Connection Issues**
   ```bash
   # Check database file exists
   ls -la tech_news.db
   ```

3. **Embedding Model Not Found**
   ```bash
   # Pull the embedding model
   ollama pull nomic-embed-text
   ```

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=vectorstore:* pnpm run vectorstore:search "test query"
```

## 🤝 Contributing

The LibSQLVectorStore is designed to be extensible. Key areas for contribution:

- Additional similarity metrics
- Advanced filtering options
- Performance optimizations
- Additional metadata support

## 📄 License

This implementation is part of your tech news analyzer project and follows the same license terms. 