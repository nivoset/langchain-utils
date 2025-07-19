#!/usr/bin/env node

import { Command } from 'commander';
import { RSSLoader, RSSFeedConfig } from '@libsql-tools/rss-loader';
import { RSSService } from '@libsql-tools/rss-loader';
import { client, initDatabase } from '@libsql-tools/core';

const program = new Command();

program
  .name('rss-loader')
  .description('LibSQL RSS Document Loader CLI')
  .version('1.0.0');

// Load single RSS feed
program
  .command('load')
  .description('Load a single RSS feed')
  .requiredOption('-u, --url <url>', 'RSS feed URL')
  .requiredOption('-n, --name <name>', 'Feed name')
  .option('-c, --category <category>', 'Feed category', 'Tech')
  .option('-m, --max-items <number>', 'Maximum items to load', '50')
  .option('-t, --timeout <number>', 'Request timeout in ms', '10000')
  .option('--save', 'Save articles to database', false)
  .option('--no-save', 'Do not save articles to database')
  .option('--stop-at-duplicate', 'Stop processing at first duplicate (default: true)', true)
  .option('--no-stop-at-duplicate', 'Continue processing even after finding duplicates')
  .action(async (options) => {
    try {
      await initDatabase();
      
      const config: RSSFeedConfig = {
        name: options.name,
        url: options.url,
        category: options.category,
        maxItems: parseInt(options.maxItems),
        timeout: parseInt(options.timeout),
        stopAtDuplicate: options.stopAtDuplicate
      };

      console.log(`🚀 Loading RSS feed: ${config.name}`);
      console.log(`📡 URL: ${config.url}`);
      console.log(`📊 Max items: ${config.maxItems}`);
      console.log(`💾 Save to DB: ${options.save}`);

      const loader = new RSSLoader(config, options.save);
      const documents = await loader.load();

      console.log(`\n✅ Successfully loaded ${documents.length} documents`);
      
      if (documents.length > 0) {
        console.log('\n📄 Sample document:');
        const sample = documents[0];
        console.log(`Title: ${sample.metadata.title}`);
        console.log(`Source: ${sample.metadata.source}`);
        console.log(`URL: ${sample.metadata.url}`);
        console.log(`Content preview: ${sample.pageContent.substring(0, 200)}...`);
      }

    } catch (error) {
      console.error('❌ Error loading RSS feed:', error);
      process.exit(1);
    }
  });

