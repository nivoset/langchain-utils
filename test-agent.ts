#!/usr/bin/env node

import { AgentService } from './src/services/agent.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAgent() {
  try {
    console.log('🤖 Testing AI Agent with LangChain and Ollama...\n');

    // Initialize agent service
    console.log('🚀 Initializing agent service...');
    const agentService = new AgentService();
    await agentService.initialize();
    console.log('✅ Agent service initialized\n');

    // Test 1: General question
    console.log('🧪 Test 1: General Question');
    console.log('Question: "What are the latest developments in artificial intelligence?"\n');
    
    const response1 = await agentService.askQuestion(
      "What are the latest developments in artificial intelligence?",
      6,
      0.6
    );

    console.log('🎯 Answer:');
    console.log(response1.answer);
    console.log(`\n📚 Sources: ${response1.sources.length} articles found`);
    console.log(`⏱️  Processing time: ${response1.metadata.processingTime}ms`);
    
    // Display debug information if available
    if (response1.metadata.debug) {
      console.log(`\n🔍 Debug Information:`);
      console.log(`   Median similarity: ${response1.metadata.debug.medianSimilarity.toFixed(3)}`);
      console.log(`   Top similarity: ${response1.metadata.debug.topSimilarity.toFixed(3)}`);
      console.log(`   Threshold: ${response1.metadata.debug.threshold}`);
      console.log(`   Total results: ${response1.metadata.debug.totalResults}`);
    }
    console.log('');

    // Test 2: Company-specific question
    console.log('🧪 Test 2: Company Question');
    console.log('Question: "What is happening with Apple?"\n');
    
    const response2 = await agentService.askAboutCompany(
      "Apple",
      "What is happening with Apple?",
      4
    );

    console.log('🏢 Answer:');
    console.log(response2.answer);
    console.log(`\n📚 Sources: ${response2.sources.length} articles found`);
    console.log(`⏱️  Processing time: ${response2.metadata.processingTime}ms\n`);

    // Test 3: Sentiment summary
    console.log('🧪 Test 3: Positive Sentiment Summary');
    console.log('Getting positive sentiment summary...\n');
    
    const response3 = await agentService.getSentimentSummary('positive', 4);

    console.log('📊 Positive Sentiment Summary:');
    console.log(response3.answer);
    console.log(`\n📚 Sources: ${response3.sources.length} articles found`);
    console.log(`⏱️  Processing time: ${response3.metadata.processingTime}ms\n`);

    // Test 4: Vector store stats
    console.log('🧪 Test 4: Vector Store Statistics');
    const stats = await agentService.getStats();
    console.log('📈 Vector Store Statistics:');
    console.log(`   Total documents: ${stats.totalDocuments}`);
    console.log(`   Recent documents (24h): ${stats.recentDocuments}\n`);

    console.log('🎉 All agent tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAgent(); 