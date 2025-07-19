# LibSQL Tools

A collection of tools and utilities for working with LibSQL, including RSS feed loading and vector store functionality.

## Packages

This workspace contains the following packages:

### `@libsql-tools/core`
Core utilities and database initialization for LibSQL tools.

**Features:**
- Database initialization and schema setup
- Shared types and interfaces
- Database client configuration

### `@libsql-tools/rss-loader`
RSS feed loader and manager for LibSQL.

**Features:**
- LangChain-compatible RSS document loader
- RSS feed management (add, remove, list)
- Duplicate detection and prevention
- Database integration for feed storage
- Clean library interface

### `@libsql-tools/vectorstore`
LibSQL vector store implementation for embeddings and similarity search.

**Features:**
- Vector embeddings storage in LibSQL
- Similarity search functionality
- Integration with LangChain
- Support for multiple embedding models
- Clean library interface

### `@libsql-tools/cli`
Command-line tools for all LibSQL tools functionality.

**Features:**
- RSS feed management commands
- Vector store operations
- Unified CLI interface
- Easy-to-use command structure
- Available from root directory via `pnpm` scripts

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd libsql-tools

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Database Setup

The CLI tools will automatically create and use a `tech_news.db` file in the root directory. Make sure you have write permissions in the project root.

To initialize the database:
```bash
pnpm vectorstore:init
```

### Usage

#### CLI Tools

All CLI commands are available from the root directory using `pnpm` scripts. The commands will automatically use the `tech_news.db` database file in the root directory:

```bash
# RSS Loader Commands (from root directory)
pnpm rss load -u "https://techcrunch.com/feed/" -n "TechCrunch" --save
pnpm rss load-multiple --save
pnpm rss list
pnpm rss test -u "https://techcrunch.com/feed/"

# Vector Store Commands (from root directory)
pnpm vectorstore init
pnpm vectorstore add
pnpm vectorstore search "artificial intelligence"
pnpm vectorstore stats

# Convenience Commands (shorter syntax)
pnpm rss:load -u "https://techcrunch.com/feed/" -n "TechCrunch" --save
pnpm rss:list
pnpm rss:test -u "https://techcrunch.com/feed/"
pnpm vectorstore:init
pnpm vectorstore:add
pnpm vectorstore:search "artificial intelligence"
pnpm vectorstore:stats

# Main CLI
pnpm tools rss
pnpm tools vectorstore
```

**CLI Usage Patterns:**
- `pnpm rss <command>` - RSS loader commands
- `pnpm vectorstore <command>` - Vector store commands  
- `pnpm tools <category>` - Main CLI interface
- `pnpm rss:<command>` - Convenience shortcuts for RSS commands
- `pnpm vectorstore:<command>` - Convenience shortcuts for vector store commands

### Programmatic Usage

```typescript
import { RSSLoader } from '@libsql-tools/rss-loader';
import { LibSQLVectorStore } from '@libsql-tools/vectorstore';
import { initDatabase } from '@libsql-tools/core';

// Initialize database
await initDatabase();

// Load RSS feeds
const loader = new RSSLoader({
  name: 'TechCrunch',
  url: 'https://techcrunch.com/feed/',
  category: 'Tech'
}, true);

const documents = await loader.load();

// Use with vector store
const vectorStore = new LibSQLVectorStore();
await vectorStore.initialize();

// Add documents to vector store
await vectorStore.addDocuments(documents);

// Search for similar content
const results = await vectorStore.similaritySearch('AI news', 5);
```

## Development

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @libsql-tools/rss-loader build

# Watch mode for development
pnpm dev
```

### Available Scripts

```bash
# Build scripts
pnpm build              # Build all packages
pnpm build:watch        # Watch mode for all packages
pnpm build:prod         # Production build with minification
pnpm build:analyze      # Build with sourcemap analysis

# CLI scripts
pnpm rss                # RSS loader CLI
pnpm vectorstore        # Vector store CLI
pnpm tools              # Main CLI interface

# Convenience CLI shortcuts
pnpm rss:load           # Load RSS feed
pnpm rss:list           # List RSS feeds
pnpm rss:test           # Test RSS feed
pnpm vectorstore:init   # Initialize vector store
pnpm vectorstore:add    # Add articles to vector store
pnpm vectorstore:search # Search vector store
pnpm vectorstore:stats  # Get vector store stats

# Development scripts
pnpm dev                # Development mode
pnpm clean              # Clean all packages
pnpm test               # Run tests
pnpm lint               # Run linter
pnpm type-check         # Type checking
```

### Testing

```bash
# Run tests for all packages
pnpm test

# Run tests for specific package
pnpm --filter @libsql-tools/rss-loader test
```

### Publishing

```bash
# Publish all packages
pnpm publish

# Publish specific package
pnpm --filter @libsql-tools/rss-loader publish
```

## Configuration

Create a `.env` file in the root directory:

```env
LIBSQL_URL=file:./tech_news.db
LIBSQL_AUTH_TOKEN=your_auth_token_here
OLLAMA_BASE_URL=http://localhost:11434
```

**Note**: The database file `tech_news.db` should be in the root directory of the project.

## License

MIT 