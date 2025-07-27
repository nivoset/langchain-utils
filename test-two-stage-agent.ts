import { AgentService } from './src/services/agent.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testTwoStageAgent() {
  console.log('🧪 Testing Two-Stage Agent Processing\n');

  const agentService = new AgentService();
  
  try {
    await agentService.initialize();
    
    // Test 1: General question
    console.log('='.repeat(60));
    console.log('TEST 1: General Question');
    console.log('='.repeat(60));
    
    const response1 = await agentService.askQuestion(
      'What are the latest developments in AI technology?',
      4, // maxDocuments
      0.6 // similarityThreshold
    );
    
    console.log('\n📝 ANSWER:');
    console.log(response1.answer);
    console.log('\n📚 SOURCES:');
    response1.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.title} (${source.relevance}% relevant)`);
      console.log(`   Source: ${source.source}`);
      console.log(`   URL: ${source.url}`);
    });
    console.log(`\n⏱️ Processing time: ${response1.metadata.processingTime}ms`);
    console.log(`📊 Documents: ${response1.metadata.documentsRetrieved} retrieved, ${response1.metadata.relevantDocuments} relevant, ${response1.metadata.filteredDocuments} filtered`);
    
    // Test 2: Company-specific question
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Company-Specific Question');
    console.log('='.repeat(60));
    
    const response2 = await agentService.askAboutCompany(
      'OpenAI',
      'What are the latest developments and challenges?',
      3
    );
    
    console.log('\n📝 ANSWER:');
    console.log(response2.answer);
    console.log('\n📚 SOURCES:');
    response2.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.title} (${source.relevance}% relevant)`);
      console.log(`   Source: ${source.source}`);
      console.log(`   URL: ${source.url}`);
    });
    console.log(`\n⏱️ Processing time: ${response2.metadata.processingTime}ms`);
    console.log(`📊 Documents: ${response2.metadata.documentsRetrieved} retrieved, ${response2.metadata.relevantDocuments} relevant, ${response2.metadata.filteredDocuments} filtered`);
    
    // Test 3: Sentiment summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Positive Sentiment Summary');
    console.log('='.repeat(60));
    
    const response3 = await agentService.getSentimentSummary('positive', 3);
    
    console.log('\n📝 ANSWER:');
    console.log(response3.answer);
    console.log('\n📚 SOURCES:');
    response3.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.title} (${source.relevance}% relevant)`);
      console.log(`   Source: ${source.source}`);
      console.log(`   URL: ${source.url}`);
    });
    console.log(`\n⏱️ Processing time: ${response3.metadata.processingTime}ms`);
    console.log(`📊 Documents: ${response3.metadata.documentsRetrieved} retrieved, ${response3.metadata.relevantDocuments} relevant, ${response3.metadata.filteredDocuments} filtered`);
    
    // Get stats
    console.log('\n' + '='.repeat(60));
    console.log('DATABASE STATS');
    console.log('='.repeat(60));
    
    const stats = await agentService.getStats();
    console.log(`Total documents: ${stats.totalDocuments}`);
    console.log(`Recent documents (last 7 days): ${stats.recentDocuments}`);
    
  } catch (error) {
    console.error('❌ Error testing agent:', error);
  }
}

testTwoStageAgent().catch(console.error); 