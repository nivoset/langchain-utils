import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { VectorStoreService } from './vectorstore.service.js';
import dotenv from 'dotenv';

dotenv.config();

export interface AgentResponse {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    source: string;
    publishedAt?: string;
    relevance: number;
  }>;
  metadata: {
    query: string;
    documentsRetrieved: number;
    processingTime: number;
    debug?: {
      medianSimilarity: number;
      topSimilarity: number;
      threshold: number;
      totalResults: number;
    };
  };
}

export class AgentService {
  private vectorStoreService: VectorStoreService;
  private model: ChatOllama;
  private promptTemplate: PromptTemplate;

  constructor() {
    this.vectorStoreService = new VectorStoreService();
    
    this.model = new ChatOllama({
      model: process.env.OLLAMA_MODEL || 'mistral',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      temperature: 0.1,
      // maxTokens: 2000
    });

    this.promptTemplate = PromptTemplate.fromTemplate(`
You are a helpful AI assistant that answers questions based on the provided context from news articles. 

Context information from relevant articles:
{context}

Question: {question}

Instructions:
1. Answer the question based ONLY on the provided context
3. Be specific and cite the sources when possible
4. Provide a comprehensive but concise answer
5. If there are multiple perspectives in the articles, mention them
6. Format your response in a clear, structured way

Answer: `);
  }

  /**
   * Initialize the agent service
   */
  async initialize(): Promise<void> {
    await this.vectorStoreService.initialize();
    console.log('✅ Agent service initialized');
  }

