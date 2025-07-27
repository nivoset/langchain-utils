# Tech News Analyzer

A comprehensive tech news fetching and analysis system that uses **libSQL** for data storage, **RSS feeds** for reliable news collection, **LangChain + Ollama** with **Nomic embeddings** for superior semantic analysis, and **Bluesky** for real-time social media news and events.

## 🚀 Features

- **RSS Feed Integration**: Automated fetching from major tech news RSS feeds
- **Bluesky Integration**: Real-time tech news and events from Bluesky social platform
- **Nomic Embeddings**: High-quality semantic embeddings using Nomic-embed-text via LangChain
- **Pattern Detection**: AI-powered pattern recognition using LangChain's PromptTemplate and runnables
- **Database Storage**: Efficient storage with libSQL (local or cloud with Turso)
- **CLI Interface**: Easy-to-use command-line tools for fetching and analysis
- **Scheduling**: Automated RSS fetching with cron jobs
- **Semantic Search**: Find similar articles using Nomic's superior text embeddings
- **Social Media Monitoring**: Track trending hashtags and tech influencers
- **🤖 AI Agent**: Intelligent Q&A system using LangChain and Ollama for comprehensive answers

## 🛠️ Tech Stack

- **TypeScript** for type-safe development
- **libSQL** for efficient data storage
- **Turso** for cloud database hosting 
- **RSS Parser** for reliable feed fetching
- **LangChain** for AI/LLM integration
- **Ollama** for local LLM inference
- **Nomic Embeddings** for superior semantic search
- **Node.js** for server-side execution
- **Commander.js** for CLI interface
- **Node-cron** for scheduling

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** - [Install from https://ollama.ai/](https://ollama.ai/)
3. **pnpm** (recommended) or npm

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set up Ollama

```bash
# Start Ollama server
ollama serve

# Install required models (in another terminal)
ollama pull nomic-embed-text  # For superior semantic embeddings
ollama pull mistral           # For text generation
# or
ollama pull deepseek-coder    # Alternative for coding tasks
```

### 3. Set up Bluesky (Optional)

For enhanced social media news and events:

```bash
# Get your Bluesky credentials from https://bsky.app
# Add to .env file:
BLUESKY_IDENTIFIER=your-username.bsky.social
BLUESKY_PASSWORD=your-app-password
```

**Note**: Bluesky integration works without authentication but has rate limits. Adding credentials provides better access.

### 4. Configure Environment

```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Database Configuration
LIBSQL_URL=file:./tech_news.db
LIBSQL_AUTH_TOKEN=

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### 5. Test Nomic Embeddings

```bash
node test-ollama.js
```

### 6. Initialize Database

```bash
pnpm run db:init
```

### 7. Start Fetching RSS Feeds

### 8. 🤖 Try the AI Agent

The AI Agent provides intelligent Q&A based on your news articles:

```bash
# Ask general questions
npm run agent:ask "What are the latest developments in artificial intelligence?"

# Ask about specific companies
npm run agent:company "Apple" "What are their latest product announcements?"

# Get sentiment summaries
npm run agent:sentiment positive

# Interactive chat mode
npm run agent:chat

# Test all agent functionality
npm run test:agent
```

**Features:**
- Intelligent responses based on your article database
- Company-specific queries
- Sentiment analysis summaries
- Interactive chat mode
- Source attribution with relevance scores

See [AGENT_README.md](./AGENT_README.md) for detailed documentation.

```bash
# Fetch all RSS feeds and save to database
pnpm run rss:fetch --save

# Schedule automatic RSS fetching
pnpm run rss:schedule --interval 30
```

### 8. Analyze Patterns

```bash
# Run pattern detection
pnpm run analyzer detect

# View detected patterns
pnpm run analyzer patterns
```

## 🚀 Usage

### RSS Commands

```bash
# Fetch all RSS feeds
pnpm run rss:fetch

# Fetch and save articles to database
pnpm run rss:fetch --save

# Fetch and add to vector store with duplicate detection
pnpm run rss:fetch --save --vectorstore --dedupe

# Fetch specific RSS feed
pnpm run rss:fetch --feed "TechCrunch"

# List all RSS feeds
pnpm run rss:list

# Add new RSS feed
pnpm run rss:add "My Feed" "https://example.com/feed.xml" --category "Tech"

# Remove RSS feed
pnpm run rss:remove 1

# Schedule RSS fetching every 30 minutes
pnpm run rss:schedule --interval 30

# Show RSS statistics (including vector store)
pnpm run rss:stats

# Sync RSS articles with vector store
pnpm run rss:sync-vectorstore --dedupe
```

### Bluesky Commands

```bash
# Search for tech news on Bluesky
pnpm run bluesky:search

# Search for tech events on Bluesky
pnpm run bluesky:events

# Get trending tech hashtags and influencers
pnpm run bluesky:trending

# Monitor Bluesky for new content
pnpm run bluesky:monitor

# Search with custom query and save to database
pnpm run bluesky:search --query "AI news" --limit 20 --save

# Search for events and save to database
pnpm run bluesky:events --query "conference" --save

# Monitor with custom interval
pnpm run bluesky:monitor --interval 15 --query "tech launch"
```

### Analysis Commands

```bash
# Run pattern detection on recent articles
pnpm run analyzer detect

# Show top patterns
pnpm run analyzer patterns

# Show trending topics
pnpm run analyzer trends

# Search articles by keyword
pnpm run analyzer search "artificial intelligence"

# Find similar articles using Nomic embeddings
pnpm run analyzer similar 123
```

### Vector Store Commands

```bash
# Initialize vector store
pnpm run vectorstore:init

# Add articles to vector store
pnpm run vectorstore:add

# Sync articles with vector store
pnpm run vectorstore:sync

# Search vector store
pnpm run vectorstore:search "AI investment"

# Search by company
pnpm run vectorstore:company "Microsoft"

# Search by sentiment
pnpm run vectorstore:sentiment "positive"

# Get vector store statistics
pnpm run vectorstore:stats

# Remove duplicates
pnpm run vectorstore:duplicates

# Full deduplication and sync
pnpm run vectorstore:dedupe
```

## 🗄️ Database Schema

### Articles Table
```sql
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  published_at DATETIME,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  category TEXT,
  tags TEXT,
  summary TEXT,
  embedding_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Embeddings Table
```sql
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  article_id INTEGER NOT NULL,
  embedding BLOB NOT NULL,
  model TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
);
```

### Patterns Table
```sql
CREATE TABLE patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  keywords TEXT,
  frequency INTEGER DEFAULT 0,
  first_seen DATETIME,
  last_seen DATETIME,
  confidence REAL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Configuration

### News Sources

The system comes pre-configured with major tech news sources:

- **TechCrunch**: `https://techcrunch.com`
- **The Verge**: `https://www.theverge.com`
- **Ars Technica**: `https://arstechnica.com`
- **Wired**: `https://www.wired.com`
- **MIT Technology Review**: `https://www.technologyreview.com`

#### AI Wire RSS Feeds

AI Wire provides comprehensive AI news coverage across 15 specialized categories:

**Core AI Topics:**
- AI News (general)
- Machine Learning
- Deep Learning
- Natural Language Processing (NLP)
- Computer Vision
- Robotics

**AI Ethics & Research:**
- AI Ethics
- AI Research

**Industry & Applications:**
- AI Applications
- AI Industry
- AI Tools
- AI Startups
- AI Companies

**Events & Conferences:**
- AI Events
- AI Conferences

**Automatic Setup:**
All RSS feeds are automatically added during database initialization:

```bash
# Initialize database with all feeds
pnpm run db:init
```

#### JPMorgan Chase RSS Feeds

JPMorgan Chase provides comprehensive financial news and SEC filing coverage:

**Financial News & SEC Filings:**
- Press Releases
- SEC Filings (general)
- SEC Filings - Form 10-K (Annual Reports)
- SEC Filings - Form 10-Q (Quarterly Reports)
- SEC Filings - Form 8-K (Current Reports)

**Automatic Setup:**
All RSS feeds are automatically added during database initialization:

```bash
# Initialize database with all feeds
pnpm run db:init
```

### Ollama Models

**Required Models:**
- **Nomic Embeddings**: `ollama pull nomic-embed-text` - Superior semantic embeddings (768 dimensions)
- **Mistral**: `ollama pull mistral` - Text generation and pattern analysis

**Optional Models:**
- **DeepSeek**: `ollama pull deepseek-coder` - Coding-focused tasks
- **Llama2**: `ollama pull llama2` - Alternative text generation
- **CodeLlama**: `ollama pull codellama` - Code analysis

## 🏗️ Architecture

```
src/
├── database/
│   └── init.ts              # Database initialization and schema
├── services/
│   ├── rss.service.ts       # RSS feed fetching and parsing
│   ├── bluesky.service.ts   # Bluesky social media integration
│   ├── embedding.service.ts # Nomic embeddings via LangChain
│   └── pattern.service.ts   # Pattern detection with LangChain
├── rss.ts                   # CLI for RSS operations
├── bluesky.ts               # CLI for Bluesky operations
└── analyzer.ts              # CLI for analysis operations
```

## 🔍 Pattern Detection

The system uses two approaches for pattern detection:

1. **Keyword-based Patterns**: Identifies frequent keywords and phrases
2. **Semantic Patterns**: Uses Nomic embeddings to find similar article clusters

Patterns are automatically named and described using LangChain's PromptTemplate and Ollama models.

## 🎯 Why Nomic Embeddings?

- **Superior Semantic Understanding**: Better at capturing meaning and context
- **768 Dimensions**: Optimal balance of performance and accuracy
- **Specialized for Text**: Designed specifically for text similarity tasks
- **Proven Performance**: Used by many production systems for semantic search

## 🎯 Why Bluesky Integration?

- **Real-time News**: Get breaking tech news as it happens on social media
- **Event Discovery**: Find tech conferences, meetups, and events before they're widely known
- **Trending Topics**: Track what's hot in the tech community
- **Influencer Tracking**: Follow key tech personalities and their announcements
- **Social Sentiment**: Understand community reactions to tech news
- **Early Access**: Discover news and events before traditional media coverage

## 🎯 Why RSS Instead of Web Scraping?

- **Reliability**: RSS feeds are designed for programmatic access and rarely break
- **Performance**: Much faster than web scraping - no browser overhead
- **Respectful**: Uses standard protocols designed for content syndication
- **Structured Data**: RSS provides clean, structured content with metadata
- **Rate Limiting**: Built-in support for respectful fetching intervals
- **No Anti-Bot Measures**: RSS feeds don't have anti-scraping protections
- **Standardized**: Consistent format across all RSS feeds
- **Metadata Rich**: Includes publication dates, authors, categories, and tags
- **Future-Proof**: RSS is a stable, well-established standard
- **Legal**: Using RSS feeds is explicitly allowed by publishers

## 🚀 Deployment

### Local Development
```bash
pnpm run dev
```

### Production
```bash
pnpm run build
pnpm start
```

### Cloud Database (Turso)
```bash
# Set environment variables
LIBSQL_URL=https://your-database-url.turso.io
LIBSQL_AUTH_TOKEN=your_turso_auth_token
```

## 🐛 Troubleshooting

### Ollama Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve

# Check available models
ollama list

# Install Nomic embeddings if missing
ollama pull nomic-embed-text
```

### Database Issues
```bash
# Reinitialize database
pnpm run db:init

# Check database file
ls -la tech_news.db
```

### Scraping Issues
```bash
# Test single source
pnpm run scrape --source TechCrunch

# Run in debug mode to see browser actions
pnpm run scrape --source TechCrunch --debug

# Check Playwright installation
npx playwright install chromium
```

### Debug Mode

The `--debug` flag runs the browser in non-headless mode, allowing you to:
- **See the browser window** and watch scraping in real-time
- **Debug selector issues** by inspecting the page
- **Verify page loading** and content extraction
- **Troubleshoot rate limiting** or blocking issues

**Usage:**
```bash
# Debug all sources
pnpm run scrape --debug

# Debug specific source
pnpm run scrape --source TechCrunch --debug

# Debug scheduled scraping
pnpm run scrape schedule --debug
```

**Debug Features:**
- **Slow motion**: 1-second delays between actions for visibility
- **Non-headless browser**: Full browser window with developer tools
- **Real-time logging**: See each step of the scraping process

## 📊 Performance

- **Scraping Speed**: ~10-20 articles per minute (respectful rate limiting)
- **Nomic Embeddings**: ~1-2 seconds per article (768 dimensions)
- **Pattern Detection**: Processes 1000+ articles in ~5-10 minutes
- **Semantic Search**: High accuracy similarity matching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Ollama** for local LLM capabilities
- **LangChain** for powerful AI/ML tooling
- **Nomic** for superior text embeddings
- **Playwright** for robust web scraping
- **libSQL** for efficient data storage
- **Turso** for cloud database hosting 

# Bluesky Configuration (for social media news and events)
BLUESKY_IDENTIFIER=your-username.bsky.social
BLUESKY_PASSWORD=your-app-password 