// Load multiple RSS feeds
program
  .command('load-multiple')
  .description('Load multiple RSS feeds from configuration')
  .option('-c, --category <category>', 'Load feeds by category')
  .option('--save', 'Save articles to database', false)
  .option('--no-save', 'Do not save articles to database')
  .action(async (options) => {
    try {
      await initDatabase();
      
      console.log(`🚀 Loading RSS feeds${options.category ? ` for category: ${options.category}` : ''}`);
      console.log(`💾 Save to DB: ${options.save}`);

      const documents = await RSSLoader.loadFromDatabase(options.category, options.save);

      console.log(`\n✅ Successfully loaded ${documents.length} documents from all feeds`);
      
      // Group by source
      const bySource = documents.reduce((acc, doc) => {
        const source = doc.metadata.source as string;
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n📊 Documents by source:');
      Object.entries(bySource).forEach(([source, count]) => {
        console.log(`  ${source}: ${count} documents`);
      });

    } catch (error) {
      console.error('❌ Error loading RSS feeds:', error);
      process.exit(1);
    }
  });

// Load specific feeds by name
program
  .command('load-feeds')
  .description('Load specific RSS feeds by name')
  .argument('<names...>', 'Feed names to load')
  .option('--save', 'Save articles to database', false)
  .option('--no-save', 'Do not save articles to database')
  .action(async (names, options) => {
    try {
      await initDatabase();
      
      console.log(`🚀 Loading specific feeds: ${names.join(', ')}`);
      console.log(`💾 Save to DB: ${options.save}`);

      // Get feed configurations from database
      const placeholders = names.map(() => '?').join(',');
      const result = await client.execute({
        sql: `SELECT name, url, category FROM rss_feeds WHERE name IN (${placeholders}) AND is_active = 1`,
        args: names
      });

      if (result.rows.length === 0) {
        console.log('❌ No active feeds found with the specified names');
        return;
      }

      const configs: RSSFeedConfig[] = result.rows.map((row: any) => ({
        name: row.name as string,
        url: row.url as string,
        category: row.category as string
      }));

      console.log(`📡 Found ${configs.length} feeds to load`);

      const documents = await RSSLoader.loadMultiple(configs, options.save);

      console.log(`\n✅ Successfully loaded ${documents.length} documents`);
      
      // Group by source
      const bySource = documents.reduce((acc, doc) => {
        const source = doc.metadata.source as string;
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n📊 Documents by source:');
      Object.entries(bySource).forEach(([source, count]) => {
        console.log(`  ${source}: ${count} documents`);
      });

    } catch (error) {
      console.error('❌ Error loading RSS feeds:', error);
      process.exit(1);
    }
  });

// List available feeds
program
  .command('list')
  .description('List all available RSS feeds')
  .option('-c, --category <category>', 'Filter by category')
  .option('--active-only', 'Show only active feeds', true)
  .action(async (options) => {
    try {
      await initDatabase();
      
      let sql = 'SELECT name, url, category, is_active, last_fetched FROM rss_feeds';
      const args: any[] = [];
      const conditions: string[] = [];

      if (options.category) {
        conditions.push('category = ?');
        args.push(options.category);
      }

      if (options.activeOnly) {
        conditions.push('is_active = 1');
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY category, name';

      const result = await client.execute({ sql, args });

      if (result.rows.length === 0) {
        console.log('❌ No feeds found');
        return;
      }

      console.log(`📡 Found ${result.rows.length} RSS feeds:\n`);

      let currentCategory = '';
      result.rows.forEach((row: any, index: number) => {
        const category = row.category as string;
        const name = row.name as string;
        const url = row.url as string;
        const isActive = row.is_active === 1;
        const lastFetched = row.last_fetched ? new Date(row.last_fetched as string) : null;

        if (category !== currentCategory) {
          console.log(`\n📂 ${category}:`);
          currentCategory = category;
        }

        const status = isActive ? '✅' : '❌';
        const lastFetchedStr = lastFetched ? ` (Last: ${lastFetched.toLocaleDateString()})` : ' (Never fetched)';
        
        console.log(`  ${status} ${name}`);
        console.log(`     URL: ${url}`);
        console.log(`     ${lastFetchedStr}`);
      });

    } catch (error) {
      console.error('❌ Error listing RSS feeds:', error);
      process.exit(1);
    }
  });

// Test RSS feed
program
  .command('test')
  .description('Test RSS feed connectivity and parsing')
  .requiredOption('-u, --url <url>', 'RSS feed URL to test')
  .action(async (options) => {
    try {
      console.log(`🧪 Testing RSS feed: ${options.url}`);
      
      const config: RSSFeedConfig = {
        name: 'Test Feed',
        url: options.url,
        maxItems: 5
      };

      const loader = new RSSLoader(config, false);
      const documents = await loader.load();

      console.log(`\n✅ Test successful!`);
      console.log(`📊 Found ${documents.length} articles`);
      
      if (documents.length > 0) {
        console.log('\n📄 Sample articles:');
        documents.slice(0, 3).forEach((doc, index) => {
          console.log(`\n${index + 1}. ${doc.metadata.title}`);
          console.log(`   URL: ${doc.metadata.url}`);
          console.log(`   Published: ${doc.metadata.publishedAt}`);
          console.log(`   Content preview: ${doc.pageContent.substring(0, 150)}...`);
        });
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  });

program.parse(); 