#!/usr/bin/env node

import { Command } from 'commander';
import { PromptOptimizerService } from '../services/prompt-optimizer.service.js';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('prompt-baseline-optimizer')
  .description('Optimize large prompts for baseline use - create efficient versions for repeated use')
  .version('1.0.0');

// Optimize a single prompt for baseline use
program
  .command('optimize')
  .description('Optimize a large prompt for baseline use')
  .argument('<prompt>', 'The large prompt to optimize')
  .option('-o, --output <file>', 'Output file for optimized prompt (JSON format)')
  .option('-r, --reduction <percentage>', 'Target token reduction percentage (10-50)', '25')
  .option('-s, --similarity <score>', 'Minimum similarity threshold (0.8-0.95)', '0.9')
  .option('-i, --iterations <number>', 'Maximum optimization iterations', '15')
  .option('-v, --verbose', 'Show detailed optimization process')
  .action(async (prompt: string, options: any) => {
    try {
      console.log('🔧 Baseline Prompt Optimization\n');
      
      const optimizer = new PromptOptimizerService();
      
      console.log('📝 Original Prompt:');
      console.log(`"${prompt}"\n`);
      
      const originalTokens = Math.ceil(prompt.length / 4);
      console.log(`📊 Original Analysis:`);
      console.log(`   Length: ${prompt.length} characters`);
      console.log(`   Estimated tokens: ${originalTokens}`);
      console.log(`   Target reduction: ${options.reduction}%`);
      console.log(`   Min similarity: ${options.similarity}\n`);
      
      const startTime = Date.now();
      
      // Optimize the prompt
      console.log('🔄 Optimizing prompt...');
      const result = await optimizer.optimizePrompt(
        prompt,
        parseFloat(options.reduction) / 100,
        parseFloat(options.similarity),
        parseInt(options.iterations)
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log('\n✅ Optimization Complete!\n');
      
      console.log('📊 Optimization Results:');
      console.log(`   Original tokens: ${result.originalTokens}`);
      console.log(`   Optimized tokens: ${result.optimizedTokens}`);
      console.log(`   Tokens saved: ${result.originalTokens - result.optimizedTokens}`);
      console.log(`   Token reduction: ${result.tokenReductionPercentage.toFixed(1)}%`);
      console.log(`   Similarity score: ${(result.similarityScore * 100).toFixed(1)}%`);
      console.log(`   Processing time: ${processingTime}ms`);
      
      console.log('\n📝 Optimized Prompt:');
      console.log(`"${result.optimizedPrompt}"`);
      
      // Calculate cost savings
      const costSavings = (result.tokenReductionPercentage / 100) * 100;
      console.log(`\n💰 Estimated cost savings: ${costSavings.toFixed(1)}% per use`);
      
      // Save to file if requested
      if (options.output) {
        const outputData = {
          originalPrompt: prompt,
          optimizedPrompt: result.optimizedPrompt,
          metadata: {
            originalTokens: result.originalTokens,
            optimizedTokens: result.optimizedTokens,
            tokenReduction: result.tokenReductionPercentage,
            similarity: result.similarityScore,
            processingTime,
            costSavings,
            timestamp: new Date().toISOString()
          }
        };
        
        await fs.writeFile(options.output, JSON.stringify(outputData, null, 2));
        console.log(`\n💾 Optimized prompt saved to: ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Generate multiple optimized versions for comparison
program
  .command('compare')
  .description('Generate multiple optimized versions for comparison')
  .argument('<prompt>', 'The large prompt to optimize')
  .option('-o, --output <file>', 'Output file for comparison results (JSON format)')
  .option('-r, --reductions <percentages>', 'Comma-separated reduction targets (e.g., "15,25,35")', '15,25,35')
  .option('-s, --similarities <scores>', 'Comma-separated similarity thresholds (e.g., "0.85,0.9,0.95")', '0.85,0.9,0.95')
  .option('-v, --verbose', 'Show detailed comparison process')
  .action(async (prompt: string, options: any) => {
    try {
      console.log('🔧 Baseline Prompt Comparison\n');
      
      const optimizer = new PromptOptimizerService();
      
      console.log('📝 Original Prompt:');
      console.log(`"${prompt}"\n`);
      
      const originalTokens = Math.ceil(prompt.length / 4);
      const reductions = options.reductions.split(',').map((r: string) => parseFloat(r.trim()));
      const similarities = options.similarities.split(',').map((s: string) => parseFloat(s.trim()));
      
      console.log(`📊 Comparison Parameters:`);
      console.log(`   Original tokens: ${originalTokens}`);
      console.log(`   Reduction targets: ${reductions.join(', ')}%`);
      console.log(`   Similarity thresholds: ${similarities.join(', ')}\n`);
      
      const results: Array<{
        reduction: number;
        similarity: number;
        optimizedPrompt: string;
        originalTokens: number;
        optimizedTokens: number;
        tokenReduction: number;
        similarityScore: number;
        processingTime: number;
      }> = [];
      
      for (const reduction of reductions) {
        for (const similarity of similarities) {
          console.log(`🔄 Testing: ${reduction}% reduction, ${similarity} similarity...`);
          
          const startTime = Date.now();
          const result = await optimizer.optimizePrompt(
            prompt,
            reduction / 100,
            similarity,
            15
          );
          const processingTime = Date.now() - startTime;
          
          results.push({
            reduction,
            similarity,
            optimizedPrompt: result.optimizedPrompt,
            originalTokens: result.originalTokens,
            optimizedTokens: result.optimizedTokens,
            tokenReduction: result.tokenReductionPercentage,
            similarityScore: result.similarityScore,
            processingTime
          });
          
          console.log(`   ✅ ${result.tokenReductionPercentage.toFixed(1)}% reduction, ${(result.similarityScore * 100).toFixed(1)}% similarity`);
        }
      }
      
      console.log('\n📊 Comparison Results:\n');
      
      // Sort by token reduction (descending)
      results.sort((a, b) => b.tokenReduction - a.tokenReduction);
      
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.reduction}% reduction, ${result.similarity} similarity:`);
        console.log(`   Token reduction: ${result.tokenReduction.toFixed(1)}%`);
        console.log(`   Similarity: ${(result.similarityScore * 100).toFixed(1)}%`);
        console.log(`   Processing time: ${result.processingTime}ms`);
        console.log(`   Optimized: "${result.optimizedPrompt}"`);
        console.log();
      });
      
      // Find best balance
      const bestBalance = results.reduce((best, current) => {
        const currentScore = current.tokenReduction * current.similarityScore;
        const bestScore = best.tokenReduction * best.similarityScore;
        return currentScore > bestScore ? current : best;
      });
      
      console.log('🏆 Best Balance (reduction × similarity):');
      console.log(`   ${bestBalance.reduction}% reduction, ${bestBalance.similarity} similarity`);
      console.log(`   Token reduction: ${bestBalance.tokenReduction.toFixed(1)}%`);
      console.log(`   Similarity: ${(bestBalance.similarityScore * 100).toFixed(1)}%`);
      console.log(`   Score: ${(bestBalance.tokenReduction * bestBalance.similarityScore).toFixed(1)}`);
      console.log(`   Optimized: "${bestBalance.optimizedPrompt}"`);
      
      // Save to file if requested
      if (options.output) {
        const outputData = {
          originalPrompt: prompt,
          comparisonResults: results,
          bestBalance,
          metadata: {
            originalTokens,
            timestamp: new Date().toISOString()
          }
        };
        
        await fs.writeFile(options.output, JSON.stringify(outputData, null, 2));
        console.log(`\n💾 Comparison results saved to: ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Batch optimize multiple prompts
program
  .command('batch')
  .description('Batch optimize multiple prompts for baseline use')
  .argument('<input>', 'Input file containing prompts (JSON or TXT)')
  .option('-o, --output <directory>', 'Output directory for optimized prompts', './optimized-prompts')
  .option('-r, --reduction <percentage>', 'Target token reduction percentage (10-50)', '25')
  .option('-s, --similarity <score>', 'Minimum similarity threshold (0.8-0.95)', '0.9')
  .option('-f, --format <type>', 'Input format (json or txt)', 'json')
  .option('-v, --verbose', 'Show detailed batch process')
  .action(async (input: string, options: any) => {
    try {
      console.log('🔧 Batch Baseline Optimization\n');
      
      const optimizer = new PromptOptimizerService();
      
      // Read input file
      console.log(`📖 Reading prompts from: ${input}`);
      const inputContent = await fs.readFile(input, 'utf-8');
      
      let prompts: Array<{ name: string; prompt: string }> = [];
      
      if (options.format === 'json') {
        const data = JSON.parse(inputContent);
        prompts = Array.isArray(data) ? data : [data];
      } else {
        // TXT format - each line is a prompt
        const lines = inputContent.split('\n').filter(line => line.trim());
        prompts = lines.map((line, index) => ({
          name: `prompt_${index + 1}`,
          prompt: line.trim()
        }));
      }
      
      console.log(`📝 Found ${prompts.length} prompts to optimize\n`);
      
      // Create output directory
      await fs.mkdir(options.output, { recursive: true });
      
      const results: Array<{
        name: string;
        originalPrompt: string;
        optimizedPrompt: string;
        originalTokens: number;
        optimizedTokens: number;
        tokenReduction: number;
        similarity: number;
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
        console.log(`🔄 Optimizing ${i + 1}/${prompts.length}: ${name}`);
        
        try {
          const startTime = Date.now();
          const result = await optimizer.optimizePrompt(
            prompt,
            parseFloat(options.reduction) / 100,
            parseFloat(options.similarity),
            15
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
            tokenReduction: result.tokenReductionPercentage,
            similarity: result.similarityScore,
            processingTime,
            success: true
          });
          
          console.log(`   ✅ ${result.tokenReductionPercentage.toFixed(1)}% reduction, ${(result.similarityScore * 100).toFixed(1)}% similarity`);
          
          // Save individual optimized prompt
          const outputFile = path.join(options.output, `${name}.json`);
          const outputData = {
            name,
            originalPrompt: prompt,
            optimizedPrompt: result.optimizedPrompt,
            metadata: {
              originalTokens: result.originalTokens,
              optimizedTokens: result.optimizedTokens,
              tokenReduction: result.tokenReductionPercentage,
              similarity: result.similarityScore,
              processingTime,
              timestamp: new Date().toISOString()
            }
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
            processingTime: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      console.log('\n📊 Batch Optimization Summary:');
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
      const summaryFile = path.join(options.output, 'batch-summary.json');
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
          timestamp: new Date().toISOString()
        },
        results
      };
      
      await fs.writeFile(summaryFile, JSON.stringify(summaryData, null, 2));
      console.log(`\n💾 Batch summary saved to: ${summaryFile}`);
      console.log(`💾 Individual optimized prompts saved to: ${options.output}/`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Generate minified baseline versions
program
  .command('minify')
  .description('Generate minified baseline versions of large prompts')
  .argument('<prompt>', 'The large prompt to minify')
  .option('-o, --output <file>', 'Output file for minified prompts (JSON format)')
  .option('-n, --number <count>', 'Number of minified versions to generate', '5')
  .option('-r, --reduction <percentage>', 'Target token reduction percentage (20-60)', '40')
  .option('-s, --similarity <score>', 'Minimum similarity threshold (0.8-0.95)', '0.85')
  .option('-v, --verbose', 'Show detailed minification process')
  .action(async (prompt: string, options: any) => {
    try {
      console.log('🔧 Baseline Prompt Minification\n');
      
      const optimizer = new PromptOptimizerService();
      
      console.log('📝 Original Prompt:');
      console.log(`"${prompt}"\n`);
      
      const originalTokens = Math.ceil(prompt.length / 4);
      console.log(`📊 Original Analysis:`);
      console.log(`   Length: ${prompt.length} characters`);
      console.log(`   Estimated tokens: ${originalTokens}`);
      console.log(`   Target reduction: ${options.reduction}%`);
      console.log(`   Min similarity: ${options.similarity}\n`);
      
      const startTime = Date.now();
      
      // Generate minified versions
      console.log('🔄 Generating minified versions...');
      const minifiedDrifts = await optimizer.generateMinifiedDriftPrompts(
        prompt,
        parseInt(options.number),
        parseFloat(options.similarity),
        parseFloat(options.reduction) / 100
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`\n✅ Generated ${minifiedDrifts.length} minified versions!\n`);
      
      console.log('📊 Minified Versions:');
      minifiedDrifts.forEach((drift, index) => {
        const tokenReduction = ((originalTokens - Math.ceil(drift.variation.length / 4)) / originalTokens) * 100;
        console.log(`\n${index + 1}. ${drift.variationType}:`);
        console.log(`   Similarity: ${(drift.similarity * 100).toFixed(1)}%`);
        console.log(`   Token reduction: ${tokenReduction.toFixed(1)}%`);
        console.log(`   Description: ${drift.description}`);
        console.log(`   Text: "${drift.variation}"`);
      });
      
      // Calculate average metrics
      const avgSimilarity = minifiedDrifts.reduce((sum, d) => sum + d.similarity, 0) / minifiedDrifts.length;
      const avgTokenReduction = minifiedDrifts.reduce((sum, d) => {
        const variationTokens = Math.ceil(d.variation.length / 4);
        return sum + ((originalTokens - variationTokens) / originalTokens);
      }, 0) / minifiedDrifts.length * 100;
      
      console.log(`\n📈 Summary:`);
      console.log(`   Average similarity: ${(avgSimilarity * 100).toFixed(1)}%`);
      console.log(`   Average token reduction: ${avgTokenReduction.toFixed(1)}%`);
      console.log(`   Processing time: ${processingTime}ms`);
      console.log(`   Estimated cost savings: ${avgTokenReduction.toFixed(1)}% per use`);
      
      // Save to file if requested
      if (options.output) {
        const outputData = {
          originalPrompt: prompt,
          minifiedVersions: minifiedDrifts.map(drift => ({
            variation: drift.variation,
            similarity: drift.similarity,
            tokenReduction: ((originalTokens - Math.ceil(drift.variation.length / 4)) / originalTokens) * 100,
            strategy: drift.variationType,
            description: drift.description
          })),
          metadata: {
            originalTokens,
            avgSimilarity,
            avgTokenReduction,
            processingTime,
            timestamp: new Date().toISOString()
          }
        };
        
        await fs.writeFile(options.output, JSON.stringify(outputData, null, 2));
        console.log(`\n💾 Minified versions saved to: ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program.parse(); 