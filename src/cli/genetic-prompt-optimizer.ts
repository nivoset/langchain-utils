#!/usr/bin/env node

import { Command } from 'commander';
import { GeneticPromptOptimizer } from '../services/genetic-prompt-optimizer.service.js';
import fs from 'fs/promises';

const program = new Command();

program
  .name('genetic-prompt-optimizer')
  .description('Optimize prompts using genetic algorithms - evolve the smallest version while maintaining semantic similarity')
  .version('1.0.0');

// Optimize a single prompt using genetic algorithm
program
  .command('optimize')
  .description('Optimize a prompt using genetic algorithm')
  .argument('<prompt>', 'The prompt to optimize')
  .option('-r, --reduction <percentage>', 'Target token reduction percentage (10-70)', '30')
  .option('-s, --similarity <score>', 'Minimum similarity threshold (0.7-0.95)', '0.85')
  .option('-p, --population <size>', 'Population size (20-200)', '50')
  .option('-g, --generations <number>', 'Maximum generations (50-500)', '100')
  .option('-m, --mutation-rate <rate>', 'Mutation rate (0.05-0.3)', '0.1')
  .option('-c, --crossover-rate <rate>', 'Crossover rate (0.6-0.9)', '0.8')
  .option('-e, --elite-size <size>', 'Elite size (2-10)', '5')
  .option('-o, --output <file>', 'Output file for results (JSON format)')
  .option('-v, --verbose', 'Show detailed evolution progress')
  .action(async (prompt: string, options: any) => {
    try {
      console.log('🧬 Genetic Prompt Optimization\n');
      
      const config = {
        populationSize: parseInt(options.population),
        maxGenerations: parseInt(options.generations),
        mutationRate: parseFloat(options.mutationRate),
        crossoverRate: parseFloat(options.crossoverRate),
        eliteSize: parseInt(options.eliteSize),
        similarityWeight: 0.7,
        tokenWeight: 0.3,
        minSimilarity: parseFloat(options.similarity),
        maxTokenReduction: parseFloat(options.reduction) / 100
      };
      
      const optimizer = new GeneticPromptOptimizer(config);
      
      console.log('📝 Original Prompt:');
      console.log(`"${prompt}"\n`);
      
      const originalTokens = Math.ceil(prompt.length / 4);
      console.log(`📊 Genetic Algorithm Configuration:`);
      console.log(`   Original tokens: ${originalTokens}`);
      console.log(`   Target reduction: ${options.reduction}%`);
      console.log(`   Min similarity: ${(parseFloat(options.similarity) * 100).toFixed(1)}%`);
      console.log(`   Population size: ${config.populationSize}`);
      console.log(`   Max generations: ${config.maxGenerations}`);
      console.log(`   Mutation rate: ${config.mutationRate}`);
      console.log(`   Crossover rate: ${config.crossoverRate}`);
      console.log(`   Elite size: ${config.eliteSize}\n`);
      
      const startTime = Date.now();
      
      // Run genetic optimization
      const result = await optimizer.optimizePrompt(
        prompt,
        parseFloat(options.reduction) / 100,
        parseFloat(options.similarity)
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
      
      console.log('\n📝 Optimized Prompt:');
      console.log(`"${result.optimizedPrompt}"`);
      
      // Show evolution history
      if (options.verbose) {
        console.log('\n📈 Evolution History:');
        console.log('   Gen | Best Fitness | Avg Fitness | Tokens | Similarity');
        console.log('   ----|-------------|-------------|--------|-----------');
        
        result.evolutionHistory.forEach(history => {
          console.log(`   ${history.generation.toString().padStart(3)} | ` +
                     `${history.bestFitness.toFixed(3).padStart(11)} | ` +
                     `${history.avgFitness.toFixed(3).padStart(11)} | ` +
                     `${history.bestTokenCount.toString().padStart(6)} | ` +
                     `${(history.bestSimilarity * 100).toFixed(1)}%`);
        });
      }
      
      // Calculate cost savings
      const costSavings = (result.tokenReduction / 100) * 100;
      console.log(`\n💰 Estimated cost savings: ${costSavings.toFixed(1)}% per use`);
      
      // Save to file if requested
      if (options.output) {
        const outputData = {
          originalPrompt: prompt,
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
        
        await fs.writeFile(options.output, JSON.stringify(outputData, null, 2));
        console.log(`\n💾 Results saved to: ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Compare genetic algorithm with other methods
program
  .command('compare')
  .description('Compare genetic algorithm with rule-based optimization')
  .argument('<prompt>', 'The prompt to compare')
  .option('-r, --reduction <percentage>', 'Target token reduction percentage (10-70)', '30')
  .option('-s, --similarity <score>', 'Minimum similarity threshold (0.7-0.95)', '0.85')
  .option('-o, --output <file>', 'Output file for comparison results (JSON format)')
  .action(async (prompt: string, options: any) => {
    try {
      console.log('🧬 Genetic vs Rule-Based Comparison\n');
      
      // Import rule-based optimizer
      const { PromptOptimizerService } = await import('../services/prompt-optimizer.service.js');
      
      const ruleBasedOptimizer = new PromptOptimizerService();
      const geneticOptimizer = new GeneticPromptOptimizer({
        populationSize: 30,
        maxGenerations: 50,
        mutationRate: 0.1,
        crossoverRate: 0.8
      });
      
      console.log('📝 Original Prompt:');
      console.log(`"${prompt}"\n`);
      
      const originalTokens = Math.ceil(prompt.length / 4);
      console.log(`📊 Comparison Parameters:`);
      console.log(`   Original tokens: ${originalTokens}`);
      console.log(`   Target reduction: ${options.reduction}%`);
      console.log(`   Min similarity: ${(parseFloat(options.similarity) * 100).toFixed(1)}%\n`);
      
      // Run rule-based optimization
      console.log('🔄 Running rule-based optimization...');
      const ruleBasedStart = Date.now();
      const ruleBasedResult = await ruleBasedOptimizer.optimizePrompt(
        prompt,
        parseFloat(options.reduction) / 100,
        parseFloat(options.similarity),
        15
      );
      const ruleBasedTime = Date.now() - ruleBasedStart;
      
      console.log('✅ Rule-based optimization complete!');
      console.log(`   Processing time: ${ruleBasedTime}ms`);
      console.log(`   Token reduction: ${ruleBasedResult.tokenReductionPercentage.toFixed(1)}%`);
      console.log(`   Similarity: ${(ruleBasedResult.similarityScore * 100).toFixed(1)}%`);
      console.log(`   Optimized: "${ruleBasedResult.optimizedPrompt}"\n`);
      
      // Run genetic optimization
      console.log('🧬 Running genetic optimization...');
      const geneticStart = Date.now();
      const geneticResult = await geneticOptimizer.optimizePrompt(
        prompt,
        parseFloat(options.reduction) / 100,
        parseFloat(options.similarity)
      );
      const geneticTime = Date.now() - geneticStart;
      
      console.log('✅ Genetic optimization complete!');
      console.log(`   Processing time: ${geneticTime}ms`);
      console.log(`   Token reduction: ${geneticResult.tokenReduction.toFixed(1)}%`);
      console.log(`   Similarity: ${(geneticResult.similarityScore * 100).toFixed(1)}%`);
      console.log(`   Generations: ${geneticResult.generationCount}`);
      console.log(`   Optimized: "${geneticResult.optimizedPrompt}"\n`);
      
      // Comparison summary
      console.log('📊 Comparison Summary:');
      console.log('   Method          | Time (ms) | Reduction | Similarity | Tokens');
      console.log('   ----------------|-----------|-----------|------------|-------');
      console.log(`   Rule-based      | ${ruleBasedTime.toString().padStart(9)} | ${ruleBasedResult.tokenReductionPercentage.toFixed(1).padStart(8)}% | ${(ruleBasedResult.similarityScore * 100).toFixed(1).padStart(10)}% | ${ruleBasedResult.optimizedTokens}`);
      console.log(`   Genetic         | ${geneticTime.toString().padStart(9)} | ${geneticResult.tokenReduction.toFixed(1).padStart(8)}% | ${(geneticResult.similarityScore * 100).toFixed(1).padStart(10)}% | ${geneticResult.optimizedTokens}`);
      
      // Determine winner
      const ruleBasedScore = ruleBasedResult.tokenReductionPercentage * ruleBasedResult.similarityScore;
      const geneticScore = geneticResult.tokenReduction * geneticResult.similarityScore;
      
      console.log('\n🏆 Winner Analysis:');
      console.log(`   Rule-based score: ${ruleBasedScore.toFixed(3)} (reduction × similarity)`);
      console.log(`   Genetic score: ${geneticScore.toFixed(3)} (reduction × similarity)`);
      
      if (geneticScore > ruleBasedScore) {
        console.log('   🧬 Genetic algorithm performed better!');
      } else if (ruleBasedScore > geneticScore) {
        console.log('   📏 Rule-based optimization performed better!');
      } else {
        console.log('   🤝 Both methods performed equally well!');
      }
      
      console.log(`\n⏱️  Time comparison: Genetic algorithm took ${(geneticTime / ruleBasedTime).toFixed(1)}x longer`);
      
      // Save comparison results
      if (options.output) {
        const outputData = {
          originalPrompt: prompt,
          comparison: {
            ruleBased: {
              optimizedPrompt: ruleBasedResult.optimizedPrompt,
              tokenReduction: ruleBasedResult.tokenReductionPercentage,
              similarity: ruleBasedResult.similarityScore,
              processingTime: ruleBasedTime,
              tokens: ruleBasedResult.optimizedTokens
            },
            genetic: {
              optimizedPrompt: geneticResult.optimizedPrompt,
              tokenReduction: geneticResult.tokenReduction,
              similarity: geneticResult.similarityScore,
              processingTime: geneticTime,
              tokens: geneticResult.optimizedTokens,
              generations: geneticResult.generationCount
            },
            winner: geneticScore > ruleBasedScore ? 'genetic' : 'rule-based',
            scores: {
              ruleBased: ruleBasedScore,
              genetic: geneticScore
            }
          },
          timestamp: new Date().toISOString()
        };
        
        await fs.writeFile(options.output, JSON.stringify(outputData, null, 2));
        console.log(`\n💾 Comparison results saved to: ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Batch genetic optimization
program
  .command('batch')
  .description('Batch optimize multiple prompts using genetic algorithm')
  .argument('<input>', 'Input file containing prompts (JSON format)')
  .option('-r, --reduction <percentage>', 'Target token reduction percentage (10-70)', '30')
  .option('-s, --similarity <score>', 'Minimum similarity threshold (0.7-0.95)', '0.85')
  .option('-p, --population <size>', 'Population size (20-200)', '30')
  .option('-g, --generations <number>', 'Maximum generations (50-500)', '50')
  .option('-o, --output <directory>', 'Output directory for results', './genetic-optimized')
  .action(async (input: string, options: any) => {
    try {
      console.log('🧬 Batch Genetic Optimization\n');
      
      // Read input file
      console.log(`📖 Reading prompts from: ${input}`);
      const inputContent = await fs.readFile(input, 'utf-8');
      const prompts = JSON.parse(inputContent);
      
      console.log(`📝 Found ${prompts.length} prompts to optimize\n`);
      
      // Create output directory
      await fs.mkdir(options.output, { recursive: true });
      
      const config = {
        populationSize: parseInt(options.population),
        maxGenerations: parseInt(options.generations),
        mutationRate: 0.1,
        crossoverRate: 0.8,
        eliteSize: 3
      };
      
      const optimizer = new GeneticPromptOptimizer(config);
      
      const results: Array<{
        name: string;
        originalPrompt: string;
        optimizedPrompt: string;
        originalTokens: number;
        optimizedTokens: number;
        tokenReduction: number;
        similarity: number;
        generations: number;
        processingTime: number;
        success: boolean;
        error?: string;
      }> = [];
      
      let totalOriginalTokens = 0;
      let totalOptimizedTokens = 0;
      let totalProcessingTime = 0;
      let successCount = 0;
      
      for (let i = 0; i < prompts.length; i++) {
        const { name, prompt } = prompts[i];
        console.log(`🧬 Optimizing ${i + 1}/${prompts.length}: ${name}`);
        
        try {
          const startTime = Date.now();
          const result = await optimizer.optimizePrompt(
            prompt,
            parseFloat(options.reduction) / 100,
            parseFloat(options.similarity)
          );
          const processingTime = Date.now() - startTime;
          
          totalOriginalTokens += result.originalTokens;
          totalOptimizedTokens += result.optimizedTokens;
          totalProcessingTime += processingTime;
          successCount++;
          
          results.push({
            name,
            originalPrompt: prompt,
            optimizedPrompt: result.optimizedPrompt,
            originalTokens: result.originalTokens,
            optimizedTokens: result.optimizedTokens,
            tokenReduction: result.tokenReduction,
            similarity: result.similarityScore,
            generations: result.generationCount,
            processingTime,
            success: true
          });
          
          console.log(`   ✅ ${result.tokenReduction.toFixed(1)}% reduction, ${(result.similarityScore * 100).toFixed(1)}% similarity, ${result.generationCount} generations`);
          
          // Save individual result
          const outputFile = `${options.output}/${name}.json`;
          const outputData = {
            name,
            originalPrompt: prompt,
            optimizedPrompt: result.optimizedPrompt,
            geneticConfig: config,
            results: {
              originalTokens: result.originalTokens,
              optimizedTokens: result.optimizedTokens,
              tokenReduction: result.tokenReduction,
              similarity: result.similarityScore,
              generations: result.generationCount,
              processingTime
            },
            evolutionHistory: result.evolutionHistory,
            timestamp: new Date().toISOString()
          };
          
          await fs.writeFile(outputFile, JSON.stringify(outputData, null, 2));
          
        } catch (error) {
          console.log(`   ❌ Failed: ${error}`);
          results.push({
            name,
            originalPrompt: prompt,
            optimizedPrompt: '',
            originalTokens: 0,
            optimizedTokens: 0,
            tokenReduction: 0,
            similarity: 0,
            generations: 0,
            processingTime: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      console.log('\n📊 Batch Genetic Optimization Summary:');
      console.log(`   Total prompts: ${prompts.length}`);
      console.log(`   Successful: ${successCount}`);
      console.log(`   Failed: ${prompts.length - successCount}`);
      console.log(`   Total original tokens: ${totalOriginalTokens}`);
      console.log(`   Total optimized tokens: ${totalOptimizedTokens}`);
      console.log(`   Total tokens saved: ${totalOriginalTokens - totalOptimizedTokens}`);
      console.log(`   Average token reduction: ${((totalOriginalTokens - totalOptimizedTokens) / totalOriginalTokens * 100).toFixed(1)}%`);
      console.log(`   Total processing time: ${totalProcessingTime}ms`);
      console.log(`   Average processing time: ${(totalProcessingTime / prompts.length).toFixed(0)}ms per prompt`);
      
      // Save batch summary
      const summaryFile = `${options.output}/batch-summary.json`;
      const summaryData = {
        batchMetadata: {
          totalPrompts: prompts.length,
          successful: successCount,
          failed: prompts.length - successCount,
          totalOriginalTokens,
          totalOptimizedTokens,
          totalTokensSaved: totalOriginalTokens - totalOptimizedTokens,
          averageTokenReduction: ((totalOriginalTokens - totalOptimizedTokens) / totalOriginalTokens * 100),
          totalProcessingTime,
          averageProcessingTime: totalProcessingTime / prompts.length,
          geneticConfig: config,
          timestamp: new Date().toISOString()
        },
        results
      };
      
      await fs.writeFile(summaryFile, JSON.stringify(summaryData, null, 2));
      console.log(`\n💾 Batch summary saved to: ${summaryFile}`);
      console.log(`💾 Individual results saved to: ${options.output}/`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program.parse(); 