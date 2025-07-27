import { PromptOptimizerService } from './src/services/prompt-optimizer.service.js';
import { AgentService } from './src/services/agent.service.js';

interface DriftTestResult {
  originalQuestion: string;
  optimizedQuestion: string;
  minifiedVariations: Array<{
    variation: string;
    similarity: number;
    tokenReduction: number;
    strategy: string;
  }>;
  results: {
    original: {
      answer: string;
      processingTime: number;
      documentsRetrieved: number;
      relevantDocuments: number;
      sources: Array<{ title: string; relevance: number }>;
    };
    optimized: {
      answer: string;
      processingTime: number;
      documentsRetrieved: number;
      relevantDocuments: number;
      sources: Array<{ title: string; relevance: number }>;
    };
    minified: Array<{
      variation: string;
      answer: string;
      processingTime: number;
      documentsRetrieved: number;
      relevantDocuments: number;
      sources: Array<{ title: string; relevance: number }>;
      similarity: number;
      tokenReduction: number;
    }>;
  };
}

async function testFullSystemDrift() {
  console.log('🧪 Testing Full System Drift Analysis\n');

  const optimizer = new PromptOptimizerService();
  const agentService = new AgentService();

  // Initialize services
  console.log('🔧 Initializing services...');
  await agentService.initialize();
  console.log('✅ Services initialized\n');

  // Test questions of different types
  const testQuestions = [
    {
      name: 'Verbose Technology Analysis Request',
      question: 'I would like you to please provide me with a very comprehensive and extremely detailed analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models, if you would be so kind as to do so. Additionally, I would appreciate if you could furnish a thorough examination of the multifaceted implications and ramifications of the recent developments in renewable energy technologies, particularly focusing on how these groundbreaking innovations might potentially revolutionize and fundamentally transform the entire landscape of energy production and distribution.'
    },
    {
      name: 'Complex Research Investigation Request',
      question: 'Conduct thorough research on the emerging trends in quantum computing technology, focusing on recent breakthroughs, potential applications, and the timeline for commercial adoption, while also considering the broader implications for cybersecurity and data protection methodologies. Please provide a comprehensive explanation of the fundamental principles of blockchain technology, describe its applications beyond cryptocurrency, and discuss the challenges and opportunities it presents for modern businesses in various industries. Furthermore, I would appreciate if you could analyze the current state of cloud computing infrastructure and its evolution towards edge computing and distributed systems.'
    },
    {
      name: 'Detailed Market Analysis Request',
      question: 'Please provide a comprehensive analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models. I would also like you to examine the recent developments in semiconductor manufacturing, particularly focusing on the challenges and opportunities presented by the global chip shortage and the race towards smaller nanometer processes. Additionally, please analyze the current state of the electric vehicle market and its intersection with renewable energy technologies.'
    },
    {
      name: 'Academic Style Technology Research Request',
      question: 'I would appreciate if you could furnish a thorough examination of the multifaceted implications and ramifications of the recent developments in renewable energy technologies, particularly focusing on how these groundbreaking innovations might potentially revolutionize and fundamentally transform the entire landscape of energy production and distribution. Furthermore, please conduct an in-depth analysis of the current state of artificial intelligence research, including recent breakthroughs in natural language processing, computer vision, and autonomous systems, while also considering the ethical implications and societal impact of these rapidly advancing technologies.'
    }
  ];

  const allResults: DriftTestResult[] = [];

  for (const testCase of testQuestions) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log('='.repeat(80));
    
    const originalQuestion = testCase.question;
    console.log(`\n🔍 Original Question: "${originalQuestion}"`);
    
    try {
      // Step 1: Optimize the question
      console.log('\n🔄 Step 1: Optimizing question...');
      const optimizationResult = await optimizer.optimizePrompt(originalQuestion, 0.3, 0.85, 10);
      const optimizedQuestion = optimizationResult.optimizedPrompt;
      
      console.log(`✅ Optimized: "${optimizedQuestion}"`);
      console.log(`   Token reduction: ${optimizationResult.tokenReductionPercentage.toFixed(1)}%`);
      console.log(`   Similarity: ${(optimizationResult.similarityScore * 100).toFixed(1)}%`);
      
      // Step 2: Generate minified drift variations
      console.log('\n🔄 Step 2: Generating minified drift variations...');
      const minifiedDrifts = await optimizer.generateMinifiedDriftPrompts(originalQuestion, 3, 0.8, 0.3);
      
      console.log(`✅ Generated ${minifiedDrifts.length} minified variations:`);
      minifiedDrifts.forEach((drift, index) => {
        const tokenReduction = ((originalQuestion.length - drift.variation.length) / originalQuestion.length) * 100;
        console.log(`   ${index + 1}. "${drift.variation}"`);
        console.log(`      Similarity: ${(drift.similarity * 100).toFixed(1)}%, Reduction: ${tokenReduction.toFixed(1)}%`);
      });
      
      // Step 3: Test original question with agent
      console.log('\n🤖 Step 3: Testing original question with agent...');
      const originalStartTime = Date.now();
      const originalResponse = await agentService.askQuestion(originalQuestion, 8, 0.7);
      const originalProcessingTime = Date.now() - originalStartTime;
      
      console.log(`✅ Original response (${originalProcessingTime}ms):`);
      console.log(`   Answer: ${originalResponse.answer.substring(0, 200)}...`);
      console.log(`   Documents retrieved: ${originalResponse.metadata.documentsRetrieved}`);
      console.log(`   Relevant documents: ${originalResponse.metadata.relevantDocuments}`);
      
      // Step 4: Test optimized question with agent
      console.log('\n🤖 Step 4: Testing optimized question with agent...');
      const optimizedStartTime = Date.now();
      const optimizedResponse = await agentService.askQuestion(optimizedQuestion, 8, 0.7);
      const optimizedProcessingTime = Date.now() - optimizedStartTime;
      
      console.log(`✅ Optimized response (${optimizedProcessingTime}ms):`);
      console.log(`   Answer: ${optimizedResponse.answer.substring(0, 200)}...`);
      console.log(`   Documents retrieved: ${optimizedResponse.metadata.documentsRetrieved}`);
      console.log(`   Relevant documents: ${optimizedResponse.metadata.relevantDocuments}`);
      
      // Step 5: Test minified drift variations with agent
      console.log('\n🤖 Step 5: Testing minified drift variations with agent...');
      const minifiedResults: Array<{
        variation: string;
        answer: string;
        processingTime: number;
        documentsRetrieved: number;
        relevantDocuments: number;
        sources: Array<{ title: string; relevance: number }>;
        similarity: number;
        tokenReduction: number;
      }> = [];
      
      for (let i = 0; i < minifiedDrifts.length; i++) {
        const drift = minifiedDrifts[i];
        console.log(`\n   Testing variation ${i + 1}: "${drift.variation}"`);
        
        const minifiedStartTime = Date.now();
        const minifiedResponse = await agentService.askQuestion(drift.variation, 8, 0.7);
        const minifiedProcessingTime = Date.now() - minifiedStartTime;
        
        const tokenReduction = ((originalQuestion.length - drift.variation.length) / originalQuestion.length) * 100;
        
        console.log(`   ✅ Response (${minifiedProcessingTime}ms):`);
        console.log(`      Answer: ${minifiedResponse.answer.substring(0, 150)}...`);
        console.log(`      Documents retrieved: ${minifiedResponse.metadata.documentsRetrieved}`);
        console.log(`      Relevant documents: ${minifiedResponse.metadata.relevantDocuments}`);
        
        minifiedResults.push({
          variation: drift.variation,
          answer: minifiedResponse.answer,
          processingTime: minifiedProcessingTime,
          documentsRetrieved: minifiedResponse.metadata.documentsRetrieved,
          relevantDocuments: minifiedResponse.metadata.relevantDocuments,
          sources: minifiedResponse.sources.map(s => ({ title: s.title, relevance: s.relevance })),
          similarity: drift.similarity,
          tokenReduction: tokenReduction
        });
      }
      
      // Store results for analysis
      allResults.push({
        originalQuestion,
        optimizedQuestion,
        minifiedVariations: minifiedDrifts.map(drift => ({
          variation: drift.variation,
          similarity: drift.similarity,
          tokenReduction: ((originalQuestion.length - drift.variation.length) / originalQuestion.length) * 100,
          strategy: drift.variationType
        })),
        results: {
          original: {
            answer: originalResponse.answer,
            processingTime: originalProcessingTime,
            documentsRetrieved: originalResponse.metadata.documentsRetrieved,
            relevantDocuments: originalResponse.metadata.relevantDocuments,
            sources: originalResponse.sources.map(s => ({ title: s.title, relevance: s.relevance }))
          },
          optimized: {
            answer: optimizedResponse.answer,
            processingTime: optimizedProcessingTime,
            documentsRetrieved: optimizedResponse.metadata.documentsRetrieved,
            relevantDocuments: optimizedResponse.metadata.relevantDocuments,
            sources: optimizedResponse.sources.map(s => ({ title: s.title, relevance: s.relevance }))
          },
          minified: minifiedResults
        }
      });
      
    } catch (error) {
      console.log(`❌ Error testing ${testCase.name}: ${error}`);
    }
  }

  // Comprehensive analysis
  console.log('\n\n📊 COMPREHENSIVE DRIFT ANALYSIS');
  console.log('='.repeat(80));
  
  allResults.forEach((result, index) => {
    console.log(`\n🔍 Test Case ${index + 1}: "${result.originalQuestion}"`);
    console.log('-'.repeat(60));
    
    // Compare original vs optimized
    const original = result.results.original;
    const optimized = result.results.optimized;
    
    console.log('\n📈 Original vs Optimized Comparison:');
    console.log(`   Processing Time: ${original.processingTime}ms → ${optimized.processingTime}ms (${((optimized.processingTime - original.processingTime) / original.processingTime * 100).toFixed(1)}%)`);
    console.log(`   Documents Retrieved: ${original.documentsRetrieved} → ${optimized.documentsRetrieved} (${optimized.documentsRetrieved - original.documentsRetrieved})`);
    console.log(`   Relevant Documents: ${original.relevantDocuments} → ${optimized.relevantDocuments} (${optimized.relevantDocuments - original.relevantDocuments})`);
    
    // Compare answer lengths
    const originalAnswerLength = original.answer.length;
    const optimizedAnswerLength = optimized.answer.length;
    console.log(`   Answer Length: ${originalAnswerLength} → ${optimizedAnswerLength} chars (${((optimizedAnswerLength - originalAnswerLength) / originalAnswerLength * 100).toFixed(1)}%)`);
    
    // Analyze minified variations
    console.log('\n🔄 Minified Drift Variations Analysis:');
    result.results.minified.forEach((minified, i) => {
      const variation = result.minifiedVariations[i];
      console.log(`\n   Variation ${i + 1} (${variation.strategy}):`);
      console.log(`   Question: "${minified.variation}"`);
      console.log(`   Similarity: ${(variation.similarity * 100).toFixed(1)}%, Token Reduction: ${variation.tokenReduction.toFixed(1)}%`);
      console.log(`   Processing Time: ${minified.processingTime}ms (${((minified.processingTime - original.processingTime) / original.processingTime * 100).toFixed(1)}%)`);
      console.log(`   Documents Retrieved: ${minified.documentsRetrieved} (${minified.documentsRetrieved - original.documentsRetrieved})`);
      console.log(`   Relevant Documents: ${minified.relevantDocuments} (${minified.relevantDocuments - original.relevantDocuments})`);
      console.log(`   Answer Length: ${minified.answer.length} chars (${((minified.answer.length - originalAnswerLength) / originalAnswerLength * 100).toFixed(1)}%)`);
    });
  });

  // Overall statistics
  console.log('\n\n📊 OVERALL STATISTICS');
  console.log('='.repeat(80));
  
  const totalTests = allResults.length;
  let totalOriginalTime = 0;
  let totalOptimizedTime = 0;
  let totalMinifiedTime = 0;
  let totalOriginalDocs = 0;
  let totalOptimizedDocs = 0;
  let totalMinifiedDocs = 0;
  let totalOriginalRelevant = 0;
  let totalOptimizedRelevant = 0;
  let totalMinifiedRelevant = 0;
  
  allResults.forEach(result => {
    totalOriginalTime += result.results.original.processingTime;
    totalOptimizedTime += result.results.optimized.processingTime;
    totalOriginalDocs += result.results.original.documentsRetrieved;
    totalOptimizedDocs += result.results.optimized.documentsRetrieved;
    totalOriginalRelevant += result.results.original.relevantDocuments;
    totalOptimizedRelevant += result.results.optimized.relevantDocuments;
    
    result.results.minified.forEach(minified => {
      totalMinifiedTime += minified.processingTime;
      totalMinifiedDocs += minified.documentsRetrieved;
      totalMinifiedRelevant += minified.relevantDocuments;
    });
  });
  
  const avgOriginalTime = totalOriginalTime / totalTests;
  const avgOptimizedTime = totalOptimizedTime / totalTests;
  const avgMinifiedTime = totalMinifiedTime / (totalTests * 3); // 3 variations per test
  
  console.log(`\n⏱️  Processing Time Analysis:`);
  console.log(`   Original Average: ${avgOriginalTime.toFixed(0)}ms`);
  console.log(`   Optimized Average: ${avgOptimizedTime.toFixed(0)}ms (${((avgOptimizedTime - avgOriginalTime) / avgOriginalTime * 100).toFixed(1)}%)`);
  console.log(`   Minified Average: ${avgMinifiedTime.toFixed(0)}ms (${((avgMinifiedTime - avgOriginalTime) / avgOriginalTime * 100).toFixed(1)}%)`);
  
  console.log(`\n📚 Document Retrieval Analysis:`);
  console.log(`   Original Average: ${(totalOriginalDocs / totalTests).toFixed(1)} documents`);
  console.log(`   Optimized Average: ${(totalOptimizedDocs / totalTests).toFixed(1)} documents (${totalOptimizedDocs - totalOriginalDocs})`);
  console.log(`   Minified Average: ${(totalMinifiedDocs / (totalTests * 3)).toFixed(1)} documents`);
  
  console.log(`\n🎯 Relevant Documents Analysis:`);
  console.log(`   Original Average: ${(totalOriginalRelevant / totalTests).toFixed(1)} relevant`);
  console.log(`   Optimized Average: ${(totalOptimizedRelevant / totalTests).toFixed(1)} relevant (${totalOptimizedRelevant - totalOriginalRelevant})`);
  console.log(`   Minified Average: ${(totalMinifiedRelevant / (totalTests * 3)).toFixed(1)} relevant`);
  
  // Effectiveness analysis
  console.log(`\n📊 Effectiveness Analysis:`);
  const optimizationEffectiveness = allResults.filter(r => 
    r.results.optimized.relevantDocuments >= r.results.original.relevantDocuments
  ).length / totalTests * 100;
  
  const minifiedEffectiveness = allResults.flatMap(r => r.results.minified).filter(m => 
    m.relevantDocuments >= allResults.find(r => r.results.minified.includes(m))?.results.original.relevantDocuments!
  ).length / (totalTests * 3) * 100;
  
  console.log(`   Optimization maintains/improves relevance: ${optimizationEffectiveness.toFixed(1)}% of cases`);
  console.log(`   Minified variations maintain/improve relevance: ${minifiedEffectiveness.toFixed(1)}% of cases`);
  
  // Cost analysis
  console.log(`\n💰 Cost Analysis (Token Usage):`);
  const avgTokenReduction = allResults.reduce((sum, r) => {
    const originalTokens = Math.ceil(r.originalQuestion.length / 4);
    const optimizedTokens = Math.ceil(r.optimizedQuestion.length / 4);
    return sum + ((originalTokens - optimizedTokens) / originalTokens);
  }, 0) / totalTests * 100;
  
  const avgMinifiedTokenReduction = allResults.flatMap(r => r.minifiedVariations).reduce((sum, v) => 
    sum + v.tokenReduction, 0) / (totalTests * 3);
  
  console.log(`   Average token reduction (optimized): ${avgTokenReduction.toFixed(1)}%`);
  console.log(`   Average token reduction (minified): ${avgMinifiedTokenReduction.toFixed(1)}%`);
  console.log(`   Potential cost savings: ${((avgTokenReduction + avgMinifiedTokenReduction) / 2).toFixed(1)}% average`);
  
  console.log('\n✅ Full system drift analysis complete!');
  
  // Save detailed results
  const fs = await import('fs/promises');
  const outputData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      avgOriginalTime,
      avgOptimizedTime,
      avgMinifiedTime,
      optimizationEffectiveness,
      minifiedEffectiveness,
      avgTokenReduction,
      avgMinifiedTokenReduction
    },
    detailedResults: allResults
  };
  
  await fs.writeFile('full-system-drift-results.json', JSON.stringify(outputData, null, 2));
  console.log('\n💾 Detailed results saved to: full-system-drift-results.json');
}

// Run the test
testFullSystemDrift().catch(console.error); 