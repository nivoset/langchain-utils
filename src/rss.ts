#!/usr/bin/env tsx

import { RSSService } from './services/rss.service.js';
import { initDatabase, client } from './database/init.js';
import { Command } from 'commander';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('rss-fetcher')
  .description('Fetch and analyze tech news from RSS feeds')
  .version('1.0.0');

program
  .command('fetch')
  .description('Fetch all RSS feeds')
  .option('-f, --feed <name>', 'Fetch specific feed only')
  .option('-s, --save', 'Save articles to database')
  .option('-v, --vectorstore', 'Also add articles to vector store')
  .option('-d, --dedupe', 'Remove duplicates from vector store after fetch')
  .action(async (options) => {
    try {
      await initDatabase();
      const rssService = new RSSService();
      
      if (options.feed) {
        const feeds = await rssService.getActiveFeeds();
        const feed = feeds.find(f => f.name.toLowerCase().includes(options.feed.toLowerCase()));
        
        if (!feed) {
          console.error(`Feed "${options.feed}" not found`);
          process.exit(1);
        }
        
        console.log(`📡 Fetching RSS feed: ${feed.name}`);
        const articles = await rssService.fetchFeed(feed);
        
        console.log(`\n📊 Found ${articles.length} articles:`);
        articles.forEach((article, index) => {
          console.log(`\n${index + 1}. ${article.title}`);
          console.log(`   Source: ${article.source}`);
          console.log(`   Published: ${article.publishedAt?.toLocaleDateString() || 'Unknown'}`);
          console.log(`   URL: ${article.url}`);
          console.log(`   Summary: ${article.summary?.substring(0, 150)}...`);
          
          if (options.save) {
            rssService.saveArticle(article).catch(console.error);
          }
        });
      } else {
        console.log('📡 Fetching all RSS feeds...');
        const articles = await rssService.fetchAllFeeds();
        
        console.log(`\n📊 Total articles found: ${articles.length}`);
        
        if (options.save) {
          console.log('💾 Saving articles to database...');
          for (const article of articles) {
            try {
              await rssService.saveArticle(article);
            } catch (error) {
              console.warn(`Failed to save article: ${article.title}`);
            }
          }
          console.log('✅ Articles saved successfully');
        }

        // Handle vector store operations
        if (options.vectorstore || options.dedupe) {
          console.log('🔄 Processing vector store operations...');
          
          if (options.dedupe) {
            console.log('🧹 Removing duplicates from vector store...');
            await rssService.syncWithVectorStore();
          }
          
          // Get vector store statistics
          try {
            const stats = await rssService.getVectorStoreStats();
            console.log('\n📊 Vector Store Statistics:');
            console.log(`   Total documents: ${stats.totalDocuments}`);
            console.log(`   Recent documents (24h): ${stats.recentDocuments}`);
          } catch (error) {
            console.warn('⚠️ Could not get vector store stats:', error);
          }
        }
      }
      
    } catch (error) {
      console.error('Error fetching RSS feeds:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all RSS feeds')
  .action(async () => {
    try {
      await initDatabase();
      const rssService = new RSSService();
      
      const feeds = await rssService.listFeeds();
      
      console.log('📡 RSS Feeds:');
      feeds.forEach(feed => {
        const status = feed.isActive ? '✅' : '❌';
        const lastFetched = feed.lastFetched ? 
          `(Last: ${feed.lastFetched.toLocaleDateString()})` : 
          '(Never fetched)';
        console.log(`   ${status} ${feed.name} - ${feed.category}`);
        console.log(`      URL: ${feed.url}`);
        console.log(`      ${lastFetched}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('Error listing RSS feeds:', error);
      process.exit(1);
    }
  });

program
  .command('add')
  .description('Add a new RSS feed')
  .argument('<name>', 'Feed name')
  .argument('<url>', 'RSS feed URL')
  .option('-c, --category <category>', 'Feed category', 'Tech')
  .action(async (name, url, options) => {
    try {
      await initDatabase();
      const rssService = new RSSService();
      
      console.log(`📡 Adding RSS feed: ${name}`);
      const feedId = await rssService.addFeed(name, url, options.category);
      
      console.log(`✅ RSS feed added with ID: ${feedId}`);
      
    } catch (error) {
      console.error('Error adding RSS feed:', error);
      process.exit(1);
    }
  });

program
  .command('remove')
  .description('Remove an RSS feed')
  .argument('<id>', 'Feed ID')
  .action(async (id) => {
    try {
      await initDatabase();
      const rssService = new RSSService();
      
      console.log(`📡 Removing RSS feed ID: ${id}`);
      await rssService.removeFeed(parseInt(id));
      
      console.log('✅ RSS feed removed');
      
    } catch (error) {
      console.error('Error removing RSS feed:', error);
      process.exit(1);
    }
  });

program
  .command('schedule')
  .description('Schedule regular RSS fetching')
  .option('-i, --interval <minutes>', 'Fetch interval in minutes', '30')
  .action(async (options) => {
    try {
      await initDatabase();
      const rssService = new RSSService();
      
      const intervalMinutes = parseInt(options.interval);
      const cronExpression = `*/${intervalMinutes} * * * *`;
      
      console.log(`📡 Scheduling RSS fetching every ${intervalMinutes} minutes...`);
      console.log(`Cron expression: ${cronExpression}`);
      
      cron.schedule(cronExpression, async () => {
        console.log(`\n[${new Date().toISOString()}] Starting scheduled RSS fetch...`);
        
        try {
          const articles = await rssService.fetchAllFeeds();
          console.log(`Fetched ${articles.length} articles`);
          
          // Save all articles
          for (const article of articles) {
            try {
              await rssService.saveArticle(article);
            } catch (error) {
              // Article might already exist
            }
          }
          
          console.log('RSS fetching completed');
          
        } catch (error) {
          console.error('Error in scheduled RSS fetch:', error);
        }
      });
      
      console.log('Scheduler started. Press Ctrl+C to stop.');
      
      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\nShutting down RSS scheduler...');
        process.exit(0);
      });
      
    } catch (error) {
      console.error('Error starting RSS scheduler:', error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show RSS feed statistics')
  .action(async () => {
    try {
      await initDatabase();
      const rssService = new RSSService();
      
      const stats = await Promise.all([
        client.execute('SELECT COUNT(*) as count FROM rss_feeds WHERE is_active = 1'),
        client.execute('SELECT COUNT(*) as count FROM articles WHERE source LIKE "%RSS%"'),
        client.execute('SELECT source, COUNT(*) as count FROM articles WHERE source LIKE "%RSS%" GROUP BY source ORDER BY count DESC LIMIT 10')
      ]);
      
      console.log('📊 RSS Feed Statistics:');
      console.log(`Active RSS Feeds: ${stats[0].rows[0].count}`);
      console.log(`RSS Articles: ${stats[1].rows[0].count}`);
      
      console.log('\nTop RSS Sources:');
      stats[2].rows.forEach((row: any) => {
        console.log(`  ${row.source}: ${row.count} articles`);
      });

      // Get vector store statistics
      try {
        const vectorStats = await rssService.getVectorStoreStats();
        console.log('\n🔍 Vector Store:');
        console.log(`Total documents: ${vectorStats.totalDocuments}`);
        console.log(`Recent documents (24h): ${vectorStats.recentDocuments}`);
      } catch (error) {
        console.log('\n🔍 Vector Store: Not available');
      }
      
    } catch (error) {
      console.error('Error getting RSS statistics:', error);
      process.exit(1);
    }
  });

program
  .command('sync-vectorstore')
  .description('Sync RSS articles with vector store')
  .option('-d, --dedupe', 'Remove duplicates after sync')
  .action(async (options) => {
    try {
      await initDatabase();
      const rssService = new RSSService();
      
      console.log('🔄 Syncing RSS articles with vector store...');
      await rssService.syncWithVectorStore();
      
      if (options.dedupe) {
        console.log('🧹 Removing duplicates...');
        const vectorStoreService = await rssService.getVectorStoreService();
        await vectorStoreService.removeDuplicates();
      }
      
      // Get final statistics
      const stats = await rssService.getVectorStoreStats();
      console.log('\n📊 Final Vector Store Status:');
      console.log(`   Total documents: ${stats.totalDocuments}`);
      console.log(`   Recent documents (24h): ${stats.recentDocuments}`);
      
      console.log('\n✅ Sync completed successfully!');
      
    } catch (error) {
      console.error('❌ Error syncing with vector store:', error);
      process.exit(1);
    }
  });

program.parse(); 