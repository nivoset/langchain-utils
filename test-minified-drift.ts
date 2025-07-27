import { PromptOptimizerService } from './src/services/prompt-optimizer.service.js';

async function testMinifiedDriftGeneration() {
  console.log('🧪 Testing Minified Drift Generation System\n');

  const optimizer = new PromptOptimizerService();

  // Test prompts of different types
  const testPrompts = [
    {
      name: 'Verbose Analysis Request',
      prompt: 'I would like you to please provide me with a very comprehensive and extremely detailed analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models, if you would be so kind as to do so.'
    },
    {
      name: 'Complex Research Request',
      prompt: 'Conduct thorough research on the emerging trends in quantum computing technology, focusing on recent breakthroughs, potential applications, and the timeline for commercial adoption, while also considering the broader implications for cybersecurity and data protection methodologies.'
    },
    {
      name: 'Detailed Instruction',
      prompt: 'Please provide a comprehensive explanation of the fundamental principles of blockchain technology, describe its applications beyond cryptocurrency, and discuss the challenges and opportunities it presents for modern businesses in various industries.'
    },
    {
      name: 'Academic Style Request',
      prompt: 'I would appreciate if you could furnish a thorough examination of the multifaceted implications and ramifications of the recent developments in renewable energy technologies, particularly focusing on how these groundbreaking innovations might potentially revolutionize and fundamentally transform the entire landscape of energy production and distribution.'
    }
  ];

  for (const testCase of testPrompts) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log('='.repeat(60));
    
    try {
      console.log('\n🔍 Original Prompt:');
      console.log(`"${testCase.prompt}"\n`);
      
      const originalTokens = Math.ceil(testCase.prompt.length / 4);
      console.log(`Original tokens: ${originalTokens}\n`);
      
      // Generate minified drift prompts
      console.log('🔄 Generating Minified Drift Variations...');
      const driftPrompts = await optimizer.generateMinifiedDriftPrompts(
        testCase.prompt,
        4, // Generate 4 variations
        0.8, // Min similarity
        0.3  // Target 30% reduction
      );
      
      console.log(`\n✅ Generated ${driftPrompts.length} minified drift prompts!\n`);
      
      // Display results
      driftPrompts.forEach((drift, index) => {
        const variationTokens = Math.ceil(drift.variation.length / 4);
        const tokenReduction = ((originalTokens - variationTokens) / originalTokens) * 100;
        
        console.log(`   Variation ${index + 1} (${drift.variationType}):`);
        console.log(`   Similarity: ${(drift.similarity * 100).toFixed(1)}%`);
        console.log(`   Token reduction: ${tokenReduction.toFixed(1)}%`);
        console.log(`   Description: ${drift.description}`);
        console.log(`   Text: "${drift.variation}"`);
        console.log();
      });
      
      // Summary statistics
      if (driftPrompts.length > 0) {
        const avgSimilarity = driftPrompts.reduce((sum, dp) => sum + dp.similarity, 0) / driftPrompts.length;
        const avgTokenReduction = driftPrompts.reduce((sum, dp) => {
          const variationTokens = Math.ceil(dp.variation.length / 4);
          return sum + ((originalTokens - variationTokens) / originalTokens);
        }, 0) / driftPrompts.length * 100;
        
        console.log('📊 Summary:');
        console.log(`   Average similarity: ${(avgSimilarity * 100).toFixed(1)}%`);
        console.log(`   Average token reduction: ${avgTokenReduction.toFixed(1)}%`);
        console.log(`   Variation types: ${[...new Set(driftPrompts.map(dp => dp.variationType))].join(', ')}`);
      }
      
    } catch (error) {
      console.log(`❌ Error generating minified drift prompts: ${error}`);
    }
  }

  // Test different reduction targets
  console.log('\n\n🎯 Testing Different Reduction Targets');
  console.log('='.repeat(60));
  
  const testPrompt = 'Please provide a comprehensive analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models.';
  
  const reductionTargets = [
    { name: 'Conservative (20% reduction)', target: 0.2 },
    { name: 'Moderate (40% reduction)', target: 0.4 },
    { name: 'Aggressive (60% reduction)', target: 0.6 }
  ];
  
  for (const target of reductionTargets) {
    console.log(`\n🔧 Testing: ${target.name}`);
    
    try {
      const driftPrompts = await optimizer.generateMinifiedDriftPrompts(
        testPrompt,
        3,
        0.8,
        target.target
      );
      
      if (driftPrompts.length > 0) {
        const originalTokens = Math.ceil(testPrompt.length / 4);
        const avgTokenReduction = driftPrompts.reduce((sum, dp) => {
          const variationTokens = Math.ceil(dp.variation.length / 4);
          return sum + ((originalTokens - variationTokens) / originalTokens);
        }, 0) / driftPrompts.length * 100;
        
        console.log(`   Generated ${driftPrompts.length} variations`);
        console.log(`   Average token reduction: ${avgTokenReduction.toFixed(1)}%`);
        console.log(`   Average similarity: ${(driftPrompts.reduce((sum, dp) => sum + dp.similarity, 0) / driftPrompts.length * 100).toFixed(1)}%`);
        
        driftPrompts.forEach((drift, index) => {
          const variationTokens = Math.ceil(drift.variation.length / 4);
          const tokenReduction = ((originalTokens - variationTokens) / originalTokens) * 100;
          console.log(`   ${index + 1}. "${drift.variation}" (${tokenReduction.toFixed(1)}% reduction, ${(drift.similarity * 100).toFixed(1)}% similarity)`);
        });
      } else {
        console.log(`   No variations generated for ${target.name}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }

  // Test comparison with regular optimization
  console.log('\n\n⚖️  Comparing Minified Drift vs Regular Optimization');
  console.log('='.repeat(60));
  
  const comparisonPrompt = 'Please provide a comprehensive analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models.';
  
  console.log('\n🔍 Original Prompt:');
  console.log(`"${comparisonPrompt}"`);
  
  const originalTokens = Math.ceil(comparisonPrompt.length / 4);
  console.log(`Original tokens: ${originalTokens}\n`);
  
  try {
    // Regular optimization
    console.log('🔧 Regular Optimization:');
    const optimizedResult = await optimizer.optimizePrompt(comparisonPrompt, 0.3, 0.85);
    console.log(`   Optimized: "${optimizedResult.optimizedPrompt}"`);
    console.log(`   Token reduction: ${optimizedResult.tokenReductionPercentage.toFixed(1)}%`);
    console.log(`   Similarity: ${(optimizedResult.similarityScore * 100).toFixed(1)}%\n`);
    
    // Minified drift
    console.log('🔄 Minified Drift Generation:');
    const minifiedDrifts = await optimizer.generateMinifiedDriftPrompts(comparisonPrompt, 3, 0.85, 0.3);
    
    minifiedDrifts.forEach((drift, index) => {
      const variationTokens = Math.ceil(drift.variation.length / 4);
      const tokenReduction = ((originalTokens - variationTokens) / originalTokens) * 100;
      console.log(`   Variation ${index + 1}: "${drift.variation}"`);
      console.log(`   Token reduction: ${tokenReduction.toFixed(1)}%`);
      console.log(`   Similarity: ${(drift.similarity * 100).toFixed(1)}%`);
      console.log(`   Strategy: ${drift.variationType}\n`);
    });
    
    console.log('📊 Comparison Summary:');
    console.log(`   Regular optimization: ${optimizedResult.tokenReductionPercentage.toFixed(1)}% reduction, ${(optimizedResult.similarityScore * 100).toFixed(1)}% similarity`);
    
    if (minifiedDrifts.length > 0) {
      const avgTokenReduction = minifiedDrifts.reduce((sum, dp) => {
        const variationTokens = Math.ceil(dp.variation.length / 4);
        return sum + ((originalTokens - variationTokens) / originalTokens);
      }, 0) / minifiedDrifts.length * 100;
      const avgSimilarity = minifiedDrifts.reduce((sum, dp) => sum + dp.similarity, 0) / minifiedDrifts.length;
      
      console.log(`   Minified drift average: ${avgTokenReduction.toFixed(1)}% reduction, ${(avgSimilarity * 100).toFixed(1)}% similarity`);
      console.log(`   Minified drift provides ${minifiedDrifts.length} alternative approaches vs 1 optimized version`);
    }
    
  } catch (error) {
    console.log(`❌ Error in comparison: ${error}`);
  }

  console.log('\n✅ Minified drift generation testing complete!');
}

// Run the test
testMinifiedDriftGeneration().catch(console.error); 