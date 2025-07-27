#!/usr/bin/env node

import { Command } from 'commander';
import { PromptOptimizerService, OptimizationResult } from '../services/prompt-optimizer.service.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

interface BatchResult extends OptimizationResult {
  index: number;
}

interface BatchErrorResult {
  index: number;
  originalPrompt: string;
  error: string;
}

type BatchResultType = BatchResult | BatchErrorResult;

interface CompareResult extends OptimizationResult {
  strategy: string;
}

interface CompareErrorResult {
  strategy: string;
  error: string;
}

type CompareResultType = CompareResult | CompareErrorResult;

dotenv.config();

const program = new Command();

program
  .name('prompt-optimizer')
  .description('Optimize prompts by reducing token count while maintaining semantic similarity')
  .version('1.0.0');

// Optimize a prompt
program
  .command('optimize')
  .description('Optimize a prompt to reduce token count while maintaining semantic similarity')
  .argument('<prompt>', 'The prompt to optimize')
  .option('-r, --reduction <percentage>', 'Target token reduction percentage (0-90)', '30')
  .option('-s, --similarity <score>', 'Minimum similarity threshold (0.0-1.0)', '0.85')
  .option('-i, --iterations <number>', 'Maximum optimization iterations', '10')
  .option('-o, --output <file>', 'Output file for results (JSON format)')
  .option('-v, --verbose', 'Show detailed optimization steps')
  .action(async (prompt: string, options: any) => {
    try {
      console.log('🔧 Initializing Prompt Optimizer...\n');
      
      const optimizer = new PromptOptimizerService();
      
      console.log('📝 Original Prompt:');
      console.log(`"${prompt}"\n`);
      
      const startTime = Date.now();
      
      const result = await optimizer.optimizePrompt(
        prompt,
        parseFloat(options.reduction) / 100,
        parseFloat(options.similarity),
        parseInt(options.iterations)
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log('✅ Optimization Complete!\n');
      
      console.log('📊 Results:');
      console.log(`   Original tokens: ${result.originalTokens}`);
      console.log(`   Optimized tokens: ${result.optimizedTokens}`);
      console.log(`   Token reduction: ${result.tokenReduction} (${result.tokenReductionPercentage.toFixed(1)}%)`);
      console.log(`   Similarity score: ${(result.similarityScore * 100).toFixed(1)}%`);
      console.log(`   Processing time: ${processingTime}ms\n`);
      
      console.log('🎯 Optimized Prompt:');
      console.log(`"${result.optimizedPrompt}"\n`);
      
      if (options.verbose) {
        console.log('📈 Optimization Steps:');
        result.optimizationSteps.forEach((step, index) => {
          console.log(`\n   Step ${step.step}: ${step.description}`);
          console.log(`   Tokens: ${step.tokens} (${((step.tokens / result.originalTokens) * 100).toFixed(1)}%)`);
          console.log(`   Similarity: ${(step.similarity * 100).toFixed(1)}%`);
          if (index < result.optimizationSteps.length - 1) {
            console.log(`   Prompt: "${step.prompt.substring(0, 100)}${step.prompt.length > 100 ? '...' : ''}"`);
          }
        });
        console.log();
      }
      
      // Save to file if requested
      if (options.output) {
        const outputData = {
          ...result,
          processingTime,
          options: {
            targetReduction: options.reduction,
            minSimilarity: options.similarity,
            maxIterations: options.iterations
          }
        };
        
        await fs.writeFile(options.output, JSON.stringify(outputData, null, 2));
        console.log(`💾 Results saved to: ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Analyze a prompt
program
  .command('analyze')
  .description('Analyze a prompt for complexity and optimization potential')
  .argument('<prompt>', 'The prompt to analyze')
  .option('-o, --output <file>', 'Output file for analysis (JSON format)')
  .action(async (prompt: string, options: any) => {
    try {
      console.log('🔍 Analyzing Prompt...\n');
      
      const optimizer = new PromptOptimizerService();
      
      console.log('📝 Prompt:');
      console.log(`"${prompt}"\n`);
      
      const analysis = await optimizer.analyzePrompt(prompt);
      
      console.log('📊 Analysis Results:');
      console.log(`   Word count: ${analysis.wordCount}`);
      console.log(`   Estimated tokens: ${analysis.estimatedTokens}`);
      console.log(`   Readability score: ${analysis.readabilityScore}/100`);
      console.log(`   Sentence count: ${analysis.complexityMetrics.sentenceCount}`);
      console.log(`   Average sentence length: ${analysis.complexityMetrics.avgSentenceLength} words`);
      console.log(`   Average word length: ${analysis.complexityMetrics.avgWordLength} characters`);
      console.log(`   Unique words: ${analysis.complexityMetrics.uniqueWords}`);
      console.log(`   Vocabulary diversity: ${(analysis.complexityMetrics.vocabularyDiversity * 100).toFixed(1)}%\n`);
      
      // Provide optimization suggestions
      console.log('💡 Optimization Suggestions:');
      
      if (analysis.complexityMetrics.avgSentenceLength > 20) {
        console.log('   • Consider breaking down long sentences');
      }
      
      if (analysis.complexityMetrics.avgWordLength > 8) {
        console.log('   • Consider using shorter synonyms');
      }
      
      if (analysis.readabilityScore < 60) {
        console.log('   • Consider simplifying language for better readability');
      }
      
      if (analysis.estimatedTokens > 1000) {
        console.log('   • High token count - consider removing unnecessary words');
      }
      
      if (analysis.complexityMetrics.vocabularyDiversity < 0.3) {
        console.log('   • Low vocabulary diversity - consider varying word choice');
      }
      
      console.log();
      
      // Save to file if requested
      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(analysis, null, 2));
        console.log(`💾 Analysis saved to: ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Batch optimize prompts from a file
program
  .command('batch')
  .description('Optimize multiple prompts from a file')
  .argument('<file>', 'File containing prompts (one per line or JSON array)')
  .option('-r, --reduction <percentage>', 'Target token reduction percentage (0-90)', '30')
  .option('-s, --similarity <score>', 'Minimum similarity threshold (0.0-1.0)', '0.85')
  .option('-o, --output <file>', 'Output file for results (JSON format)')
  .option('-f, --format <type>', 'Input format: "lines" or "json"', 'lines')
  .action(async (file: string, options: any) => {
    try {
      console.log('📁 Loading prompts from file...\n');
      
      const fileContent = await fs.readFile(file, 'utf-8');
      let prompts: string[] = [];
      
      if (options.format === 'json') {
        prompts = JSON.parse(fileContent);
      } else {
        prompts = fileContent.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }
      
      console.log(`📝 Found ${prompts.length} prompts to optimize\n`);
      
      const optimizer = new PromptOptimizerService();
      const results: BatchResultType[] = [];
      
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        console.log(`🔧 Optimizing prompt ${i + 1}/${prompts.length}...`);
        
        try {
          const result = await optimizer.optimizePrompt(
            prompt,
            parseFloat(options.reduction) / 100,
            parseFloat(options.similarity)
          );
          
          const batchResult: BatchResult = {
            index: i + 1,
            ...result
          };
          
          results.push(batchResult);
          
          console.log(`   ✅ Reduced tokens by ${result.tokenReductionPercentage.toFixed(1)}% (similarity: ${(result.similarityScore * 100).toFixed(1)}%)`);
          
        } catch (error) {
          console.log(`   ❌ Failed to optimize prompt ${i + 1}: ${error}`);
          const errorResult: BatchErrorResult = {
            index: i + 1,
            originalPrompt: prompt,
            error: error instanceof Error ? error.message : String(error)
          };
          results.push(errorResult);
        }
      }
      
      console.log('\n📊 Batch Optimization Summary:');
      const successfulResults = results.filter((r): r is BatchResult => !('error' in r));
      const failedResults = results.filter((r): r is BatchErrorResult => 'error' in r);
      
      if (successfulResults.length > 0) {
        const avgReduction = successfulResults.reduce((sum, r) => sum + r.tokenReductionPercentage, 0) / successfulResults.length;
        const avgSimilarity = successfulResults.reduce((sum, r) => sum + r.similarityScore, 0) / successfulResults.length;
        
        console.log(`   Successful optimizations: ${successfulResults.length}`);
        console.log(`   Average token reduction: ${avgReduction.toFixed(1)}%`);
        console.log(`   Average similarity: ${(avgSimilarity * 100).toFixed(1)}%`);
      }
      
      if (failedResults.length > 0) {
        console.log(`   Failed optimizations: ${failedResults.length}`);
      }
      
      // Save results
      const outputFile = options.output || `batch-optimization-${Date.now()}.json`;
      await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
      console.log(`\n💾 Results saved to: ${outputFile}`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Generate drift prompts
program
  .command('drift')
  .description('Generate semantically similar but lexically different prompt variations for drift testing')
  .argument('<prompt>', 'The prompt to generate variations for')
  .option('-n, --number <count>', 'Number of variations to generate', '5')
  .option('-min, --min-similarity <score>', 'Minimum similarity threshold (0.0-1.0)', '0.7')
  .option('-max, --max-similarity <score>', 'Maximum similarity threshold (0.0-1.0)', '0.95')
  .option('-o, --output <file>', 'Output file for drift prompts (JSON format)')
  .option('-v, --verbose', 'Show detailed variation information')
  .action(async (prompt: string, options: any) => {
    try {
      console.log('🔄 Generating Drift Prompts...\n');
      
      const optimizer = new PromptOptimizerService();
      
      console.log('📝 Original Prompt:');
      console.log(`"${prompt}"\n`);
      
      const startTime = Date.now();
      
      const driftPrompts = await optimizer.generateDriftPrompts(
        prompt,
        parseInt(options.number),
        parseFloat(options.minSimilarity),
        parseFloat(options.maxSimilarity)
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Generated ${driftPrompts.length} drift prompts!\n`);
      
      console.log('📊 Drift Prompt Variations:');
      driftPrompts.forEach((drift, index) => {
        console.log(`\n   Variation ${index + 1} (${drift.variationType}):`);
        console.log(`   Similarity: ${(drift.similarity * 100).toFixed(1)}%`);
        console.log(`   Description: ${drift.description}`);
        console.log(`   Text: "${drift.variation}"`);
        
        if (options.verbose) {
          console.log(`   Original tokens: ${Math.ceil(prompt.length / 4)}`);
          console.log(`   Variation tokens: ${Math.ceil(drift.variation.length / 4)}`);
          console.log(`   Token difference: ${Math.ceil(drift.variation.length / 4) - Math.ceil(prompt.length / 4)}`);
        }
      });
      
      console.log(`\n📈 Summary:`);
      console.log(`   Total variations: ${driftPrompts.length}`);
      console.log(`   Average similarity: ${(driftPrompts.reduce((sum, dp) => sum + dp.similarity, 0) / driftPrompts.length * 100).toFixed(1)}%`);
      console.log(`   Processing time: ${processingTime}ms`);
      
      // Save to file if requested
      if (options.output) {
        const outputData = {
          originalPrompt: prompt,
          driftPrompts,
          processingTime,
          options: {
            numVariations: options.number,
            minSimilarity: options.minSimilarity,
            maxSimilarity: options.maxSimilarity
          }
        };
        
        await fs.writeFile(options.output, JSON.stringify(outputData, null, 2));
        console.log(`\n💾 Drift prompts saved to: ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Generate minified drift prompts
program
  .command('minify-drift')
  .description('Generate shorter, more concise prompt variations while maintaining semantic similarity')
  .argument('<prompt>', 'The prompt to generate minified variations for')
  .option('-n, --number <count>', 'Number of variations to generate', '5')
  .option('-s, --similarity <score>', 'Minimum similarity threshold (0.0-1.0)', '0.8')
  .option('-r, --reduction <percentage>', 'Target token reduction percentage (0-70)', '30')
  .option('-o, --output <file>', 'Output file for minified drift prompts (JSON format)')
  .option('-v, --verbose', 'Show detailed variation information')
  .action(async (prompt: string, options: any) => {
    try {
      console.log('📝 Generating Minified Drift Prompts...\n');
      
      const optimizer = new PromptOptimizerService();
      
      console.log('📝 Original Prompt:');
      console.log(`"${prompt}"\n`);
      
      const startTime = Date.now();
      
      const driftPrompts = await optimizer.generateMinifiedDriftPrompts(
        prompt,
        parseInt(options.number),
        parseFloat(options.similarity),
        parseFloat(options.reduction) / 100
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Generated ${driftPrompts.length} minified drift prompts!\n`);
      
      console.log('📊 Minified Drift Prompt Variations:');
      driftPrompts.forEach((drift, index) => {
        const originalTokens = Math.ceil(prompt.length / 4);
        const variationTokens = Math.ceil(drift.variation.length / 4);
        const tokenReduction = ((originalTokens - variationTokens) / originalTokens) * 100;
        
        console.log(`\n   Variation ${index + 1} (${drift.variationType}):`);
        console.log(`   Similarity: ${(drift.similarity * 100).toFixed(1)}%`);
        console.log(`   Token reduction: ${tokenReduction.toFixed(1)}%`);
        console.log(`   Description: ${drift.description}`);
        console.log(`   Text: "${drift.variation}"`);
        
        if (options.verbose) {
          console.log(`   Original tokens: ${originalTokens}`);
          console.log(`   Variation tokens: ${variationTokens}`);
          console.log(`   Tokens saved: ${originalTokens - variationTokens}`);
        }
      });
      
      console.log(`\n📈 Summary:`);
      console.log(`   Total variations: ${driftPrompts.length}`);
      console.log(`   Average similarity: ${(driftPrompts.reduce((sum, dp) => sum + dp.similarity, 0) / driftPrompts.length * 100).toFixed(1)}%`);
      
      if (driftPrompts.length > 0) {
        const avgTokenReduction = driftPrompts.reduce((sum, dp) => {
          const originalTokens = Math.ceil(prompt.length / 4);
          const variationTokens = Math.ceil(dp.variation.length / 4);
          return sum + ((originalTokens - variationTokens) / originalTokens);
        }, 0) / driftPrompts.length * 100;
        console.log(`   Average token reduction: ${avgTokenReduction.toFixed(1)}%`);
      }
      
      console.log(`   Processing time: ${processingTime}ms`);
      
      // Save to file if requested
      if (options.output) {
        const outputData = {
          originalPrompt: prompt,
          driftPrompts,
          processingTime,
          options: {
            numVariations: options.number,
            minSimilarity: options.similarity,
            targetReduction: options.reduction
          }
        };
        
        await fs.writeFile(options.output, JSON.stringify(outputData, null, 2));
        console.log(`\n💾 Minified drift prompts saved to: ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Compare optimization strategies
program
  .command('compare')
  .description('Compare different optimization strategies on the same prompt')
  .argument('<prompt>', 'The prompt to test')
  .option('-o, --output <file>', 'Output file for comparison (JSON format)')
  .action(async (prompt: string, options: any) => {
    try {
      console.log('⚖️  Comparing Optimization Strategies...\n');
      
      const optimizer = new PromptOptimizerService();
      
      console.log('📝 Test Prompt:');
      console.log(`"${prompt}"\n`);
      
      const strategies = [
        { name: 'Conservative (10% reduction)', reduction: 0.1, similarity: 0.95 },
        { name: 'Moderate (30% reduction)', reduction: 0.3, similarity: 0.85 },
        { name: 'Aggressive (50% reduction)', reduction: 0.5, similarity: 0.75 },
        { name: 'Very Aggressive (70% reduction)', reduction: 0.7, similarity: 0.65 }
      ];
      
      const results: CompareResultType[] = [];
      
      for (const strategy of strategies) {
        console.log(`🔧 Testing: ${strategy.name}`);
        
        try {
          const result = await optimizer.optimizePrompt(
            prompt,
            strategy.reduction,
            strategy.similarity
          );
          
          const compareResult: CompareResult = {
            strategy: strategy.name,
            ...result
          };
          
          results.push(compareResult);
          
          console.log(`   ✅ Tokens: ${result.optimizedTokens} (${result.tokenReductionPercentage.toFixed(1)}% reduction)`);
          console.log(`   ✅ Similarity: ${(result.similarityScore * 100).toFixed(1)}%`);
          
        } catch (error) {
          console.log(`   ❌ Failed: ${error}`);
          const errorResult: CompareErrorResult = {
            strategy: strategy.name,
            error: error instanceof Error ? error.message : String(error)
          };
          results.push(errorResult);
        }
      }
      
      console.log('\n📊 Strategy Comparison:');
      console.log('Strategy'.padEnd(30) + 'Tokens'.padEnd(10) + 'Reduction'.padEnd(12) + 'Similarity');
      console.log('-'.repeat(70));
      
      results.forEach(result => {
        if (!('error' in result)) {
          const strategy = result.strategy.padEnd(30);
          const tokens = result.optimizedTokens.toString().padEnd(10);
          const reduction = `${result.tokenReductionPercentage.toFixed(1)}%`.padEnd(12);
          const similarity = `${(result.similarityScore * 100).toFixed(1)}%`;
          console.log(strategy + tokens + reduction + similarity);
        }
      });
      
      // Save comparison
      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(results, null, 2));
        console.log(`\n💾 Comparison saved to: ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program.parse(); 