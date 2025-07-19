import { Ollama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

export interface CompanyAnalysis {
  companies: string[];
  summary: string;
  companySentiment: 'positive' | 'negative' | 'neutral';
  employeeSentiment: 'positive' | 'negative' | 'neutral';
  companyReasoning: string;
  employeeReasoning: string;
  keyPoints: string[];
  riskLevel: 'low' | 'medium' | 'high';
  opportunities: string[];
  threats: string[];
}

export class AnalysisService {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'mistral'
    });
  }

  private getAnalysisPrompt(title: string, content: string): string {
    return `
You are a business intelligence analyst specializing in tech industry analysis. Analyze the following article and extract key business insights.

Article Title: ${title}
Article Content: ${content.substring(0, 3000)}

Please provide a comprehensive analysis in the following JSON format:

{
  "companies": ["list of company names mentioned"],
  "summary": "2-3 sentence summary of the key business implications",
  "companySentiment": "positive|negative|neutral",
  "employeeSentiment": "positive|negative|neutral", 
  "companyReasoning": "explanation for company sentiment",
  "employeeReasoning": "explanation for employee sentiment",
  "keyPoints": ["key business points", "market implications", "strategic insights"],
  "riskLevel": "low|medium|high",
  "opportunities": ["potential opportunities for companies mentioned"],
  "threats": ["potential threats or challenges"]
}

Focus on:
- Company performance, market position, and strategic moves
- Impact on employees (layoffs, hiring, workplace changes, compensation)
- Market trends and competitive dynamics
- Financial implications and business model changes
- Regulatory or legal implications

Be objective and evidence-based in your analysis.
`;
  }

  async analyzeArticle(title: string, content: string): Promise<CompanyAnalysis> {
    try {
      console.log(`🔍 Analyzing article: ${title.substring(0, 100)}...`);
      
      const prompt = this.getAnalysisPrompt(title, content);
      const result = await this.ollama.invoke(prompt);

      // Parse the JSON response
      const analysis = this.parseAnalysisResult(result);
      
      console.log(`✅ Analysis complete for: ${title.substring(0, 50)}...`);
      return analysis;

    } catch (error) {
      console.error('Error analyzing article:', error);
      
      // Return default analysis on error
      return {
        companies: [],
        summary: 'Analysis failed',
        companySentiment: 'neutral',
        employeeSentiment: 'neutral',
        companyReasoning: 'Analysis unavailable',
        employeeReasoning: 'Analysis unavailable',
        keyPoints: [],
        riskLevel: 'medium',
        opportunities: [],
        threats: []
      };
    }
  }

  private parseAnalysisResult(result: string): CompanyAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          companies: parsed.companies || [],
          summary: parsed.summary || '',
          companySentiment: parsed.companySentiment || 'neutral',
          employeeSentiment: parsed.employeeSentiment || 'neutral',
          companyReasoning: parsed.companyReasoning || '',
          employeeReasoning: parsed.employeeReasoning || '',
          keyPoints: parsed.keyPoints || [],
          riskLevel: parsed.riskLevel || 'medium',
          opportunities: parsed.opportunities || [],
          threats: parsed.threats || []
        };
      }
    } catch (error) {
      console.warn('Failed to parse analysis result as JSON:', error);
    }

    // Fallback parsing for non-JSON responses
    return this.parseTextAnalysis(result);
  }

  private parseTextAnalysis(text: string): CompanyAnalysis {
    // Extract companies (look for capitalized words that might be company names)
    const companies = this.extractCompanies(text);
    
    // Extract sentiment indicators
    const companySentiment = this.extractSentiment(text, ['company', 'business', 'market', 'revenue', 'profit']);
    const employeeSentiment = this.extractSentiment(text, ['employee', 'worker', 'staff', 'layoff', 'hiring', 'job']);
    
    // Generate summary from the text
    const summary = this.extractSummary(text);
    
    return {
      companies,
      summary,
      companySentiment,
      employeeSentiment,
      companyReasoning: this.extractReasoning(text, 'company'),
      employeeReasoning: this.extractReasoning(text, 'employee'),
      keyPoints: this.extractKeyPoints(text),
      riskLevel: this.extractRiskLevel(text),
      opportunities: this.extractOpportunities(text),
      threats: this.extractThreats(text)
    };
  }

  private extractCompanies(text: string): string[] {
    // Look for common company name patterns
    const companyPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|Corp|LLC|Ltd|Company|Technologies|Systems|Solutions)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:announced|reported|launched|acquired|merged)/gi,
      /(?:from|at|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];

    const companies = new Set<string>();
    
    companyPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const company = match.replace(/(?:Inc|Corp|LLC|Ltd|Company|Technologies|Systems|Solutions|announced|reported|launched|acquired|merged|from|at|by)/gi, '').trim();
          if (company.length > 2 && company.length < 50) {
            companies.add(company);
          }
        });
      }
    });

    return Array.from(companies).slice(0, 10); // Limit to 10 companies
  }

  private extractSentiment(text: string, keywords: string[]): 'positive' | 'negative' | 'neutral' {
    const lowerText = text.toLowerCase();
    
    const positiveWords = ['positive', 'growth', 'increase', 'profit', 'success', 'gain', 'improve', 'benefit', 'opportunity', 'strong', 'up', 'rise'];
    const negativeWords = ['negative', 'decline', 'decrease', 'loss', 'failure', 'drop', 'worse', 'problem', 'risk', 'weak', 'down', 'fall', 'layoff', 'cut'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    // Check for sentiment words in context of keywords
    keywords.forEach(keyword => {
      const keywordIndex = lowerText.indexOf(keyword);
      if (keywordIndex !== -1) {
        const context = lowerText.substring(Math.max(0, keywordIndex - 100), keywordIndex + 100);
        
        positiveWords.forEach(word => {
          if (context.includes(word)) positiveScore++;
        });
        
        negativeWords.forEach(word => {
          if (context.includes(word)) negativeScore++;
        });
      }
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private extractSummary(text: string): string {
    // Extract first few sentences that seem like a summary
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 2).join('. ').substring(0, 300) + '...';
  }

  private extractReasoning(text: string, type: 'company' | 'employee'): string {
    const keywords = type === 'company' 
      ? ['company', 'business', 'market', 'revenue', 'profit']
      : ['employee', 'worker', 'staff', 'job', 'career'];
    
    const sentences = text.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => 
      keywords.some(keyword => sentence.toLowerCase().includes(keyword))
    );
    
    return relevantSentences.slice(0, 2).join('. ').substring(0, 200) + '...';
  }

  private extractKeyPoints(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30);
    return sentences.slice(0, 5).map(s => s.trim().substring(0, 150));
  }

  private extractRiskLevel(text: string): 'low' | 'medium' | 'high' {
    const lowerText = text.toLowerCase();
    
    const highRiskWords = ['crisis', 'bankruptcy', 'collapse', 'disaster', 'emergency', 'failure'];
    const lowRiskWords = ['stable', 'secure', 'safe', 'steady', 'reliable'];
    
    const highRiskCount = highRiskWords.filter(word => lowerText.includes(word)).length;
    const lowRiskCount = lowRiskWords.filter(word => lowerText.includes(word)).length;
    
    if (highRiskCount > 2) return 'high';
    if (lowRiskCount > 2) return 'low';
    return 'medium';
  }

  private extractOpportunities(text: string): string[] {
    const sentences = text.split(/[.!?]+/);
    const opportunitySentences = sentences.filter(sentence => 
      sentence.toLowerCase().includes('opportunity') || 
      sentence.toLowerCase().includes('potential') ||
      sentence.toLowerCase().includes('growth')
    );
    
    return opportunitySentences.slice(0, 3).map(s => s.trim().substring(0, 100));
  }

  private extractThreats(text: string): string[] {
    const sentences = text.split(/[.!?]+/);
    const threatSentences = sentences.filter(sentence => 
      sentence.toLowerCase().includes('threat') || 
      sentence.toLowerCase().includes('risk') ||
      sentence.toLowerCase().includes('challenge') ||
      sentence.toLowerCase().includes('competition')
    );
    
    return threatSentences.slice(0, 3).map(s => s.trim().substring(0, 100));
  }

  async analyzeBatch(articles: Array<{title: string, content: string}>): Promise<CompanyAnalysis[]> {
    console.log(`🔍 Analyzing batch of ${articles.length} articles...`);
    
    const analyses: CompanyAnalysis[] = [];
    
    for (const article of articles) {
      try {
        const analysis = await this.analyzeArticle(article.title, article.content);
        analyses.push(analysis);
        
        // Add delay between analyses to avoid overwhelming the LLM
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('Error analyzing article:', error);
        analyses.push({
          companies: [],
          summary: 'Analysis failed',
          companySentiment: 'neutral',
          employeeSentiment: 'neutral',
          companyReasoning: 'Analysis unavailable',
          employeeReasoning: 'Analysis unavailable',
          keyPoints: [],
          riskLevel: 'medium',
          opportunities: [],
          threats: []
        });
      }
    }
    
    console.log(`✅ Completed analysis of ${analyses.length} articles`);
    return analyses;
  }
} 