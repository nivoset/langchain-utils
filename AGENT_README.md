# 🤖 AI Agent - Intelligent Q&A System

The AI Agent provides intelligent responses to questions based on your news article database using LangChain and Ollama. It searches through your vector store to find relevant articles and generates comprehensive answers.

## 🚀 Features

- **Intelligent Q&A**: Ask questions and get AI-generated responses based on your news articles
- **Company-Specific Queries**: Get detailed information about specific companies
- **Sentiment Analysis**: Get summaries of news by sentiment (positive, negative, neutral)
- **Interactive Chat**: Have a conversation with the AI agent
- **Source Attribution**: All responses include source articles with relevance scores
- **Fast Processing**: Optimized for quick responses with configurable parameters

## 📋 Prerequisites

1. **Ollama Running**: Make sure Ollama is running with your preferred model
2. **Vector Store Populated**: Ensure your vector store has articles (run vector store commands first)
3. **Environment Variables**: Configure your `.env` file

### Environment Variables

```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Database Configuration
LIBSQL_URL=file:./tech_news.db
```

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## 🎯 Usage

### 1. Ask General Questions

```bash
# Basic question
npm run agent:ask "What are the latest developments in artificial intelligence?"

# With custom parameters
npm run agent:ask "What are the latest developments in artificial intelligence?" --documents 10 --threshold 0.8
```

**Parameters:**
- `--documents <number>`: Maximum documents to retrieve (default: 8)
- `--threshold <number>`: Similarity threshold 0.0-1.0 (default: 0.7)

### 2. Company-Specific Questions

```bash
# Ask about a specific company
npm run agent:company "Apple" "What are their latest product announcements?"

# With custom document limit
npm run agent:company "Tesla" "What are their recent developments?" --documents 6
```

### 3. Sentiment Summaries

```bash
# Get positive sentiment summary
npm run agent:sentiment positive

# Get negative sentiment summary
npm run agent:sentiment negative

# Get neutral sentiment summary
npm run agent:sentiment neutral

# With custom document limit
npm run agent:sentiment positive --documents 8
```

### 4. Interactive Chat Mode

```bash
# Start interactive chat
npm run agent:chat

# With custom parameters
npm run agent:chat --documents 10 --threshold 0.6
```

In chat mode, you can:
- Type questions and get immediate responses
- See source articles for each answer
- Type "quit" or "exit" to end the session

### 5. View Statistics

```bash
# Get vector store statistics
npm run agent:stats
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Test all agent functionality
npm run test:agent
```

This will test:
- General question answering
- Company-specific queries
- Sentiment summaries
- Vector store statistics

## 📊 Example Output

### General Question
```bash
$ npm run agent:ask "What are the latest developments in artificial intelligence?"

🤖 Initializing AI Agent...

🎯 Answer:
Based on the recent articles in the database, there have been several significant developments in artificial intelligence:

1. **OpenAI's GPT-4 Updates**: Recent updates to GPT-4 have improved reasoning capabilities and reduced hallucinations in complex tasks.

2. **Google's Gemini Pro**: Google has released Gemini Pro, a multimodal AI model that can process text, images, and code simultaneously.

3. **AI in Healthcare**: There's growing adoption of AI in medical diagnosis and drug discovery, with several breakthroughs in early disease detection.

4. **Regulatory Developments**: Governments worldwide are implementing new regulations for AI development and deployment.

📚 Sources:
1. OpenAI Releases GPT-4 Turbo with Improved Reasoning
   Source: TechCrunch
   Published: 2024-01-15
   Relevance: 95%
   URL: https://techcrunch.com/...

2. Google's Gemini Pro Shows Promise in Multimodal Tasks
   Source: TechCrunch
   Published: 2024-01-12
   Relevance: 92%
   URL: https://techcrunch.com/...

📊 Metadata:
   Query: "What are the latest developments in artificial intelligence?"
   Documents retrieved: 6
   Processing time: 2340ms
```

