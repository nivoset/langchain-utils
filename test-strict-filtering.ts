import { AgentService } from './src/services/agent.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testStrictFiltering() {
  console.log('🧪 Testing Strict Filtering - Improved Relevance Assessment\n');

  const agentService = new AgentService();
  
  try {
    await agentService.initialize();
    
    // Test with a specific question that should filter out irrelevant articles
    console.log('='.repeat(70));
    console.log('TEST: Strict Filtering for AI/LLM Question');
    console.log('='.repeat(70));
    
    const response = await agentService.askQuestion(
      'What are the latest developments in AI language models and ChatGPT?',
      8, // maxDocuments
      0.5 // lower similarityThreshold to get more articles to test filtering
    );
    
    console.log('\n📝 ANSWER:');
    console.log(response.answer);
    
    console.log('\n📚 SOURCES (Only Relevant Articles):');
    response.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.title} (${source.relevance}% relevant)`);
      console.log(`   Source: ${source.source}`);
      console.log(`   URL: ${source.url}`);
    });
    
    console.log(`\n📊 FILTERING STATISTICS:`);
    console.log(`  - Total articles retrieved: ${response.metadata.documentsRetrieved}`);
    console.log(`  - Relevant articles: ${response.metadata.relevantDocuments}`);
    console.log(`  - Filtered out: ${response.metadata.filteredDocuments}`);
    console.log(`  - Processing time: ${response.metadata.processingTime}ms`);
    
    // Test with company-specific question
    console.log('\n' + '='.repeat(70));
    console.log('TEST: Company-Specific Filtering');
    console.log('='.repeat(70));
    
    const companyResponse = await agentService.askAboutCompany(
      'OpenAI',
      'What are their latest developments and announcements?',
      6
    );
    
    console.log('\n📝 ANSWER:');
    console.log(companyResponse.answer);
    
    console.log('\n📚 SOURCES (Only Relevant Articles):');
    companyResponse.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.title} (${source.relevance}% relevant)`);
      console.log(`   Source: ${source.source}`);
      console.log(`   URL: ${source.url}`);
    });
    
    console.log(`\n📊 FILTERING STATISTICS:`);
    console.log(`  - Total articles retrieved: ${companyResponse.metadata.documentsRetrieved}`);
    console.log(`  - Relevant articles: ${companyResponse.metadata.relevantDocuments}`);
    console.log(`  - Filtered out: ${companyResponse.metadata.filteredDocuments}`);
    console.log(`  - Processing time: ${companyResponse.metadata.processingTime}ms`);
    
    // Get overall stats
    console.log('\n' + '='.repeat(70));
    console.log('DATABASE STATS');
    console.log('='.repeat(70));
    
    const stats = await agentService.getStats();
    console.log(`Total documents: ${stats.totalDocuments}`);
    console.log(`Recent documents (last 7 days): ${stats.recentDocuments}`);
    
  } catch (error) {
    console.error('❌ Error testing strict filtering:', error);
  }
}

testStrictFiltering().catch(console.error); 