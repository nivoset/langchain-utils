import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { VectorStoreService } from './vectorstore.service.js';
import dotenv from 'dotenv';

dotenv.config();

export interface IndividualAnalysisResult {
  isRelevant: boolean;
  analysis: string;
  document: Document;
  relevance: 'High' | 'Medium' | 'Low';
}

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
    relevantDocuments: number;
    filteredDocuments: number;
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
  private individualAnalysisPrompt: PromptTemplate;
  private synthesisPrompt: PromptTemplate;
  private questionEnhancementPrompt: PromptTemplate;

  constructor() {
    this.vectorStoreService = new VectorStoreService();
    
    this.model = new ChatOllama({
      model: process.env.OLLAMA_MODEL || 'deepseek-ai',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      temperature: 0.1,
    });

    // Prompt for individual article analysis with strict filtering
    this.individualAnalysisPrompt = PromptTemplate.fromTemplate(`
You are an expert analyst reviewing a news article to answer a specific question.

Article Information:
- Title: {title}
- Source: {source}
- Published: {publishedAt}
- URL: {url}

Article Content:
{content}

Question: {question}

Instructions:
1. **STRICT RELEVANCE CHECK**: Determine if this article contains SPECIFIC information that directly answers or significantly relates to the question
2. **HIGH RELEVANCE**: Article contains direct, specific information that answers the question
3. **MEDIUM RELEVANCE**: Article contains relevant information but not the primary focus
4. **NOT RELEVANT**: Article is only tangentially related or doesn't contain specific information to answer the question

**CRITICAL**: Be very strict about relevance. If the article doesn't contain specific, direct information related to the question, mark it as NOT_RELEVANT.

Examples:
- Question: "What are the latest developments in AI?"
- Article about "New AI breakthrough in healthcare" → HIGH RELEVANCE
- Article about "Tech company earnings" (mentions AI briefly) → NOT_RELEVANT
- Article about "Unicode emoji updates" → NOT_RELEVANT

Response Format:
If NOT RELEVANT:
NOT_RELEVANT: [Specific explanation of why this article doesn't contain information to answer the question]

If RELEVANT:
RELEVANCE: [High/Medium] - [Specific explanation of how this article directly relates to the question]
KEY INSIGHTS:
- [Insight 1 with specific details that directly answer the question]
- [Insight 2 with specific details that directly answer the question]
- [Insight 3 with specific details that directly answer the question]

QUOTES/STATS: [Any relevant quotes or statistics that directly relate to the question]
CONNECTION TO QUESTION: [Specific explanation of how this article answers or directly relates to the question]

Analysis: `);

    // Prompt for synthesizing all analyses
    this.synthesisPrompt = PromptTemplate.fromTemplate(`
You are an expert analyst synthesizing insights from multiple news articles to answer a question comprehensively.

Question: {question}

Individual Article Analyses:
{individualAnalyses}

Instructions:
1. Review all the individual article analyses above
2. Synthesize the best and most relevant insights
3. Create a comprehensive answer that addresses the question
4. Organize information logically and clearly
5. Cite specific sources when mentioning facts or insights
6. Highlight any conflicting information or different perspectives
7. Provide a well-structured, informative response

Synthesized Answer: `);

    // Prompt for enhancing questions to improve search accuracy
    this.questionEnhancementPrompt = PromptTemplate.fromTemplate(`
You are an expert at improving search queries to find more relevant and accurate information.

Original Question: {originalQuestion}

Your task is to enhance this question to:
1. Make it more specific and detailed
2. Include relevant keywords and terms
3. Clarify the intent and scope
4. Add context that will help find the most relevant articles
5. Focus on concrete, actionable information rather than vague concepts

Guidelines:
- If the question is about technology, include specific technology names, companies, or technical terms
- If asking about "new use cases", specify what kind of use cases (business, technical, consumer, etc.)
- If asking about developments, specify what type (product launches, research breakthroughs, market changes, etc.)
- Keep the enhanced question clear and focused
- Don't make it too long (max 2-3 sentences)

Enhanced Question: `);
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
      
      // Preprocess and enhance the question for better search
      const enhancedQuestion = await this.enhanceQuestion(question);
      console.log(`🔍 Enhanced question: "${enhancedQuestion}"`);
      console.log('🔍 Searching for relevant articles...');
      
      const searchResults = await this.vectorStoreService.searchSimilarArticles(enhancedQuestion, maxDocuments);
      
      if (searchResults.length === 0) {
        return {
          answer: "I couldn't find any relevant articles in the database to answer your question. Please try rephrasing your question or ask about a different topic.",
          sources: [],
          metadata: {
            query: question,
            documentsRetrieved: 0,
            processingTime: Date.now() - startTime,
            relevantDocuments: 0,
            filteredDocuments: 0
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
            relevantDocuments: 0,
            filteredDocuments: 0,
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

      // Stage 1: Analyze each article individually with filtering
      console.log('🔍 Stage 1: Analyzing each article individually...');
      const individualAnalyses: IndividualAnalysisResult[] = [];
      
      for (let i = 0; i < relevantResults.length; i++) {
        const result = relevantResults[i];
        const document = result.document;
        
        console.log(`  📄 Analyzing article ${i + 1}/${relevantResults.length}: "${document.metadata.title}"`);
        
        try {
          const analysis = await this.analyzeIndividualArticle(document, enhancedQuestion);
          individualAnalyses.push(analysis);
          
          if (analysis.isRelevant) {
            console.log(`    ✅ Relevant (${analysis.relevance})`);
          } else {
            console.log(`    ❌ Not relevant - filtered out`);
          }
        } catch (error) {
          console.warn(`  ⚠️ Failed to analyze article "${document.metadata.title}":`, error);
          // Continue with other articles
        }
      }

      // Filter to only relevant analyses
      const relevantAnalyses = individualAnalyses.filter(analysis => analysis.isRelevant);
      const filteredCount = individualAnalyses.length - relevantAnalyses.length;
      
      console.log(`\n📊 Filtering Results:`);
      console.log(`  - Total articles analyzed: ${individualAnalyses.length}`);
      console.log(`  - Relevant articles: ${relevantAnalyses.length}`);
      console.log(`  - Filtered out: ${filteredCount}`);

      if (relevantAnalyses.length === 0) {
        return {
          answer: "I analyzed the articles but found none that are directly relevant to your question. The articles may be tangentially related but don't contain specific information to answer your query.",
          sources: [],
          metadata: {
            query: question,
            documentsRetrieved: relevantResults.length,
            processingTime: Date.now() - startTime,
            relevantDocuments: 0,
            filteredDocuments: filteredCount
          }
        };
      }

      // Stage 2: Synthesize only relevant analyses into a comprehensive answer
      console.log('🧠 Stage 2: Synthesizing insights from relevant articles...');
      const synthesisChain = RunnableSequence.from([
        this.synthesisPrompt,
        this.model,
        new StringOutputParser()
      ]);

      const answer = await synthesisChain.invoke({
        question: enhancedQuestion,
        individualAnalyses: relevantAnalyses.map(analysis => analysis.analysis).join('\n\n---\n\n')
      });

      // Prepare sources for response (only relevant ones)
      const sources = relevantAnalyses.map(analysis => ({
        title: analysis.document.metadata.title as string,
        url: analysis.document.metadata.url as string,
        source: analysis.document.metadata.source as string,
        publishedAt: analysis.document.metadata.publishedAt as string,
        relevance: analysis.relevance === 'High' ? 95 : analysis.relevance === 'Medium' ? 75 : 25 // Convert relevance level to percentage
      }));

      const processingTime = Date.now() - startTime;

      console.log(`✅ Generated response in ${processingTime}ms`);

      return {
        answer: answer.trim(),
        sources: sources,
        metadata: {
          query: `${question} (enhanced: ${enhancedQuestion})`,
          documentsRetrieved: relevantResults.length,
          processingTime: processingTime,
          relevantDocuments: relevantAnalyses.length,
          filteredDocuments: filteredCount
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
            processingTime: Date.now() - startTime,
            relevantDocuments: 0,
            filteredDocuments: 0
          }
        };
      }

      console.log(`📚 Found ${searchResults.length} articles about ${companyName}`);

      // Stage 1: Analyze each article individually with filtering
      console.log('🔍 Stage 1: Analyzing each article individually...');
      const individualAnalyses: IndividualAnalysisResult[] = [];
      
      for (let i = 0; i < searchResults.length; i++) {
        const result = searchResults[i];
        const document = result.document;
        
        console.log(`  📄 Analyzing article ${i + 1}/${searchResults.length}: "${document.metadata.title}"`);
        
        try {
          const analysis = await this.analyzeIndividualArticle(document, question);
          individualAnalyses.push(analysis);
          
          if (analysis.isRelevant) {
            console.log(`    ✅ Relevant (${analysis.relevance})`);
          } else {
            console.log(`    ❌ Not relevant - filtered out`);
          }
        } catch (error) {
          console.warn(`  ⚠️ Failed to analyze article "${document.metadata.title}":`, error);
        }
      }

      // Filter to only relevant analyses
      const relevantAnalyses = individualAnalyses.filter(analysis => analysis.isRelevant);
      const filteredCount = individualAnalyses.length - relevantAnalyses.length;
      
      console.log(`\n📊 Filtering Results:`);
      console.log(`  - Total articles analyzed: ${individualAnalyses.length}`);
      console.log(`  - Relevant articles: ${relevantAnalyses.length}`);
      console.log(`  - Filtered out: ${filteredCount}`);

      if (relevantAnalyses.length === 0) {
        return {
          answer: `I analyzed the articles about ${companyName} but found none that are directly relevant to your question. The articles may be tangentially related but don't contain specific information to answer your query.`,
          sources: [],
          metadata: {
            query: `${question} (about ${companyName})`,
            documentsRetrieved: searchResults.length,
            processingTime: Date.now() - startTime,
            relevantDocuments: 0,
            filteredDocuments: filteredCount
          }
        };
      }

      // Stage 2: Synthesize with company-specific focus
      console.log('🧠 Stage 2: Synthesizing insights about the company...');
      const companySynthesisPrompt = PromptTemplate.fromTemplate(`
You are an expert analyst synthesizing insights about a specific company from multiple news articles.

Company: {companyName}
Question: {question}

Individual Article Analyses:
{individualAnalyses}

Instructions:
1. Focus specifically on {companyName} in your synthesis
2. Review all the individual article analyses above
3. Synthesize the best and most relevant insights about {companyName}
4. Create a comprehensive answer that addresses the question
5. Organize information logically and clearly
6. Cite specific sources when mentioning facts or insights
7. Highlight any recent developments, trends, or news about {companyName}
8. If there are multiple perspectives, mention them
9. If the context doesn't contain enough information about {companyName}, say so

Synthesized Answer: `);

      const synthesisChain = RunnableSequence.from([
        companySynthesisPrompt,
        this.model,
        new StringOutputParser()
      ]);

      const answer = await synthesisChain.invoke({
        companyName: companyName,
        question: question,
        individualAnalyses: relevantAnalyses.map(analysis => analysis.analysis).join('\n\n---\n\n')
      });

      const sources = relevantAnalyses.map(analysis => ({
        title: analysis.document.metadata.title as string,
        url: analysis.document.metadata.url as string,
        source: analysis.document.metadata.source as string,
        publishedAt: analysis.document.metadata.publishedAt as string,
        relevance: analysis.relevance === 'High' ? 95 : analysis.relevance === 'Medium' ? 75 : 25
      }));

      return {
        answer: answer.trim(),
        sources: sources,
        metadata: {
          query: `${question} (about ${companyName})`,
          documentsRetrieved: searchResults.length,
          processingTime: Date.now() - startTime,
          relevantDocuments: relevantAnalyses.length,
          filteredDocuments: filteredCount
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
            processingTime: Date.now() - startTime,
            relevantDocuments: 0,
            filteredDocuments: 0
          }
        };
      }

      console.log(`📚 Found ${searchResults.length} articles with ${sentiment} sentiment`);

      // Stage 1: Analyze each article individually with filtering
      console.log('🔍 Stage 1: Analyzing each article individually...');
      const individualAnalyses: IndividualAnalysisResult[] = [];
      
      for (let i = 0; i < searchResults.length; i++) {
        const result = searchResults[i];
        const document = result.document;
        
        console.log(`  📄 Analyzing article ${i + 1}/${searchResults.length}: "${document.metadata.title}"`);
        
        try {
          const analysis = await this.analyzeIndividualArticle(document, `What are the key ${sentiment} developments in this article?`);
          individualAnalyses.push(analysis);
          
          if (analysis.isRelevant) {
            console.log(`    ✅ Relevant (${analysis.relevance})`);
          } else {
            console.log(`    ❌ Not relevant - filtered out`);
          }
        } catch (error) {
          console.warn(`  ⚠️ Failed to analyze article "${document.metadata.title}":`, error);
        }
      }

      // Filter to only relevant analyses
      const relevantAnalyses = individualAnalyses.filter(analysis => analysis.isRelevant);
      const filteredCount = individualAnalyses.length - relevantAnalyses.length;
      
      console.log(`\n📊 Filtering Results:`);
      console.log(`  - Total articles analyzed: ${individualAnalyses.length}`);
      console.log(`  - Relevant articles: ${relevantAnalyses.length}`);
      console.log(`  - Filtered out: ${filteredCount}`);

      if (relevantAnalyses.length === 0) {
        return {
          answer: `I analyzed the articles with ${sentiment} sentiment but found none that are directly relevant to your query.`,
          sources: [],
          metadata: {
            query: `${sentiment} sentiment summary`,
            documentsRetrieved: searchResults.length,
            processingTime: Date.now() - startTime,
            relevantDocuments: 0,
            filteredDocuments: filteredCount
          }
        };
      }

      // Stage 2: Synthesize with sentiment focus
      console.log('🧠 Stage 2: Synthesizing sentiment insights...');
      const sentimentSynthesisPrompt = PromptTemplate.fromTemplate(`
You are an expert analyst synthesizing insights from {sentiment} sentiment news articles.

Sentiment Focus: {sentiment}

Individual Article Analyses:
{individualAnalyses}

Instructions:
1. Focus specifically on {sentiment} aspects of the news
2. Review all the individual article analyses above
3. Synthesize the best and most relevant {sentiment} insights
4. Create a comprehensive summary of recent {sentiment} developments
5. Identify common themes and trends across the articles
6. Highlight key developments and their implications
7. Organize information logically and clearly
8. Cite specific sources when mentioning facts or insights
9. Provide insights about what these {sentiment} developments mean

Synthesized Summary: `);

      const synthesisChain = RunnableSequence.from([
        sentimentSynthesisPrompt,
        this.model,
        new StringOutputParser()
      ]);

      const answer = await synthesisChain.invoke({
        sentiment: sentiment,
        individualAnalyses: relevantAnalyses.map(analysis => analysis.analysis).join('\n\n---\n\n')
      });

      const sources = relevantAnalyses.map(analysis => ({
        title: analysis.document.metadata.title as string,
        url: analysis.document.metadata.url as string,
        source: analysis.document.metadata.source as string,
        publishedAt: analysis.document.metadata.publishedAt as string,
        relevance: analysis.relevance === 'High' ? 95 : analysis.relevance === 'Medium' ? 75 : 25
      }));

      return {
        answer: answer.trim(),
        sources: sources,
        metadata: {
          query: `${sentiment} sentiment summary`,
          documentsRetrieved: searchResults.length,
          processingTime: Date.now() - startTime,
          relevantDocuments: relevantAnalyses.length,
          filteredDocuments: filteredCount
        }
      };

    } catch (error) {
      console.error('Error generating sentiment summary:', error);
      throw new Error(`Failed to generate sentiment summary: ${error}`);
    }
  }



  /**
   * Analyze a single article individually with filtering
   */
  private async analyzeIndividualArticle(document: Document, question: string): Promise<IndividualAnalysisResult> {
    const analysisChain = RunnableSequence.from([
      this.individualAnalysisPrompt,
      this.model,
      new StringOutputParser()
    ]);

    const analysis = await analysisChain.invoke({
      title: document.metadata.title || 'Unknown Title',
      source: document.metadata.source || 'Unknown Source',
      publishedAt: document.metadata.publishedAt || 'Unknown Date',
      url: document.metadata.url || 'No URL',
      content: document.pageContent,
      question: question
    });

    // Parse the analysis to determine relevance with stricter logic
    const isRelevant = !analysis.trim().startsWith('NOT_RELEVANT');
    let relevance: 'High' | 'Medium' | 'Low' = 'Low';
    
    if (isRelevant) {
      // Extract relevance level from the analysis
      const relevanceMatch = analysis.match(/RELEVANCE:\s*(High|Medium)/i);
      if (relevanceMatch) {
        const level = relevanceMatch[1] as 'High' | 'Medium';
        
        // Additional check: if the explanation suggests it's not very relevant, downgrade
        const explanation = analysis.match(/RELEVANCE:\s*(High|Medium)\s*-\s*(.+?)(?:\n|$)/i);
        if (explanation) {
          const explanationText = explanation[2].toLowerCase();
          // If explanation contains words suggesting low relevance, mark as Low
          if (explanationText.includes('tangential') || 
              explanationText.includes('brief mention') || 
              explanationText.includes('not the primary focus') ||
              explanationText.includes('only mentions')) {
            relevance = 'Low';
          } else {
            relevance = level;
          }
        } else {
          relevance = level;
        }
      }
    }

    return {
      isRelevant,
      analysis: `ARTICLE: ${document.metadata.title}\nSOURCE: ${document.metadata.source}\n${analysis}`,
      document,
      relevance
    };
  }

  /**
   * Enhance a question to improve search accuracy
   */
  private async enhanceQuestion(originalQuestion: string): Promise<string> {
    try {
      const enhancementChain = RunnableSequence.from([
        this.questionEnhancementPrompt,
        this.model,
        new StringOutputParser()
      ]);

      const enhancedQuestion = await enhancementChain.invoke({
        originalQuestion: originalQuestion
      });

      return enhancedQuestion.trim();
    } catch (error) {
      console.warn('⚠️ Failed to enhance question, using original:', error);
      return originalQuestion;
    }
  }

  /**
   * Get vector store statistics
   */
  async getStats() {
    return await this.vectorStoreService.getStats();
  }
} 