import { AgentService } from './src/services/agent.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testQuestionEnhancement() {
  console.log('🧪 Testing Question Enhancement - Improved Search Accuracy\n');

  const agentService = new AgentService();
  
  try {
    await agentService.initialize();
    
    // Test with the original question that had poor results
    console.log('='.repeat(80));
    console.log('TEST: Question Enhancement for LLM Use Cases');
    console.log('='.repeat(80));
    
    const originalQuestion = "what new usecases for llm have shown up?";
    console.log(`\n🔍 Original Question: "${originalQuestion}"`);
    
    const response = await agentService.askQuestion(
      originalQuestion,
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
    console.log(`  - Query: ${response.metadata.query}`);
    
    // Test with another vague question
    console.log('\n' + '='.repeat(80));
    console.log('TEST: Question Enhancement for AI Developments');
    console.log('='.repeat(80));
    
    const vagueQuestion = "what's new in ai?";
    console.log(`\n🔍 Original Question: "${vagueQuestion}"`);
    
    const response2 = await agentService.askQuestion(
      vagueQuestion,
      6,
      0.5
    );
    
    console.log('\n📝 ANSWER:');
    console.log(response2.answer);
    
    console.log('\n📚 SOURCES (Only Relevant Articles):');
    response2.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.title} (${source.relevance}% relevant)`);
      console.log(`   Source: ${source.source}`);
      console.log(`   URL: ${source.url}`);
    });
    
    console.log(`\n📊 FILTERING STATISTICS:`);
    console.log(`  - Total articles retrieved: ${response2.metadata.documentsRetrieved}`);
    console.log(`  - Relevant articles: ${response2.metadata.relevantDocuments}`);
    console.log(`  - Filtered out: ${response2.metadata.filteredDocuments}`);
    console.log(`  - Processing time: ${response2.metadata.processingTime}ms`);
    console.log(`  - Query: ${response2.metadata.query}`);
    
    // Test with a more specific question to compare
    console.log('\n' + '='.repeat(80));
    console.log('TEST: Specific Question (for comparison)');
    console.log('='.repeat(80));
    
    const specificQuestion = "What are the latest developments in ChatGPT and OpenAI's language models?";
    console.log(`\n🔍 Specific Question: "${specificQuestion}"`);
    
    const response3 = await agentService.askQuestion(
      specificQuestion,
      6,
      0.5
    );
    
    console.log('\n📝 ANSWER:');
    console.log(response3.answer);
    
    console.log('\n📚 SOURCES (Only Relevant Articles):');
    response3.sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.title} (${source.relevance}% relevant)`);
      console.log(`   Source: ${source.source}`);
      console.log(`   URL: ${source.url}`);
    });
    
    console.log(`\n📊 FILTERING STATISTICS:`);
    console.log(`  - Total articles retrieved: ${response3.metadata.documentsRetrieved}`);
    console.log(`  - Relevant articles: ${response3.metadata.relevantDocuments}`);
    console.log(`  - Filtered out: ${response3.metadata.filteredDocuments}`);
    console.log(`  - Processing time: ${response3.metadata.processingTime}ms`);
    console.log(`  - Query: ${response3.metadata.query}`);
    
  } catch (error) {
    console.error('❌ Error testing question enhancement:', error);
  }
}

testQuestionEnhancement().catch(console.error); 