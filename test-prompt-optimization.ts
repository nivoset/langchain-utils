import { PromptOptimizerService } from './src/services/prompt-optimizer.service.js';

async function testPromptOptimization() {
  console.log('🧪 Testing Prompt Optimization System\n');

  const optimizer = new PromptOptimizerService();

  // Test prompts of varying complexity
  const testPrompts = [
    {
      name: 'Simple Prompt',
      prompt: 'What is the weather like today?'
    },
    {
      name: 'Medium Complexity',
      prompt: 'Please provide a comprehensive analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models.'
    },
    {
      name: 'High Complexity',
      prompt: 'I would like you to conduct an extremely thorough and comprehensive examination of the multifaceted implications and ramifications of the recent developments in quantum computing technology, particularly focusing on how these groundbreaking innovations might potentially revolutionize and fundamentally transform the entire landscape of cybersecurity, cryptography, and data protection methodologies, while also considering the broader societal, economic, and ethical implications that could arise from such transformative technological advancements.'
    },
    {
      name: 'Redundant Text',
      prompt: 'The company is currently in the process of implementing and executing a comprehensive strategic plan that involves the utilization of various different methodologies and approaches in order to achieve the ultimate goal of maximizing efficiency and productivity while simultaneously minimizing costs and expenses.'
    }
  ];

  for (const testCase of testPrompts) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log('='.repeat(50));
    
    try {
      // Analyze the prompt first
      console.log('\n🔍 Analysis:');
      const analysis = await optimizer.analyzePrompt(testCase.prompt);
      console.log(`   Word count: ${analysis.wordCount}`);
      console.log(`   Estimated tokens: ${analysis.estimatedTokens}`);
      console.log(`   Readability score: ${analysis.readabilityScore}/100`);
      console.log(`   Average sentence length: ${analysis.complexityMetrics.avgSentenceLength} words`);
      
      // Optimize with different strategies
      console.log('\n🔧 Optimization Results:');
      
      const strategies = [
        { name: 'Conservative', reduction: 0.1, similarity: 0.95 },
        { name: 'Moderate', reduction: 0.3, similarity: 0.85 },
        { name: 'Aggressive', reduction: 0.5, similarity: 0.75 }
      ];
      
      for (const strategy of strategies) {
        try {
          const result = await optimizer.optimizePrompt(
            testCase.prompt,
            strategy.reduction,
            strategy.similarity
          );
          
          console.log(`\n   ${strategy.name} Strategy:`);
          console.log(`   Original: ${result.originalTokens} tokens`);
          console.log(`   Optimized: ${result.optimizedTokens} tokens`);
          console.log(`   Reduction: ${result.tokenReductionPercentage.toFixed(1)}%`);
          console.log(`   Similarity: ${(result.similarityScore * 100).toFixed(1)}%`);
          console.log(`   Optimized text: "${result.optimizedPrompt}"`);
          
        } catch (error) {
          console.log(`   ${strategy.name} Strategy: Failed - ${error}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error analyzing/optimizing: ${error}`);
    }
  }

  // Test batch optimization
  console.log('\n\n📦 Testing Batch Optimization');
  console.log('='.repeat(50));
  
  const batchPrompts = [
    'Analyze the current state of renewable energy technologies.',
    'Provide insights into the future of autonomous vehicles.',
    'Discuss the impact of social media on modern communication.',
    'Examine the role of blockchain in financial services.'
  ];
  
  console.log('\nBatch optimization results:');
  for (let i = 0; i < batchPrompts.length; i++) {
    try {
      const result = await optimizer.optimizePrompt(batchPrompts[i], 0.3, 0.85);
      console.log(`\n   Prompt ${i + 1}:`);
      console.log(`   Original: ${result.originalTokens} tokens`);
      console.log(`   Optimized: ${result.optimizedTokens} tokens`);
      console.log(`   Reduction: ${result.tokenReductionPercentage.toFixed(1)}%`);
      console.log(`   Similarity: ${(result.similarityScore * 100).toFixed(1)}%`);
    } catch (error) {
      console.log(`   Prompt ${i + 1}: Failed - ${error}`);
    }
  }

  console.log('\n✅ Prompt optimization testing complete!');
}

// Run the test
testPromptOptimization().catch(console.error); 