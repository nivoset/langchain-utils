# LibSQL Vector Store Test

This test file (`test.ts`) demonstrates how to use the LibSQL vector store with the `tech_news.db` database.

## What the Test Does

The test performs the following operations:

**Enhanced Content Fetching**: The RSS loader now fetches full article content from the actual article URLs, not just RSS feed summaries. This provides much richer content for analysis and vector storage.

1. **Database Initialization**: Connects to and initializes the `tech_news.db` database
2. **Database Connection Test**: Verifies the connection and counts existing articles
3. **Vector Store Service**: Initializes the vector store service
4. **RSS Loader Test**: Tests loading RSS feeds from TechCrunch with full article content fetching
5. **Vector Store Operations**: 
   - Gets vector store statistics
   - Performs similarity search
   - Adds articles to the vector store
6. **Final Statistics**: Shows final database stats

## Running the Test

```bash
# Run the test
npm run test:vectorstore

# Or run directly with tsx
npx tsx test.ts
```

## Prerequisites

1. **Database**: The test will automatically create `tech_news.db` in the root directory
2. **Dependencies**: Make sure all dependencies are installed (`npm install`)
3. **Ollama**: For embeddings, make sure Ollama is running locally

## Expected Output

```
🚀 Starting LibSQL Vector Store Test...

📊 Initializing database...
✅ Database initialized successfully

🔍 Testing database connection...
✅ Database connected. Found 0 articles

🧠 Initializing vector store service...
✅ Vector store service initialized

📡 Testing RSS loader with full content...
✅ RSS loader test successful. Loaded 2 documents

📄 Document 1:
   Title: [Article Title]
   Content length: 5000+ characters
   URL: [Article URL]

📄 Document 2:
   Title: [Article Title]
   Content length: 5000+ characters
   URL: [Article URL]

🔍 Testing vector store operations...
📊 Vector Store Stats:
   Total documents: 0
   Recent documents (24h): 0

🔍 Testing similarity search...
✅ Similarity search successful. Found 0 results for "artificial intelligence"

➕ Testing adding articles to vector store...
✅ Articles added to vector store successfully

📊 Final Database Stats:
   Total documents: 2
   Recent documents (24h): 2

🎉 All tests completed successfully!
```

## Configuration

The test uses the following configuration:

- **Database**: `file:./tech_news.db` (local SQLite file)
- **RSS Feed**: TechCrunch RSS feed (2 articles max for testing, with full content fetching)
- **Search Query**: "artificial intelligence"
- **Vector Store**: Local embeddings via Ollama

## Troubleshooting

If the test fails:

1. **Check Ollama**: Make sure Ollama is running (`ollama serve`)
2. **Check Dependencies**: Run `npm install`
3. **Check Database**: Ensure write permissions in the root directory
4. **Check Network**: RSS feed requires internet connection

## Customization

You can modify the test by changing:

- RSS feed URL in the `rssConfig`
- Search query in `searchQuery`
- Number of articles to load in `maxItems`
- Number of articles to add to vector store 