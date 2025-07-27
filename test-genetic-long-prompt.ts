#!/usr/bin/env tsx

import { GeneticPromptOptimizer } from './src/services/genetic-prompt-optimizer.service.js';
import fs from 'fs/promises';

async function testGeneticLongPrompt() {
  try {
    console.log('🧬 Testing Genetic Algorithm with Very Long Prompt\n');
    
    // Read the long prompt from file
    const longPrompt = await fs.readFile('long-test-prompt.txt', 'utf-8');
    
    console.log(`📝 Original prompt length: ${longPrompt.length} characters`);
    console.log(`📊 Estimated tokens: ${Math.ceil(longPrompt.length / 4)}\n`);
    
    // Configure genetic algorithm for long prompt optimization
    const config = {
      populationSize: 20, // Smaller population for faster processing
      maxGenerations: 30, // Fewer generations for initial test
      mutationRate: 0.15, // Slightly higher mutation rate
      crossoverRate: 0.8,
      similarityWeight: 0.6, // More weight on similarity for long prompts
      tokenWeight: 0.4, // Less weight on token reduction
      minSimilarity: 0.8,
      maxTokenReduction: 0.4,
      eliteSize: 3
    };
    
    const optimizer = new GeneticPromptOptimizer(config);
    
    console.log('🧬 Starting genetic optimization with GPU-accelerated batch processing...\n');
    
    const startTime = Date.now();
    
    const result = await optimizer.optimizePrompt(
      longPrompt,
      0.4, // 40% target reduction
      0.8  // 80% minimum similarity
    );
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n✅ Genetic Optimization Complete!\n');
    
    console.log('📊 Final Results:');
    console.log(`   Original tokens: ${result.originalTokens}`);
    console.log(`   Optimized tokens: ${result.optimizedTokens}`);
    console.log(`   Tokens saved: ${result.originalTokens - result.optimizedTokens}`);
    console.log(`   Token reduction: ${result.tokenReduction.toFixed(1)}%`);
    console.log(`   Similarity score: ${(result.similarityScore * 100).toFixed(1)}%`);
    console.log(`   Generations evolved: ${result.generationCount}`);
    console.log(`   Total processing time: ${totalTime}ms`);
    console.log(`   Average time per generation: ${(totalTime / result.generationCount).toFixed(0)}ms`);
    
    console.log('\n📝 Optimized Prompt (first 500 chars):');
    console.log(`"${result.optimizedPrompt.substring(0, 500)}..."`);
    
    console.log('\n📈 Evolution Progress:');
    console.log('   Gen | Best Fitness | Avg Fitness | Tokens | Similarity');
    console.log('   ----|-------------|-------------|--------|-----------');
    
    result.evolutionHistory.forEach(history => {
      console.log(`   ${history.generation.toString().padStart(3)} | ` +
                 `${history.bestFitness.toFixed(3).padStart(11)} | ` +
                 `${history.avgFitness.toFixed(3).padStart(11)} | ` +
                 `${history.bestTokenCount.toString().padStart(6)} | ` +
                 `${(history.bestSimilarity * 100).toFixed(1)}%`);
    });
    
    // Calculate cost savings
    const costSavings = (result.tokenReduction / 100) * 100;
    console.log(`\n💰 Estimated cost savings: ${costSavings.toFixed(1)}% per use`);
    
    // Save results
    const outputData = {
      originalPrompt: longPrompt,
      optimizedPrompt: result.optimizedPrompt,
      geneticConfig: config,
      results: {
        originalTokens: result.originalTokens,
        optimizedTokens: result.optimizedTokens,
        tokenReduction: result.tokenReduction,
        similarity: result.similarityScore,
        generationCount: result.generationCount,
        processingTime: totalTime,
        costSavings
      },
      evolutionHistory: result.evolutionHistory,
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile('genetic-long-result.json', JSON.stringify(outputData, null, 2));
    console.log(`\n💾 Results saved to: genetic-long-result.json`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testGeneticLongPrompt(); 