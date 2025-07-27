#!/usr/bin/env tsx

import { ScraperService } from './services/scraper.service.js';
import { PatternService } from './services/pattern.service.js';
import { initDatabase, client } from './database/init.js';
import { Command } from 'commander';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('tech-news-scraper')
  .description('Scrape and analyze tech news with embeddings and pattern detection')
  .version('1.0.0');

program
  .command('scrape')
  .description('Scrape all configured news sources')
  .option('-s, --source <name>', 'Scrape specific source only')
  .action(async (options) => {
    try {
      await initDatabase();
      const scraper = new ScraperService();
      
      await scraper.initialize();
      
      if (options.source) {
        const sources = await scraper.getActiveSources();
        const source = sources.find(s => s.name.toLowerCase() === options.source.toLowerCase());
        
        if (!source) {
          console.error(`Source "${options.source}" not found`);
          process.exit(1);
        }
        
        const articles = await scraper.scrapeSource(source);
        for (const article of articles) {
          await scraper.saveArticle(article);
        }
        console.log(`Scraped ${articles.length} articles from ${source.name}`);
      } else {
        await scraper.scrapeAllSources();
      }
      
      await scraper.close();
      console.log('Scraping completed successfully');
      
    } catch (error) {
      console.error('Error during scraping:', error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Run pattern analysis on scraped articles')
  .action(async () => {
    try {
      await initDatabase();
      const patternService = new PatternService();
      
      await patternService.detectPatterns();
      
      const topPatterns = await patternService.getTopPatterns(10);
      console.log('\nTop Patterns:');
      topPatterns.forEach((pattern, index) => {
        console.log(`${index + 1}. ${pattern.name} (Frequency: ${pattern.frequency}, Confidence: ${pattern.confidence.toFixed(2)})`);
        console.log(`   Description: ${pattern.description}`);
        console.log(`   Keywords: ${pattern.keywords.join(', ')}`);
        console.log(`   First seen: ${pattern.firstSeen.toLocaleDateString()}`);
        console.log(`   Last seen: ${pattern.lastSeen.toLocaleDateString()}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('Error during analysis:', error);
      process.exit(1);
    }
  });

program
  .command('schedule')
  .description('Schedule regular scraping and analysis')
  .option('-i, --interval <minutes>', 'Scraping interval in minutes', '60')

  .action(async (options) => {
    try {
      await initDatabase();
      const scraper = new ScraperService();
      const patternService = new PatternService();
      
      await scraper.initialize();
      
      const intervalMinutes = parseInt(options.interval);
      const cronExpression = `*/${intervalMinutes} * * * *`;
      
      console.log(`Scheduling scraping every ${intervalMinutes} minutes...`);
      console.log(`Cron expression: ${cronExpression}`);

      
      cron.schedule(cronExpression, async () => {
        console.log(`\n[${new Date().toISOString()}] Starting scheduled scraping...`);
        
        try {
          await scraper.scrapeAllSources();
          console.log('Scraping completed, running pattern analysis...');
          
          await patternService.detectPatterns();
          console.log('Pattern analysis completed');
          
        } catch (error) {
          console.error('Error in scheduled task:', error);
        }
      });
      
      console.log('Scheduler started. Press Ctrl+C to stop.');
      
      // Keep the process running
      process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        await scraper.close();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('Error starting scheduler:', error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show database statistics')
  .action(async () => {
    try {
      await initDatabase();
      
      const stats = await Promise.all([
        client.execute('SELECT COUNT(*) as count FROM articles'),
        client.execute('SELECT COUNT(*) as count FROM patterns'),
        client.execute('SELECT COUNT(*) as count FROM sources WHERE is_active = 1'),
        client.execute('SELECT COUNT(*) as count FROM articles'),
        client.execute('SELECT source, COUNT(*) as count FROM articles GROUP BY source ORDER BY count DESC LIMIT 5')
      ]);
      
      console.log('Database Statistics:');
      console.log(`Total Articles: ${stats[0].rows[0].count}`);
      console.log(`Total Patterns: ${stats[1].rows[0].count}`);
      console.log(`Active Sources: ${stats[2].rows[0].count}`);
      console.log(`Articles (Last 7 days): ${stats[3].rows[0].count}`);
      
      console.log('\nTop Sources:');
      stats[4].rows.forEach((row: any) => {
        console.log(`  ${row.source}: ${row.count} articles`);
      });
      
    } catch (error) {
      console.error('Error getting statistics:', error);
      process.exit(1);
    }
  });

program.parse(); 