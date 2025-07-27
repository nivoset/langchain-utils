# 🤖 AI Agent - Two-Stage Intelligent Q&A System

The AI Agent provides intelligent responses to questions based on your news article database using LangChain and Ollama. It uses a sophisticated **two-stage processing approach** for comprehensive analysis.

## 🚀 Features

- **Two-Stage Processing**: Each article is analyzed individually, then insights are synthesized
- **Intelligent Q&A**: Ask questions and get AI-generated responses based on your news articles
- **Company-Specific Queries**: Get detailed information about specific companies
- **Sentiment Analysis**: Get summaries of news by sentiment (positive, negative, neutral)
- **Interactive Chat**: Have a conversation with the AI agent
- **Source Attribution**: All responses include source articles with relevance scores
- **Comprehensive Analysis**: Deep insights from individual article analysis

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

## 🔄 Two-Stage Processing

The AI Agent uses a sophisticated two-stage approach for comprehensive analysis:

### **Stage 1: Individual Article Analysis & Filtering**
- Each relevant article is analyzed in isolation
- The AI determines if the article is **RELEVANT** to your question
- **Filters out irrelevant articles** that don't contain specific information to answer your query
- For relevant articles, extracts key insights, facts, and connections
- Identifies relevance level (High/Medium) for each relevant article
- Captures specific quotes, statistics, and details
- Notes how each article contributes to answering the question

### **Stage 2: Synthesis & Integration**
- Only **relevant analyses** are passed to the synthesis stage
- The AI synthesizes the best and most relevant insights from filtered articles
- Creates a comprehensive, well-structured answer
- Highlights conflicting information or different perspectives
- Provides source attribution for all facts and insights

### **Benefits:**
- **Deeper Analysis**: Each article gets individual attention
- **Smart Filtering**: Automatically filters out irrelevant content
- **Better Synthesis**: Comprehensive integration of only relevant insights
- **Source Transparency**: Clear attribution of information
- **Conflict Resolution**: Identifies and explains different perspectives
- **Quality Control**: Individual analysis ensures no important details are missed
- **Efficiency**: Only processes relevant articles in the synthesis stage

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

# Test the new two-stage processing
npm run test:two-stage

# Test the improved strict filtering
npm run test:filtering

# Test the question enhancement
npm run test:enhancement
```

This will test:
- General question answering
- Company-specific queries
- Sentiment summaries
- Vector store statistics
- Two-stage processing workflow

## 🔍 Smart Filtering & Question Enhancement

The agent now includes intelligent filtering and question enhancement to improve search accuracy:

### **How Question Enhancement Works:**
1. **Question Analysis**: The original question is analyzed and enhanced
2. **Keyword Addition**: Relevant keywords and terms are added
3. **Specificity Improvement**: Vague questions are made more specific
4. **Context Addition**: Additional context helps find more relevant articles

### **How Filtering Works:**
1. **Individual Analysis**: Each article is analyzed to determine relevance
2. **Relevance Assessment**: Articles are marked as "Relevant" or "NOT_RELEVANT"
3. **Filtering**: Only relevant articles proceed to the synthesis stage
4. **Transparency**: You can see how many articles were filtered out

### **Filtering Criteria:**
- Articles must contain **specific information** that directly answers your question
- **Strict relevance assessment** - tangential mentions are filtered out
- Only articles with **direct, specific relevance** are included
- **Relevance levels**: 
  - High (95%): Article contains direct, specific information that answers the question
  - Medium (75%): Article contains relevant information but not the primary focus
  - Low (25%): Article is only tangentially related (filtered out)
- **Examples of what gets filtered out**:
  - Articles that only briefly mention the topic
  - Articles about unrelated subjects (e.g., Unicode emoji for AI question)
  - Articles with tangential connections

### **Example Question Enhancement:**
```
🤔 Processing question: "what new usecases for llm have shown up?"
🔍 Enhanced question: "What are the latest practical applications and business use cases for Large Language Models (LLMs) in software development, content creation, and enterprise solutions?"
```

### **Example Filtering Output:**
```
🔍 Stage 1: Analyzing each article individually...
  📄 Analyzing article 1/6: "New AI Breakthrough in Healthcare"
    ✅ Relevant (High)
  📄 Analyzing article 2/6: "Stock Market Update"
    ❌ Not relevant - filtered out
  📄 Analyzing article 3/6: "Tech Company Earnings"
    ❌ Not relevant - filtered out

📊 Filtering Results:
  - Total articles analyzed: 6
  - Relevant articles: 3
  - Filtered out: 3
```

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