### Company Question
```bash
$ npm run agent:company "Apple" "What are their latest product announcements?"

🏢 Answer about Apple:
Based on recent articles about Apple, here are their latest developments:

1. **iPhone 15 Pro Max**: Apple recently announced the iPhone 15 Pro Max with titanium design and improved camera system.

2. **Vision Pro**: Apple's mixed reality headset, Vision Pro, is set to launch in early 2024 with advanced spatial computing capabilities.

3. **M3 Chip Family**: Apple has released the M3, M3 Pro, and M3 Max chips with significant performance improvements.

4. **iOS 17 Updates**: Latest iOS updates include improved privacy features and enhanced Siri capabilities.

📚 Sources:
1. Apple Unveils iPhone 15 Pro with Titanium Design
   Source: TechCrunch
   Published: 2024-01-10
   Relevance: 98%
   URL: https://techcrunch.com/...

2. Apple's Vision Pro Set for Early 2024 Launch
   Source: TechCrunch
   Published: 2024-01-08
   Relevance: 95%
   URL: https://techcrunch.com/...
```

## ⚙️ Configuration

### Model Configuration

The agent uses Ollama models. You can configure:

```bash
# In your .env file
OLLAMA_MODEL=llama3.2          # Main model for responses
OLLAMA_EMBEDDING_MODEL=nomic-embed-text  # Model for embeddings
OLLAMA_BASE_URL=http://localhost:11434   # Ollama server URL
```

### Performance Tuning

Adjust these parameters for better performance:

- **Documents**: More documents = more context but slower processing
- **Threshold**: Higher threshold = more relevant but fewer results
- **Model**: Different models have different speed/quality trade-offs

## 🔧 Advanced Usage

### Programmatic Usage

```typescript
import { AgentService } from './src/services/agent.service.js';

const agentService = new AgentService();
await agentService.initialize();

// Ask a question
const response = await agentService.askQuestion(
  "What are the latest developments in AI?",
  8,    // max documents
  0.7   // similarity threshold
);

console.log(response.answer);
console.log(response.sources);
```

### Custom Prompts

The agent uses carefully crafted prompts for different types of queries:

- **General Questions**: Balanced for comprehensive answers
- **Company Questions**: Focused on specific company information
- **Sentiment Summaries**: Optimized for trend analysis

## 🚨 Troubleshooting

### Common Issues

1. **"No relevant articles found"**
   - Ensure your vector store has articles: `npm run vectorstore:add`
   - Try lowering the similarity threshold
   - Rephrase your question
   - **NEW**: The agent now provides debug information when no results pass the threshold, showing:
     - Number of articles found
     - Median similarity score
     - Top similarity score
     - Suggested threshold adjustment

2. **"Ollama connection failed"**
   - Check if Ollama is running: `ollama list`
   - Verify OLLAMA_BASE_URL in your .env file
   - Ensure the model is downloaded: `ollama pull llama3.2`

3. **"Slow response times"**
   - Reduce the number of documents retrieved
   - Use a faster model
   - Increase similarity threshold

### Performance Tips

- Use specific questions for better results
- Start with lower document counts for faster responses
- Use company-specific queries for targeted information
- Monitor processing times to optimize parameters

### Debug Information

When no results pass the similarity threshold, the agent provides detailed debug information:

```bash
$ npm run agent:ask "What are the latest developments in quantum computing?" --threshold 0.8

I found 12 articles, but none met the similarity threshold of 0.8.

Debug Info:
- Articles found: 12
- Median similarity: 0.234
- Top similarity: 0.456
- Threshold: 0.8

Try lowering the threshold (e.g., --threshold 0.6) or rephrasing your question.
```

This helps you understand:
- How many articles were found
- The distribution of similarity scores
- Whether to adjust the threshold or rephrase the question

## 📈 Monitoring

The agent provides detailed metadata for monitoring:

- **Processing Time**: How long each query takes
- **Documents Retrieved**: Number of articles used
- **Relevance Scores**: How relevant each source is
- **Source Attribution**: Full article details

## 🔮 Future Enhancements

Planned features:
- Multi-language support
- Custom prompt templates
- Batch question processing
- Export capabilities
- Web interface
- Real-time news integration

## 📝 License

MIT License - see LICENSE file for details. 