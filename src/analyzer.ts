#!/usr/bin/env tsx

import { PatternService } from './services/pattern.service.js';
import { client, initDatabase } from './database/init.js';
import { Command } from 'commander';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('tech-news-analyzer')
  .description('Analyze tech news patterns and generate insights')
  .version('1.0.0');

program
  .command('patterns')
  .description('Show detected patterns')
  .option('-l, --limit <number>', 'Number of patterns to show', '10')
  .option('-d, --days <number>', 'Show patterns from last N days', '30')
  .action(async (options) => {
    try {
      await initDatabase();
      const patternService = new PatternService();
      
      const limit = parseInt(options.limit);
      const patterns = await patternService.getTopPatterns(limit);
      
      console.log(`\nTop ${patterns.length} Patterns (Last ${options.days} days):`);
      console.log('='.repeat(80));
      
      patterns.forEach((pattern, index) => {
        console.log(`${index + 1}. ${pattern.name}`);
        console.log(`   Frequency: ${pattern.frequency} articles`);
        console.log(`   Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
        console.log(`   Description: ${pattern.description}`);
        console.log(`   Keywords: ${pattern.keywords.join(', ')}`);
        console.log(`   First seen: ${pattern.firstSeen.toLocaleDateString()}`);
        console.log(`   Last seen: ${pattern.lastSeen.toLocaleDateString()}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('Error getting patterns:', error);
      process.exit(1);
    }
  });

program
  .command('trends')
  .description('Analyze trending topics')
  .option('-d, --days <number>', 'Analyze trends from last N days', '7')
  .action(async (options) => {
    try {
      await initDatabase();
      
      const days = parseInt(options.days);
      
      // Get trending keywords
      const keywordResult = await client.execute({
        sql: `SELECT 
          json_extract(tags, '$[*]') as tag,
          COUNT(*) as frequency
        FROM articles 
        WHERE published_at >= datetime('now', '-${days} days')
        AND tags IS NOT NULL
        GROUP BY tag
        ORDER BY frequency DESC
        LIMIT 10`,
        args: []
      });
      
      console.log(`\nTrending Keywords (Last ${days} days):`);
      console.log('='.repeat(50));
      
      keywordResult.rows.forEach((row: any, index: number) => {
        console.log(`${index + 1}. ${row.tag}: ${row.frequency} mentions`);
      });
      
      // Get trending categories
      const categoryResult = await client.execute({
        sql: `SELECT 
          category,
          COUNT(*) as frequency
        FROM articles 
        WHERE published_at >= datetime('now', '-${days} days')
        AND category IS NOT NULL
        GROUP BY category
        ORDER BY frequency DESC`,
        args: []
      });
      
      console.log(`\nTrending Categories (Last ${days} days):`);
      console.log('='.repeat(50));
      
      categoryResult.rows.forEach((row: any, index: number) => {
        console.log(`${index + 1}. ${row.category}: ${row.frequency} articles`);
      });
      
      // Get trending sources
      const sourceResult = await client.execute({
        sql: `SELECT 
          source,
          COUNT(*) as frequency
        FROM articles 
        WHERE published_at >= datetime('now', '-${days} days')
        GROUP BY source
        ORDER BY frequency DESC`,
        args: []
      });
      
      console.log(`\nMost Active Sources (Last ${days} days):`);
      console.log('='.repeat(50));
      
      sourceResult.rows.forEach((row: any, index: number) => {
        console.log(`${index + 1}. ${row.source}: ${row.frequency} articles`);
      });
      
    } catch (error) {
      console.error('Error analyzing trends:', error);
      process.exit(1);
    }
  });

program
  .command('search')
  .description('Search articles by keyword or topic')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Number of results to show', '10')
  .action(async (query, options) => {
    try {
      await initDatabase();
      
      const limit = parseInt(options.limit);
      
      // Search in titles and content
      const result = await client.execute({
        sql: `SELECT 
          id, title, source, published_at, category, summary
        FROM articles 
        WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
        ORDER BY published_at DESC
        LIMIT ?`,
        args: [`%${query}%`, `%${query}%`, `%${query}%`, limit]
      });
      
      console.log(`\nSearch Results for "${query}":`);
      console.log('='.repeat(80));
      
      if (result.rows.length === 0) {
        console.log('No articles found matching your query.');
        return;
      }
      
      result.rows.forEach((row: any, index: number) => {
        console.log(`${index + 1}. ${row.title}`);
        console.log(`   Source: ${row.source}`);
        console.log(`   Category: ${row.category || 'General'}`);
        console.log(`   Published: ${new Date(row.published_at).toLocaleDateString()}`);
        console.log(`   Summary: ${row.summary?.substring(0, 150)}...`);
        console.log('');
      });
      
    } catch (error) {
      console.error('Error searching articles:', error);
      process.exit(1);
    }
  });

program
  .command('similar')
  .description('Find similar articles')
  .argument('<articleId>', 'Article ID to find similar articles for')
  .option('-l, --limit <number>', 'Number of similar articles to show', '5')
  .action(async (articleId, options) => {
    try {
      await initDatabase();
      
      const limit = parseInt(options.limit);
      const articleIdNum = parseInt(articleId);
      
      // Get the target article
      const articleResult = await client.execute({
        sql: `SELECT id, title, content, source, published_at
        FROM articles 
        WHERE id = ?`,
        args: [articleIdNum]
      });
      
      if (articleResult.rows.length === 0) {
        console.error(`Article with ID ${articleId} not found`);
        process.exit(1);
      }
      
      const targetArticle = articleResult.rows[0];
      
      console.log(`\nFinding articles similar to: ${targetArticle.title}`);
      console.log('='.repeat(80));
      
      // Find articles with similar tags or category
      const similarResult = await client.execute({
        sql: `SELECT 
          id, title, source, published_at, category,
          CASE 
            WHEN category = ? THEN 3
            WHEN tags LIKE ? THEN 2
            ELSE 1
          END as similarity_score
        FROM articles 
        WHERE id != ? 
        AND (category = ? OR tags LIKE ?)
        ORDER BY similarity_score DESC, published_at DESC
        LIMIT ?`,
        args: [
          targetArticle.category,
          `%${targetArticle.category}%`,
          articleIdNum,
          targetArticle.category,
          `%${targetArticle.category}%`,
          limit
        ]
      });
      
      if (similarResult.rows.length === 0) {
        console.log('No similar articles found.');
        return;
      }
      
      similarResult.rows.forEach((row: any, index: number) => {
        console.log(`${index + 1}. ${row.title}`);
        console.log(`   Source: ${row.source}`);
        console.log(`   Category: ${row.category || 'General'}`);
        console.log(`   Published: ${new Date(row.published_at).toLocaleDateString()}`);
        console.log(`   Similarity Score: ${row.similarity_score}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('Error finding similar articles:', error);
      process.exit(1);
    }
  });

program
  .command('detect')
  .description('Run pattern detection on recent articles')
  .action(async () => {
    try {
      await initDatabase();
      const patternService = new PatternService();
      
      console.log('Running pattern detection...');
      await patternService.detectPatterns();
      
      console.log('Pattern detection completed!');
      console.log('Run "analyzer patterns" to see the detected patterns.');
      
    } catch (error) {
      console.error('Error during pattern detection:', error);
      process.exit(1);
    }
  });

program.parse(); 