  /**
   * Ask a question and get an intelligent response based on vector store data
   */
  async askQuestion(
    question: string, 
    maxDocuments: number = 8,
    similarityThreshold: number = 0.7
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      console.log(`🤔 Processing question: "${question}"`);
      
      // Search for relevant documents
      console.log('🔍 Searching for relevant articles...');
      const searchResults = await this.vectorStoreService.searchSimilarArticles(question, maxDocuments);
      
      if (searchResults.length === 0) {
        return {
          answer: "I couldn't find any relevant articles in the database to answer your question. Please try rephrasing your question or ask about a different topic.",
          sources: [],
          metadata: {
            query: question,
            documentsRetrieved: 0,
            processingTime: Date.now() - startTime
          }
        };
      }

      // Filter results by similarity threshold
      const relevantResults = searchResults.filter(result => result.score >= similarityThreshold);
      
      if (relevantResults.length === 0) {
        // Calculate statistics for debugging
        const similarities = searchResults.map(result => result.score);
        const medianSimilarity = similarities.length > 0 
          ? similarities.sort((a, b) => a - b)[Math.floor(similarities.length / 2)]
          : 0;
        const topSimilarity = similarities.length > 0 ? Math.max(...similarities) : 0;
        
        return {
          answer: `I found ${searchResults.length} articles, but none met the similarity threshold of ${similarityThreshold}. 
          
Debug Info:
- Articles found: ${searchResults.length}
- Median similarity: ${medianSimilarity.toFixed(3)}
- Top similarity: ${topSimilarity.toFixed(3)}
- Threshold: ${similarityThreshold}

Try lowering the threshold (e.g., --threshold ${Math.max(0.1, similarityThreshold - 0.2).toFixed(1)}) or rephrasing your question.`,
          sources: [],
          metadata: {
            query: question,
            documentsRetrieved: searchResults.length,
            processingTime: Date.now() - startTime,
            debug: {
              medianSimilarity,
              topSimilarity,
              threshold: similarityThreshold,
              totalResults: searchResults.length
            }
          }
        };
      }

      console.log(`📚 Found ${relevantResults.length} relevant articles`);

      // Prepare context from documents
      const context = this.prepareContext(relevantResults);
      
      // Prepare sources for response
      const sources = relevantResults.map(result => ({
        title: result.document.metadata.title as string,
        url: result.document.metadata.url as string,
        source: result.document.metadata.source as string,
        publishedAt: result.document.metadata.publishedAt as string,
        relevance: Math.round((1 - result.score) * 100) // Convert similarity to relevance percentage
      }));

      // Generate response using LangChain
      console.log('🧠 Generating AI response...');
      const chain = RunnableSequence.from([
        this.promptTemplate,
        this.model,
        new StringOutputParser()
      ]);

      const answer = await chain.invoke({
        context: context,
        question: question
      });

      const processingTime = Date.now() - startTime;

      console.log(`✅ Generated response in ${processingTime}ms`);

      return {
        answer: answer.trim(),
        sources: sources,
        metadata: {
          query: question,
          documentsRetrieved: relevantResults.length,
          processingTime: processingTime
        }
      };

    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error(`Failed to generate response: ${error}`);
    }
  }

  /**
   * Ask a question about a specific company
   */
  async askAboutCompany(
    companyName: string,
    question: string,
    maxDocuments: number = 6
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      console.log(`🏢 Processing company question: "${question}" about ${companyName}`);
      
      // Search for company-specific documents
      const searchResults = await this.vectorStoreService.searchByCompany(companyName, maxDocuments);
      
      if (searchResults.length === 0) {
        return {
          answer: `I couldn't find any articles about ${companyName} in the database.`,
          sources: [],
          metadata: {
            query: `${question} (about ${companyName})`,
            documentsRetrieved: 0,
            processingTime: Date.now() - startTime
          }
        };
      }

      const context = this.prepareContext(searchResults);
      
      const sources = searchResults.map(result => ({
        title: result.document.metadata.title as string,
        url: result.document.metadata.url as string,
        source: result.document.metadata.source as string,
        publishedAt: result.document.metadata.publishedAt as string,
        relevance: Math.round((1 - result.score) * 100)
      }));

      // Use a company-specific prompt
      const companyPrompt = PromptTemplate.fromTemplate(`
You are a helpful AI assistant that answers questions about specific companies based on news articles.

Context information about {companyName} from relevant articles:
{context}

Question: {question}

Instructions:
1. Focus specifically on {companyName} in your answer
2. Answer based ONLY on the provided context
3. If the context doesn't contain enough information about {companyName}, say so
4. Be specific and cite the sources when possible
5. Mention any recent developments, trends, or news about {companyName}
6. If there are multiple perspectives, mention them

Answer: `);

      const chain = RunnableSequence.from([
        companyPrompt,
        this.model,
        new StringOutputParser()
      ]);

      const answer = await chain.invoke({
        companyName: companyName,
        context: context,
        question: question
      });

      return {
        answer: answer.trim(),
        sources: sources,
        metadata: {
          query: `${question} (about ${companyName})`,
          documentsRetrieved: searchResults.length,
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Error generating company response:', error);
      throw new Error(`Failed to generate company response: ${error}`);
    }
  }

  /**
   * Get a summary of recent news by sentiment
   */
  async getSentimentSummary(
    sentiment: 'positive' | 'negative' | 'neutral' = 'positive',
    maxDocuments: number = 6
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      console.log(`📊 Generating ${sentiment} sentiment summary...`);
      
      const searchResults = await this.vectorStoreService.searchBySentiment(sentiment, maxDocuments);
      
      if (searchResults.length === 0) {
        return {
          answer: `I couldn't find any articles with ${sentiment} sentiment in the database.`,
          sources: [],
          metadata: {
            query: `${sentiment} sentiment summary`,
            documentsRetrieved: 0,
            processingTime: Date.now() - startTime
          }
        };
      }

      const context = this.prepareContext(searchResults);
      
      const sources = searchResults.map(result => ({
        title: result.document.metadata.title as string,
        url: result.document.metadata.url as string,
        source: result.document.metadata.source as string,
        publishedAt: result.document.metadata.publishedAt as string,
        relevance: Math.round((1 - result.score) * 100)
      }));

      const sentimentPrompt = PromptTemplate.fromTemplate(`
You are a helpful AI assistant that provides summaries of news articles based on sentiment.

Context information from {sentiment} sentiment articles:
{context}

Please provide a comprehensive summary of the recent {sentiment} news and developments. 

Instructions:
1. Focus on the {sentiment} aspects of the news
2. Identify common themes and trends
3. Highlight key developments and their implications
4. Organize the information in a logical way
5. Be specific and cite sources when possible
6. Provide insights about what these developments mean

Summary: `);

      const chain = RunnableSequence.from([
        sentimentPrompt,
        this.model,
        new StringOutputParser()
      ]);

      const answer = await chain.invoke({
        sentiment: sentiment,
        context: context
      });

      return {
        answer: answer.trim(),
        sources: sources,
        metadata: {
          query: `${sentiment} sentiment summary`,
          documentsRetrieved: searchResults.length,
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('Error generating sentiment summary:', error);
      throw new Error(`Failed to generate sentiment summary: ${error}`);
    }
  }

  /**
   * Prepare context string from search results
   */
  private prepareContext(searchResults: Array<{ document: Document; score: number }>): string {
    return searchResults.map((result, index) => {
      const doc = result.document;
      const relevance = Math.round((1 - result.score) * 100);
      
      return `Article ${index + 1} (Relevance: ${relevance}%):
Title: ${doc.metadata.title}
Source: ${doc.metadata.source}
Published: ${doc.metadata.publishedAt || 'Unknown'}
URL: ${doc.metadata.url}
Content: ${doc.pageContent.substring(0, 1000)}${doc.pageContent.length > 1000 ? '...' : ''}

---`;
    }).join('\n\n');
  }

  /**
   * Get vector store statistics
   */
  async getStats() {
    return await this.vectorStoreService.getStats();
  }
} 